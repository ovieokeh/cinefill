import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  Screen,
  Text,
  Button,
  BackdropPosterHeader,
  BackdropPosterHeaderSkeleton,
  CastCarousel,
  TrailerCard,
  WatchProviders,
  CrewAndGenresSection,
  MoviePosterRow,
  PosterImage,
  StarRating,
  ActionSheet,
  type ActionItem,
  type ActionSheetHandle,
  Skeleton,
} from '@/components';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { getTvDetails, type TvDetails, type TvSeasonSummary } from '@/lib/tmdb';
import { upsertMediaCache } from '@/db/media_cache';
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '@/db/watchlist';
import {
  getShowSeasonStats,
  listShowSeasonEntries,
  type DiaryEntry,
} from '@/db/diary';
import { listStandoutsForShow, type EpisodeStandout } from '@/db/standouts';

const HERO_COLLAPSE_THRESHOLD = 160;
const SKELETON_BLOCK_HEIGHT = 96;
const FAB_SIZE = 56;
const FAB_ICON_SIZE = 26;

export default function TvScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id, title, year, posterPath } = useLocalSearchParams<{
    id: string;
    title?: string;
    year?: string;
    posterPath?: string;
  }>();
  const tvId = Number(id);
  const validId = Number.isFinite(tvId);

  const seedTitle = title ?? null;
  const seedYear = year ?? null;
  const seedPosterPath = posterPath && posterPath.length > 0 ? posterPath : null;

  const [inWatchlist, setInWatchlist] = useState(false);
  const [details, setDetails] = useState<TvDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [showNavTitle, setShowNavTitle] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [seasonEntries, setSeasonEntries] = useState<DiaryEntry[]>([]);
  const [seasonStats, setSeasonStats] = useState<{ mean: number; count: number }>({
    mean: 0,
    count: 0,
  });
  const [standouts, setStandouts] = useState<EpisodeStandout[]>([]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  useAnimatedReaction(
    () => scrollY.value > HERO_COLLAPSE_THRESHOLD,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setShowNavTitle)(current);
      }
    },
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!validId) return;
      (async () => {
        const [watch, entries, stats, marks] = await Promise.all([
          isInWatchlist(tvId, 'tv'),
          listShowSeasonEntries(tvId),
          getShowSeasonStats(tvId),
          listStandoutsForShow(tvId),
        ]);
        if (cancelled) return;
        setInWatchlist(watch);
        setSeasonEntries(entries);
        setSeasonStats(stats);
        setStandouts(marks);
      })();
      return () => {
        cancelled = true;
      };
    }, [tvId, validId]),
  );

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    setLoadingDetails(true);
    setDetailsError(null);
    (async () => {
      try {
        const d = await getTvDetails(tvId, controller.signal);
        if (!controller.signal.aborted) {
          setDetails(d);
          upsertMediaCache({
            tmdbId: d.tmdbId,
            mediaType: 'tv',
            genreIds: d.genres.map((g) => g.id),
            runtime: d.episodeRuntime,
            director: d.creators,
          }).catch((err) => console.warn('media_cache upsert failed', err));
        }
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setDetailsError(e instanceof Error ? e.message : 'Failed to load show details');
      } finally {
        if (!controller.signal.aborted) setLoadingDetails(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [tvId, validId, retryKey]);

  const heroTitle = details?.name ?? seedTitle ?? '';
  const heroYear = details?.yearRange ?? seedYear;
  const heroPosterPath = details?.posterPath ?? seedPosterPath;

  const navTitle = showNavTitle && heroTitle ? heroTitle : '';

  const actionSheetRef = useRef<ActionSheetHandle>(null);

  const toggleWatchlist = useCallback(async () => {
    if (!validId || !heroTitle) return;
    haptic.light();
    try {
      if (inWatchlist) {
        await removeFromWatchlist(tvId, 'tv');
        setInWatchlist(false);
      } else {
        await addToWatchlist({
          tmdbId: tvId,
          mediaType: 'tv',
          title: heroTitle,
          year: heroYear,
          posterPath: heroPosterPath,
        });
        setInWatchlist(true);
      }
    } catch (e) {
      console.error('Failed to toggle watchlist', e);
    }
  }, [tvId, validId, inWatchlist, heroTitle, heroYear, heroPosterPath]);

  const openActions = useCallback(() => {
    if (!validId || !heroTitle) return;
    haptic.medium();
    const actions: ActionItem[] = [];

    // "Log a season" — pick the next unlogged season; if all logged, fall back to S1.
    const seasons = details?.seasons ?? [];
    if (seasons.length > 0) {
      const loggedNumbers = new Set(
        seasonEntries.map((e) => e.seasonNumber).filter((n): n is number => n != null),
      );
      const nextUnlogged =
        seasons.find((s) => !loggedNumbers.has(s.seasonNumber)) ?? seasons[0];
      actions.push({
        label: `Log Season ${nextUnlogged.seasonNumber}`,
        icon: 'eye-outline',
        onPress: () =>
          router.push({
            pathname: '/tv/[id]/season/[n]',
            params: {
              id: String(tvId),
              n: String(nextUnlogged.seasonNumber),
              showTitle: heroTitle,
              showPosterPath: heroPosterPath ?? '',
              showYear: heroYear ?? '',
            },
          }),
      });
    }
    actions.push({
      label: inWatchlist ? 'Remove from watchlist' : 'Add to watchlist',
      icon: inWatchlist ? 'bookmark' : 'bookmark-outline',
      onPress: toggleWatchlist,
    });
    actionSheetRef.current?.present(actions);
  }, [
    validId,
    heroTitle,
    heroPosterPath,
    heroYear,
    details,
    seasonEntries,
    inWatchlist,
    router,
    tvId,
    toggleWatchlist,
  ]);

  if (!validId) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Show not found</Text>
            <Button
              title="Go back"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: t.spacing.lg }}
            />
          </View>
        </Screen>
      </>
    );
  }

  const overview = details?.overview ?? '';
  const tagline = details?.tagline ?? '';

  const fabIcon: keyof typeof Ionicons.glyphMap =
    seasonStats.count > 0 ? 'eye' : inWatchlist ? 'bookmark' : 'add';

  const statusLine = (() => {
    if (!details) return null;
    const parts: string[] = [];
    if (details.numberOfSeasons) {
      parts.push(
        details.numberOfSeasons === 1
          ? '1 season'
          : `${details.numberOfSeasons} seasons`,
      );
    }
    if (details.status) parts.push(details.status);
    return parts.length > 0 ? parts.join('  ·  ') : null;
  })();

  return (
    <>
      <Stack.Screen options={{ title: navTitle }} />
      <Screen padded={false}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}
        >
          {heroTitle ? (
            <BackdropPosterHeader
              backdropPath={details?.backdropPath ?? null}
              posterPath={heroPosterPath}
              title={heroTitle}
              year={heroYear}
              runtime={details?.episodeRuntime ?? null}
              genres={(details?.genres ?? []).map((g) => g.name)}
              byline={details?.creators ? `Created by ${details.creators}` : null}
              certification={details?.certification ?? null}
              scrollY={scrollY}
            />
          ) : (
            <BackdropPosterHeaderSkeleton />
          )}

          {statusLine ? (
            <Text
              variant="caption"
              tone="muted"
              style={{ paddingHorizontal: t.spacing.lg, marginTop: t.spacing.lg }}
            >
              {statusLine}
            </Text>
          ) : null}

          {seasonStats.count > 0 ? (
            <View
              style={[
                styles.avgRow,
                {
                  paddingHorizontal: t.spacing.lg,
                  marginTop: t.spacing.md,
                  gap: t.spacing.sm,
                },
              ]}
            >
              <Text variant="label" tone="muted" style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}>
                Your average
              </Text>
              <StarRating value={seasonStats.mean} size={16} readOnly />
              <Text variant="caption" tone="muted">
                {seasonStats.mean.toFixed(1)} · {seasonStats.count} season{seasonStats.count === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}

          {loadingDetails && !details ? (
            <SkeletonBlocks />
          ) : detailsError ? (
            <ErrorBlock message={detailsError} onRetry={() => setRetryKey((k) => k + 1)} />
          ) : details ? (
            <>
              {overview || tagline ? <SectionTitle title="Overview" /> : null}
              {tagline ? (
                <Text
                  variant="body"
                  tone="secondary"
                  style={{
                    paddingHorizontal: t.spacing.lg,
                    fontStyle: 'italic',
                    marginBottom: overview ? t.spacing.sm : 0,
                  }}
                >
                  {tagline}
                </Text>
              ) : null}
              {overview ? (
                <Text variant="body" style={{ paddingHorizontal: t.spacing.lg }}>
                  {overview}
                </Text>
              ) : null}

              {details.seasons.length > 0 ? (
                <>
                  <SectionTitle title="Seasons" />
                  <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
                    {details.seasons.map((s) => (
                      <SeasonRow
                        key={s.seasonNumber}
                        show={{ tmdbId: tvId, title: heroTitle, posterPath: heroPosterPath, year: heroYear }}
                        season={s}
                        loggedEntry={seasonEntries.find((e) => e.seasonNumber === s.seasonNumber) ?? null}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              {details.cast.length > 0 ? (
                <>
                  <SectionTitle title="Cast" />
                  <CastCarousel cast={details.cast} />
                </>
              ) : null}

              {details.keyCrew.length > 0 || details.genres.length > 0 ? (
                <>
                  <SectionTitle title="Crew & Genres" />
                  <CrewAndGenresSection keyCrew={details.keyCrew} genres={details.genres} mediaType="tv" />
                </>
              ) : null}

              {standouts.length > 0 ? (
                <>
                  <SectionTitle title="Your standout episodes" />
                  <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
                    {standouts.map((ep) => (
                      <StandoutRow key={`${ep.seasonNumber}-${ep.episodeNumber}`} item={ep} />
                    ))}
                  </View>
                </>
              ) : null}

              {details.trailerYoutubeKey ? (
                <>
                  <SectionTitle title="Trailer" />
                  <TrailerCard
                    youtubeKey={details.trailerYoutubeKey}
                    backdropPath={details.backdropPath}
                  />
                </>
              ) : null}

              {details.flatrateProviders.length > 0 ? (
                <>
                  <SectionTitle title="Where to watch" />
                  <WatchProviders providers={details.flatrateProviders} />
                </>
              ) : null}

              {details.recommendations.length > 0 ? (
                <>
                  <SectionTitle title="Similar shows" />
                  <MoviePosterRow items={details.recommendations} />
                </>
              ) : null}
            </>
          ) : null}
        </Animated.ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show actions"
          onPress={openActions}
          style={({ pressed }) => [
            styles.fab,
            {
              bottom: t.spacing.xl,
              right: t.spacing.xl,
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: t.radii.pill,
              backgroundColor: pressed ? t.colors.accent.pressed : t.colors.accent.base,
              ...t.shadows.card,
            },
          ]}
        >
          <Ionicons
            name={fabIcon}
            size={FAB_ICON_SIZE}
            color={t.colors.accent.on}
          />
        </Pressable>
      </Screen>
      <ActionSheet ref={actionSheetRef} />
    </>
  );
}

function SeasonRow({
  show,
  season,
  loggedEntry,
}: {
  show: { tmdbId: number; title: string; posterPath: string | null; year: string | null };
  season: TvSeasonSummary;
  loggedEntry: DiaryEntry | null;
}) {
  const t = useTheme();
  const router = useRouter();
  const airYear = season.airDate && season.airDate.length >= 4 ? season.airDate.slice(0, 4) : null;
  const metaPieces = [
    `${season.episodeCount} ${season.episodeCount === 1 ? 'episode' : 'episodes'}`,
    airYear,
  ].filter((x): x is string => !!x);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/tv/[id]/season/[n]',
          params: {
            id: String(show.tmdbId),
            n: String(season.seasonNumber),
            showTitle: show.title,
            showPosterPath: show.posterPath ?? '',
            showYear: show.year ?? '',
          },
        })
      }
      style={({ pressed }) => [
        styles.seasonRow,
        {
          backgroundColor: pressed ? t.colors.bg.elevated : t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.md,
        },
      ]}
    >
      <PosterImage posterPath={season.posterPath} size="sm" />
      <View style={[styles.seasonBody, { marginLeft: t.spacing.md }]}>
        <Text variant="titleMd" numberOfLines={1}>
          {season.name}
        </Text>
        {metaPieces.length > 0 ? (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            {metaPieces.join('  ·  ')}
          </Text>
        ) : null}
        {loggedEntry ? (
          <View style={[styles.loggedRow, { marginTop: t.spacing.xs }]}>
            <StarRating value={loggedEntry.rating} size={14} readOnly />
          </View>
        ) : (
          <Text variant="caption" tone="accent" style={{ marginTop: t.spacing.xs }}>
            Log this season
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function StandoutRow({ item }: { item: EpisodeStandout }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.standoutRow,
        {
          backgroundColor: t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.md,
          gap: t.spacing.md,
        },
      ]}
    >
      <Ionicons name="heart" size={18} color={t.colors.danger} />
      <View style={styles.flex1}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.episodeName}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
          S{item.seasonNumber} · E{item.episodeNumber}
        </Text>
      </View>
    </View>
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

function SkeletonBlocks() {
  const t = useTheme();
  return (
    <View style={{ marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.lg }}>
      <Skeleton height={SKELETON_BLOCK_HEIGHT} />
      <View style={{ marginTop: t.spacing.md }}>
        <Skeleton height={SKELETON_BLOCK_HEIGHT} />
      </View>
    </View>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        marginTop: t.spacing.xxxl,
        marginHorizontal: t.spacing.lg,
        padding: t.spacing.lg,
        borderRadius: t.radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.border.subtle,
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <Text variant="bodyStrong">Couldn&apos;t load show details</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
        {message}
      </Text>
      <Button title="Retry" variant="ghost" onPress={onRetry} style={{ marginTop: t.spacing.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  seasonRow: { flexDirection: 'row', alignItems: 'center' },
  seasonBody: { flex: 1, minWidth: 0 },
  loggedRow: { flexDirection: 'row', alignItems: 'center' },
  standoutRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
