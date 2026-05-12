import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  Screen,
  Text,
  Button,
  PosterImage,
  StarRating,
  ActivityLineChart,
  GenreDonut,
  SectionEyebrow,
  SettingsSheet,
  TasteCard,
  Wordmark,
  type SettingsSheetHandle,
} from '@/components';
import { useTheme } from '@/theme';
import {
  listEntries,
  type DiaryEntry,
} from '@/db/diary';
import {
  listAllCache,
  upsertMediaCache,
  type MediaCacheRow,
} from '@/db/media_cache';
import {
  getGenres,
  getMovieDetails,
  getTvDetails,
  type GenreRef,
} from '@/lib/tmdb';
import {
  decadeDistribution,
  filmHoursWatched,
  genreDistribution,
  monthlyActivity,
  ratingDistribution,
  summary,
  topDirectors,
  topRated,
  tvSeasonHoursWatched,
  type Bucket,
  type GenreBucket,
  type GenreMap,
  type StatsEntry,
  type StatsCacheRow,
} from '@/lib/stats';
import { tasteProfile } from '@/lib/taste';

const BAR_TRACK_HEIGHT = 8;
const BAR_TRACK_HEIGHT_LG = 10;
const TOP_GENRE_LIMIT = 8;
const TOP_DIRECTOR_LIMIT = 8;
const TOP_RATED_LIMIT = 5;
const ACTIVITY_MONTHS = 12;
const BACKFILL_CONCURRENCY = 6;

const BAR_ANIM_DURATION = 500;
const BAR_ANIM_STAGGER = 40;
const easeOutCubic = Easing.out(Easing.cubic);

