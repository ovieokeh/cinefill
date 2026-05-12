import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
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
  CastCarousel,
  TrailerCard,
  WatchProviders,
  CrewAndGenresSection,
  MoviePosterRow,
} from '@/components';
import { useTheme } from '@/theme';
import { getTvDetails, type TvDetails } from '@/lib/tmdb';
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '@/db/watchlist';

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
        const watch = await isInWatchlist(tvId, 'tv');
        if (cancelled) return;
        setInWatchlist(watch);
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
        if (!controller.signal.aborted) setDetails(d);
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

  const toggleWatchlist = useCallback(async () => {
    if (!validId || !heroTitle) return;
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
              genres={details?.genres ?? []}
              byline={details?.creators ? `Created by ${details.creators}` : null}
              certification={details?.certification ?? null}
              scrollY={scrollY}
            />
          ) : (
            <View style={styles.heroSkeleton}>
              <ActivityIndicator color={t.colors.text.muted} />
            </View>
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

              {details.cast.length > 0 ? (
                <>
                  <SectionTitle title="Cast" />
                  <CastCarousel cast={details.cast} />
                </>
              ) : null}

              {details.keyCrew.length > 0 || details.genres.length > 0 ? (
                <>
                  <SectionTitle title="Crew & Genres" />
                  <CrewAndGenresSection keyCrew={details.keyCrew} genres={details.genres} />
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
          accessibilityLabel={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          onPress={toggleWatchlist}
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
            name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
            size={FAB_ICON_SIZE}
            color={t.colors.accent.on}
          />
        </Pressable>
      </Screen>
    </>
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
      <View
        style={{
          height: SKELETON_BLOCK_HEIGHT,
          backgroundColor: t.colors.bg.elevated,
          borderRadius: t.radii.md,
        }}
      />
      <View
        style={{
          marginTop: t.spacing.md,
          height: SKELETON_BLOCK_HEIGHT,
          backgroundColor: t.colors.bg.elevated,
          borderRadius: t.radii.md,
        }}
      />
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
  heroSkeleton: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
