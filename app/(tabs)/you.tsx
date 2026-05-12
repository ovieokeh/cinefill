import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';

import { Screen, Text, Button, PosterImage, StarRating } from '@/components';
import { useTheme } from '@/theme';
import {
  listEntries,
  type DiaryEntry,
} from '@/db/diary';
import { countWatchlist } from '@/db/watchlist';
import { countStandouts } from '@/db/standouts';
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
  topRated,
  type GenreBucket,
  type GenreMap,
  type StatsEntry,
  type StatsCacheRow,
} from '@/lib/stats';

const BAR_TRACK_HEIGHT = 8;
const BAR_TRACK_HEIGHT_LG = 10;
const ACTIVITY_BAR_MAX_HEIGHT = 96;
const ACTIVITY_BAR_WIDTH = 12;
const TOP_GENRE_LIMIT = 8;
const TOP_RATED_LIMIT = 5;
const ACTIVITY_MONTHS = 12;
const BACKFILL_CONCURRENCY = 6;

const BAR_ANIM_DURATION = 500;
const BAR_ANIM_STAGGER = 40;
const easeOutCubic = Easing.out(Easing.cubic);

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function YouScreen() {
  const t = useTheme();
  const router = useRouter();
  const now = useMemo(() => new Date(), []);

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [cache, setCache] = useState<MediaCacheRow[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [standoutsCount, setStandoutsCount] = useState(0);
  const [genreMaps, setGenreMaps] = useState<{ movie: GenreMap; tv: GenreMap } | null>(null);
  const [backfillRemaining, setBackfillRemaining] = useState(0);

  // ----- initial load on focus -----
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [es, cs, wc, sc] = await Promise.all([
          listEntries(),
          listAllCache(),
          countWatchlist(),
          countStandouts(),
        ]);
        if (cancelled) return;
        setEntries(es);
        setCache(cs);
        setWatchlistCount(wc);
        setStandoutsCount(sc);
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

    const cacheKeys = new Set(cacheRef.current.map((c) => `${c.mediaType}:${c.tmdbId}`));
    const todo: { tmdbId: number; mediaType: 'movie' | 'tv' }[] = [];
    const seen = new Set<string>();
    for (const e of entries) {
      const mt: 'movie' | 'tv' = e.mediaType === 'movie' ? 'movie' : 'tv';
      const key = `${mt}:${e.tmdbId}`;
      if (cacheKeys.has(key) || seen.has(key)) continue;
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
          });
          if (controller.signal.aborted) return;
          setCache((prev) => [...prev, row]);
        } else {
          const d = await getTvDetails(item.tmdbId, controller.signal);
          if (controller.signal.aborted) return;
          const row = await upsertMediaCache({
            tmdbId: d.tmdbId,
            mediaType: 'tv',
            genreIds: d.genres.map((g) => g.id),
            runtime: d.episodeRuntime,
            director: d.creators,
          });
          if (controller.signal.aborted) return;
          setCache((prev) => [...prev, row]);
        }
      } catch {
        // Silent: best-effort; next time the screen mounts it'll retry.
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
      <Screen>
        <View style={styles.centered}>
          <Text variant="titleLg">No entries yet</Text>
          <Text
            variant="body"
            tone="muted"
            style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
          >
            Log a film or show and your stats will appear here.
          </Text>
          <Button
            title="Search films"
            variant="ghost"
            onPress={() => router.push('/(tabs)/search')}
            style={{ marginTop: t.spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  const hasRatings = ratingBuckets.some((b) => b.count > 0);
  const backfilling = backfillRemaining > 0;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
        <SummaryCard
          sum={sum}
          watchlistCount={watchlistCount}
          standoutsCount={standoutsCount}
          filmHours={filmHours}
          backfilling={backfilling}
        />

        {hasRatings ? (
          <>
            <SectionTitle title="Ratings" />
            <RatingHistogram buckets={ratingBuckets} />
          </>
        ) : null}

        <SectionTitle title="Top genres" />
        {genreMaps && genreBuckets.length > 0 ? (
          <TopGenres
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

        <SectionTitle title="Activity" />
        <ActivityChart activity={activity} />

        {decadeBuckets.length > 0 ? (
          <>
            <SectionTitle title="By decade" />
            <DecadeBars buckets={decadeBuckets} />
          </>
        ) : null}

        {topRatedEntries.length > 0 ? (
          <>
            <SectionTitle title="Top rated" />
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
    </Screen>
  );
}

// ----- subcomponents -----

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

function AnimatedVBar({
  progress,
  totalMs,
  index,
  ratio,
  width,
  color,
  radius,
}: {
  progress: SharedValue<number>;
  totalMs: number;
  index: number;
  ratio: number;
  width: number;
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
    const h = ratio * local * ACTIVITY_BAR_MAX_HEIGHT;
    return { height: local > 0 ? Math.max(2, h) : 0 };
  });
  return (
    <Animated.View
      style={[
        {
          width,
          backgroundColor: color,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
        },
        animStyle,
      ]}
    />
  );
}

function SummaryCard({
  sum,
  watchlistCount,
  standoutsCount,
  filmHours,
  backfilling,
}: {
  sum: ReturnType<typeof summary>;
  watchlistCount: number;
  standoutsCount: number;
  filmHours: number;
  backfilling: boolean;
}) {
  const t = useTheme();
  const hoursLabel = backfilling
    ? `${Math.round(filmHours)}h+ (indexing)`
    : `${Math.round(filmHours)}h`;
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: t.colors.bg.surface,
          margin: t.spacing.lg,
          padding: t.spacing.lg,
          borderRadius: t.radii.md,
        },
      ]}
    >
      <Text
        variant="label"
        tone="muted"
        style={{
          textTransform: 'uppercase',
          letterSpacing: t.tracking.label,
        }}
      >
        This year
      </Text>
      <Text variant="displayMd" style={{ marginTop: t.spacing.xs }}>
        {sum.currentYearMovies} film{sum.currentYearMovies === 1 ? '' : 's'} ·{' '}
        {sum.currentYearSeasons} season{sum.currentYearSeasons === 1 ? '' : 's'}
      </Text>

      <Text
        variant="label"
        tone="muted"
        style={{
          marginTop: t.spacing.lg,
          textTransform: 'uppercase',
          letterSpacing: t.tracking.label,
        }}
      >
        All time
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: t.spacing.xs }}>
        {sum.totalMovies} film{sum.totalMovies === 1 ? '' : 's'} · {sum.totalSeasons} season
        {sum.totalSeasons === 1 ? '' : 's'}
      </Text>
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
        {watchlistCount} on watchlist · {standoutsCount} standout episode
        {standoutsCount === 1 ? '' : 's'}
      </Text>

      {sum.avgRating > 0 ? (
        <View style={[styles.avgRow, { marginTop: t.spacing.md, gap: t.spacing.sm }]}>
          <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}>
            Avg rating
          </Text>
          <StarRating value={sum.avgRating} size={16} readOnly />
          <Text variant="caption" tone="muted">
            {sum.avgRating.toFixed(1)}
          </Text>
        </View>
      ) : null}

      <View style={[styles.avgRow, { marginTop: t.spacing.sm, gap: t.spacing.sm }]}>
        <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}>
          Film hours
        </Text>
        <Text variant="caption" tone="muted">
          {hoursLabel}
        </Text>
      </View>
    </View>
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