export default function YouScreen() {
  const t = useTheme();
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const settingsRef = useRef<SettingsSheetHandle>(null);
  const openSettings = useCallback(() => settingsRef.current?.present(), []);

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [cache, setCache] = useState<MediaCacheRow[]>([]);
  const [genreMaps, setGenreMaps] = useState<{ movie: GenreMap; tv: GenreMap } | null>(null);
  const [backfillRemaining, setBackfillRemaining] = useState(0);

  // ----- initial load on focus -----
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [es, cs] = await Promise.all([listEntries(), listAllCache()]);
        if (cancelled) return;
        setEntries(es);
        setCache(cs);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // ----- one-time genre map load -----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, tv] = await Promise.all([getGenres('movie'), getGenres('tv')]);
        if (cancelled) return;
        setGenreMaps({
          movie: new Map(m.map((g: GenreRef) => [g.id, g.name])),
          tv: new Map(tv.map((g: GenreRef) => [g.id, g.name])),
        });
      } catch {
        // Silent — genre section just stays empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- lazy backfill of missing cache rows -----
  // We snapshot the current cache via a ref so the backfill effect doesn't re-run on every
  // appended row (which would cause us to re-enqueue everything from scratch).
  const cacheRef = useRef<MediaCacheRow[]>(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Pre-migration rows can have empty seasons / null popularity / no director ids —
    // re-enqueue so the dependent stats (TV hours, mainstream-cult, director taps) populate.
    const cacheByKey = new Map(
      cacheRef.current.map((c) => [`${c.mediaType}:${c.tmdbId}`, c]),
    );
    const todo: { tmdbId: number; mediaType: 'movie' | 'tv' }[] = [];
    const seen = new Set<string>();
    for (const e of entries) {
      const mt: 'movie' | 'tv' = e.mediaType === 'movie' ? 'movie' : 'tv';
      const key = `${mt}:${e.tmdbId}`;
      if (seen.has(key)) continue;
      const existing = cacheByKey.get(key);
      const needsSeasonsBackfill =
        existing && mt === 'tv' && existing.seasons.length === 0;
      const needsPopularityBackfill = existing && existing.popularity == null;
      const needsDirectorIdsBackfill =
        existing && existing.director != null && existing.directorIds.length === 0;
      if (
        existing &&
        !needsSeasonsBackfill &&
        !needsPopularityBackfill &&
        !needsDirectorIdsBackfill
      )
        continue;
      seen.add(key);
      todo.push({ tmdbId: e.tmdbId, mediaType: mt });
    }

    if (todo.length === 0) {
      setBackfillRemaining(0);
      return () => controller.abort();
    }

    setBackfillRemaining(todo.length);
    let idx = 0;
    const inFlight: Promise<void>[] = [];

    const mergeRow = (prev: MediaCacheRow[], row: MediaCacheRow): MediaCacheRow[] => {
      const idx = prev.findIndex(
        (c) => c.tmdbId === row.tmdbId && c.mediaType === row.mediaType,
      );
      if (idx === -1) return [...prev, row];
      const next = prev.slice();
      next[idx] = row;
      return next;
    };

    const fetchOne = async (item: { tmdbId: number; mediaType: 'movie' | 'tv' }) => {
      try {
        if (item.mediaType === 'movie') {
          const d = await getMovieDetails(item.tmdbId, controller.signal);
          if (controller.signal.aborted) return;
          const row = await upsertMediaCache({
            tmdbId: d.tmdbId,
            mediaType: 'movie',
            genreIds: d.genres.map((g) => g.id),
            runtime: d.runtime,
            director: d.director,
            directorIds: d.directorIds,
            seasons: [],
            popularity: d.popularity,
          });
          if (controller.signal.aborted) return;
          setCache((prev) => mergeRow(prev, row));
        } else {
          const d = await getTvDetails(item.tmdbId, controller.signal);
          if (controller.signal.aborted) return;
          const row = await upsertMediaCache({
            tmdbId: d.tmdbId,
            mediaType: 'tv',
            genreIds: d.genres.map((g) => g.id),
            runtime: d.episodeRuntime,
            director: d.creators,
            directorIds: d.creatorIds,
            seasons: d.seasons.map((s) => ({
              seasonNumber: s.seasonNumber,
              episodeCount: s.episodeCount,
            })),
            popularity: d.popularity,
          });
          if (controller.signal.aborted) return;
          setCache((prev) => mergeRow(prev, row));
        }
      } catch (err) {
        // Best-effort: log but don't surface to UI; next focus retries.
        if (!controller.signal.aborted) {
          console.warn('media_cache backfill failed', item, err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBackfillRemaining((prev) => Math.max(0, prev - 1));
        }
      }
    };

    const pump = async () => {
      while (idx < todo.length && !controller.signal.aborted) {
        while (
          inFlight.length < BACKFILL_CONCURRENCY &&
          idx < todo.length &&
          !controller.signal.aborted
        ) {
          const next = todo[idx++];
          const p = fetchOne(next).finally(() => {
            const i = inFlight.indexOf(p);
            if (i >= 0) inFlight.splice(i, 1);
          });
          inFlight.push(p);
        }
        if (inFlight.length > 0) await Promise.race(inFlight);
      }
    };
    pump();

    return () => controller.abort();
  }, [entries]);

  // ----- derived stats -----
  const statsEntries: StatsEntry[] = entries;
  const statsCache: StatsCacheRow[] = cache;

  const sum = useMemo(() => summary(statsEntries, now), [statsEntries, now]);
  const ratingBuckets = useMemo(() => ratingDistribution(statsEntries), [statsEntries]);
  const decadeBuckets = useMemo(() => decadeDistribution(statsEntries), [statsEntries]);
  const activity = useMemo(
    () => monthlyActivity(statsEntries, ACTIVITY_MONTHS, now),
    [statsEntries, now],
  );
  const top = useMemo(() => topRated(statsEntries, TOP_RATED_LIMIT), [statsEntries]);
  const genreBuckets = useMemo<GenreBucket[]>(
    () =>
      genreMaps
        ? genreDistribution(
            statsEntries,
            statsCache,
            genreMaps.movie,
            genreMaps.tv,
            TOP_GENRE_LIMIT,
          )
        : [],
    [statsEntries, statsCache, genreMaps],
  );
  const filmHours = useMemo(
    () => filmHoursWatched(statsEntries, statsCache),
    [statsEntries, statsCache],
  );
  const taste = useMemo(
    () => tasteProfile(statsEntries, statsCache, now),
    [statsEntries, statsCache, now],
  );
  const tvHours = useMemo(
    () => tvSeasonHoursWatched(statsEntries, statsCache),
    [statsEntries, statsCache],
  );
  const directorBuckets = useMemo<Bucket[]>(
    () => topDirectors(statsEntries, statsCache, TOP_DIRECTOR_LIMIT),
    [statsEntries, statsCache],
  );

  // The full diary entry record for top-rated cards (so we have title + poster).
  const topRatedEntries = useMemo(() => {
    const ids = new Set(top.map((t) => `${t.mediaType}:${t.tmdbId}:${t.watchedDate}`));
    return entries.filter((e) =>
      ids.has(`${e.mediaType}:${e.tmdbId}:${e.watchedDate}`),
    ).slice(0, TOP_RATED_LIMIT);
  }, [entries, top]);

  // ----- empty state -----
  if (entries.length === 0) {
    return (
      <Screen padded={false} edges={[]}>
        <SettingsRow onPress={openSettings} />
        <View style={[styles.centered, { paddingHorizontal: t.spacing.lg }]}>
          <Text variant="titleLg">No entries yet</Text>
          <Text
            variant="body"
            tone="muted"
            style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
          >
            Log a film or show and your stats will appear here, or bring your history over from Letterboxd.
          </Text>
          <Button
            title="Search films"
            variant="ghost"
            onPress={() => router.push('/(tabs)/search')}
            style={{ marginTop: t.spacing.lg }}
          />
          <Button
            title="Import from Letterboxd"
            variant="ghost"
            onPress={() => router.push('/import-letterboxd')}
            style={{ marginTop: t.spacing.sm }}
          />
        </View>
        <SettingsSheet ref={settingsRef} />
      </Screen>
    );
  }

  const hasRatings = ratingBuckets.some((b) => b.count > 0);
  const backfilling = backfillRemaining > 0;

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
        <SettingsRow onPress={openSettings} />
        <TasteCard
          profile={taste}
          filmHours={filmHours}
          tvHours={tvHours}
          totalMovies={sum.totalMovies}
          totalSeasons={sum.totalSeasons}
        />

        {hasRatings ? (
          <>
            <SectionEyebrow number="01" title="Ratings" />
            <RatingHistogram buckets={ratingBuckets} />
          </>
        ) : null}

        <SectionEyebrow number="02" title="Top genres" />
        {genreMaps && genreBuckets.length > 0 ? (
          <GenreDonut
            buckets={genreBuckets}
            onPress={(b) =>
              router.push({
                pathname: '/(tabs)/search',
                params: {
                  mediaType: b.dominantMediaType,
                  genreId: String(b.dominantGenreId),
                  genreName: b.label,
                },
              })
            }
          />
        ) : backfilling ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ paddingHorizontal: t.spacing.lg }}
          >
            Indexing {backfillRemaining} {backfillRemaining === 1 ? 'entry' : 'entries'}…
          </Text>
        ) : (
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing.lg }}>
            No genre data yet.
          </Text>
        )}

        <SectionEyebrow number="03" title="Top directors" />
        {directorBuckets.length > 0 ? (
          <TopDirectors buckets={directorBuckets} />
        ) : backfilling ? (
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing.lg }}>
            Indexing {backfillRemaining} {backfillRemaining === 1 ? 'entry' : 'entries'}…
          </Text>
        ) : (
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing.lg }}>
            No director data yet.
          </Text>
        )}

        <SectionEyebrow number="04" title="Activity" />
        <ActivityLineChart activity={activity} />

        {decadeBuckets.length > 0 ? (
          <>
            <SectionEyebrow number="05" title="By decade" />
            <DecadeBars buckets={decadeBuckets} />
          </>
        ) : null}

        {topRatedEntries.length > 0 ? (
          <>
            <SectionEyebrow number="06" title="Top rated" />
            <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
              {topRatedEntries.map((e) => (
                <TopRatedRow
                  key={`${e.mediaType}-${e.tmdbId}-${e.watchedDate}`}
                  entry={e}
                  onPress={() => {
                    if (e.mediaType === 'tv_season') {
                      router.push(`/tv/${e.tmdbId}`);
                    } else {
                      router.push(`/movie/${e.tmdbId}`);
                    }
                  }}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <SettingsSheet ref={settingsRef} />
    </Screen>
  );
}

// ----- subcomponents -----

function SettingsRow({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.sm,
        paddingBottom: t.spacing.md,
      }}
    >
      <Wordmark width={96} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        hitSlop={t.spacing.sm}
        style={({ pressed }) => ({
          padding: t.spacing.xs,
          opacity: pressed ? t.opacity.pressed : 1,
        })}
      >
        <Ionicons
          name="settings-outline"
          size={t.spacing.xl}
          color={t.colors.text.secondary}
        />
      </Pressable>
    </View>
  );
}

function useChartProgress(count: number) {
  const progress = useSharedValue(0);
  const totalMs =
    count <= 0 ? BAR_ANIM_DURATION : BAR_ANIM_DURATION + (count - 1) * BAR_ANIM_STAGGER;
  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withTiming(1, { duration: totalMs });
    }, [progress, totalMs]),
  );
  return { progress, totalMs };
}