function TopGenres({
  buckets,
  onPress,
}: {
  buckets: GenreBucket[];
  onPress: (b: GenreBucket) => void;
}) {
  const t = useTheme();
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const { progress, totalMs } = useChartProgress(buckets.length);
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
      {buckets.map((b, i) => (
        <Pressable
          key={`${b.dominantMediaType}-${b.dominantGenreId}-${b.label}`}
          onPress={() => onPress(b)}
          style={({ pressed }) => [
            styles.barRow,
            { gap: t.spacing.sm, opacity: pressed ? t.opacity.pressed : 1 },
          ]}
        >
          <Text variant="caption" style={{ width: 88 }} numberOfLines={1}>
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
      ))}
    </View>
  );
}

function ActivityChart({
  activity,
}: {
  activity: { year: number; month: number; count: number }[];
}) {
  const t = useTheme();
  const max = Math.max(1, ...activity.map((a) => a.count));
  const { progress, totalMs } = useChartProgress(activity.length);
  return (
    <View
      style={[
        styles.activityRow,
        {
          paddingHorizontal: t.spacing.lg,
          gap: t.spacing.sm,
          height: ACTIVITY_BAR_MAX_HEIGHT + 24,
        },
      ]}
    >
      {activity.map((a, i) => (
        <View key={`${a.year}-${a.month}`} style={styles.activityBarCol}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <AnimatedVBar
              progress={progress}
              totalMs={totalMs}
              index={i}
              ratio={a.count / max}
              width={ACTIVITY_BAR_WIDTH}
              color={t.colors.accent.base}
              radius={t.radii.sm}
            />
          </View>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: t.spacing.xxs, textAlign: 'center' }}
          >
            {MONTH_LETTERS[a.month]}
          </Text>
        </View>
      ))}
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

function SectionTitle({ title }: { title: string }) {
  const t = useTheme();
  return (
    <Text
      variant="label"
      tone="muted"
      style={{
        marginTop: t.spacing.xxxl,
        marginBottom: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: t.tracking.label,
      }}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {},
  avgRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barTrack: { flex: 1, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'stretch' },
  activityBarCol: { flex: 1, alignItems: 'center' },
  topRatedRow: { flexDirection: 'row', alignItems: 'center' },
  topRatedBody: { flex: 1, minWidth: 0 },
});