function AnimatedHBar({
  progress,
  totalMs,
  index,
  ratio,
  height,
  color,
  radius,
}: {
  progress: SharedValue<number>;
  totalMs: number;
  index: number;
  ratio: number;
  height: number;
  color: string;
  radius: number;
}) {
  const animStyle = useAnimatedStyle(() => {
    const elapsed = progress.value * totalMs;
    const localMs = Math.max(
      0,
      Math.min(BAR_ANIM_DURATION, elapsed - index * BAR_ANIM_STAGGER),
    );
    const local = easeOutCubic(localMs / BAR_ANIM_DURATION);
    return { width: `${ratio * local * 100}%` };
  });
  return (
    <Animated.View
      style={[{ height, backgroundColor: color, borderRadius: radius }, animStyle]}
    />
  );
}

function RatingHistogram({
  buckets,
}: {
  buckets: { label: string; count: number }[];
}) {
  const t = useTheme();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const { progress, totalMs } = useChartProgress(buckets.length);
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.xs }}>
      {buckets.map((b, i) => (
        <View key={b.label} style={[styles.barRow, { gap: t.spacing.sm }]}>
          <Text variant="caption" tone="muted" style={{ width: 32 }}>
            {b.label}
          </Text>
          <View
            style={[
              styles.barTrack,
              {
                height: BAR_TRACK_HEIGHT,
                backgroundColor: t.colors.bg.elevated,
                borderRadius: t.radii.pill,
              },
            ]}
          >
            <AnimatedHBar
              progress={progress}
              totalMs={totalMs}
              index={i}
              ratio={b.count / max}
              height={BAR_TRACK_HEIGHT}
              color={t.colors.accent.base}
              radius={t.radii.pill}
            />
          </View>
          <Text variant="caption" tone="muted" style={{ width: 32, textAlign: 'right' }}>
            {b.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TopDirectors({ buckets }: { buckets: Bucket[] }) {
  const t = useTheme();
  const router = useRouter();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const { progress, totalMs } = useChartProgress(buckets.length);
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
      {buckets.map((b, i) => {
        const canTap = b.id != null;
        const onPress = () => {
          if (b.id != null) router.push(`/person/${b.id}`);
        };
        return (
          <Pressable
            key={b.label}
            onPress={onPress}
            disabled={!canTap}
            accessibilityRole="button"
            accessibilityLabel={`${b.label}, ${b.count} ${b.count === 1 ? 'film' : 'films'}`}
            style={({ pressed }) => [
              styles.barRow,
              {
                gap: t.spacing.sm,
                opacity: pressed && canTap ? t.opacity.pressed : 1,
              },
            ]}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={styles.directorLabel}
            >
              {b.label}
            </Text>
            <View
              style={[
                styles.barTrack,
                {
                  height: BAR_TRACK_HEIGHT_LG,
                  backgroundColor: t.colors.bg.elevated,
                  borderRadius: t.radii.pill,
                },
              ]}
            >
              <AnimatedHBar
                progress={progress}
                totalMs={totalMs}
                index={i}
                ratio={b.count / max}
                height={BAR_TRACK_HEIGHT_LG}
                color={t.colors.accent.base}
                radius={t.radii.pill}
              />
            </View>
            <Text variant="caption" tone="muted" style={{ width: 32, textAlign: 'right' }}>
              {b.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DecadeBars({
  buckets,
}: {
  buckets: { label: string; count: number }[];
}) {
  const t = useTheme();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const { progress, totalMs } = useChartProgress(buckets.length);
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.xs }}>
      {buckets.map((b, i) => (
        <View key={b.label} style={[styles.barRow, { gap: t.spacing.sm }]}>
          <Text variant="caption" style={{ width: 56 }}>
            {b.label}
          </Text>
          <View
            style={[
              styles.barTrack,
              {
                height: BAR_TRACK_HEIGHT,
                backgroundColor: t.colors.bg.elevated,
                borderRadius: t.radii.pill,
              },
            ]}
          >
            <AnimatedHBar
              progress={progress}
              totalMs={totalMs}
              index={i}
              ratio={b.count / max}
              height={BAR_TRACK_HEIGHT}
              color={t.colors.accent.base}
              radius={t.radii.pill}
            />
          </View>
          <Text variant="caption" tone="muted" style={{ width: 32, textAlign: 'right' }}>
            {b.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TopRatedRow({
  entry,
  onPress,
}: {
  entry: DiaryEntry;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.topRatedRow,
        {
          backgroundColor: pressed ? t.colors.bg.elevated : t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.md,
        },
      ]}
    >
      <PosterImage posterPath={entry.posterPath} size="sm" />
      <View style={[styles.topRatedBody, { marginLeft: t.spacing.md }]}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.title}
          {entry.year ? (
            <Text variant="caption" tone="muted">
              {' '}
              {entry.year}
            </Text>
          ) : null}
        </Text>
        {entry.mediaType === 'tv_season' && entry.seasonNumber != null ? (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            Season {entry.seasonNumber}
          </Text>
        ) : null}
        <View style={{ marginTop: t.spacing.xs }}>
          <StarRating value={entry.rating} size={14} readOnly />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barTrack: { flex: 1, overflow: 'hidden' },
  topRatedRow: { flexDirection: 'row', alignItems: 'center' },
  directorLabel: { flexShrink: 1, flexBasis: 'auto', minWidth: 0, maxWidth: '50%' },
  topRatedBody: { flex: 1, minWidth: 0 },
});
