import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';

import {
  Screen,
  Text,
  Button,
  StarRating,
  BackdropPosterHeader,
  BackdropPosterHeaderSkeleton,
  CastCarousel,
  TrailerCard,
  WatchProviders,
  CrewAndGenresSection,
  MoviePosterRow,
  ActionSheet,
  type ActionSheetHandle,
  type ActionItem,
  Skeleton,
} from '@/components';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import {
  getEntryByTmdbId,
  deleteEntry,
  type DiaryEntry,
} from '@/db/diary';
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from '@/db/watchlist';
import { getMovieDetails, type MovieDetails } from '@/lib/tmdb';
import { upsertMediaCache } from '@/db/media_cache';

const HERO_COLLAPSE_THRESHOLD = 160;
const SKELETON_BLOCK_HEIGHT = 96;
const FAB_SIZE = 56;
const FAB_ICON_SIZE = 26;

export default function MovieScreen() {
  const t = useTheme();
  const router = useRouter();
  const { tmdbId: rawTmdbId, title, year, posterPath } = useLocalSearchParams<{
    tmdbId: string;
    title?: string;
    year?: string;
    posterPath?: string;
  }>();
  const tmdbId = Number(rawTmdbId);
  const validTmdbId = Number.isFinite(tmdbId);

  const seedTitle = title ?? null;
  const seedYear = year ?? null;
  const seedPosterPath = posterPath && posterPath.length > 0 ? posterPath : null;

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [details, setDetails] = useState<MovieDetails | null>(null);
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
      if (!validTmdbId) return;
      (async () => {
        const [row, watch] = await Promise.all([
          getEntryByTmdbId(tmdbId),
          isInWatchlist(tmdbId, 'movie'),
        ]);
        if (cancelled) return;
        setEntry(row);
        setInWatchlist(watch);
      })();
      return () => {
        cancelled = true;
      };
    }, [tmdbId, validTmdbId]),
  );

  useEffect(() => {
    if (!validTmdbId) return;
    const controller = new AbortController();
    setLoadingDetails(true);
    setDetailsError(null);
    (async () => {
      try {
        const d = await getMovieDetails(tmdbId, controller.signal);
        if (!controller.signal.aborted) {
          setDetails(d);
          // Eagerly cache metadata for the You-tab stats. Fire-and-forget; failures shouldn't block UI.
          upsertMediaCache({
            tmdbId: d.tmdbId,
            mediaType: 'movie',
            genreIds: d.genres.map((g) => g.id),
            runtime: d.runtime,
            director: d.director,
            seasons: [],
          }).catch((err) => console.warn('media_cache upsert failed', err));
        }
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setDetailsError(e instanceof Error ? e.message : 'Failed to load film details');
      } finally {
        if (!controller.signal.aborted) setLoadingDetails(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [tmdbId, validTmdbId, retryKey]);

  const heroTitle = details?.title ?? entry?.title ?? seedTitle ?? '';
  const heroYear = entry?.year ?? seedYear;
  const heroPosterPath = details?.posterPath ?? entry?.posterPath ?? seedPosterPath;

  const navTitle = showNavTitle && heroTitle ? heroTitle : '';

  const actionSheetRef = useRef<ActionSheetHandle>(null);

  const doDelete = useCallback(async () => {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      setEntry(null);
    } catch (e) {
      console.error('Failed to delete entry', e);
    }
  }, [entry]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete log?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
      { cancelable: true },
    );
  }, [doDelete]);

  const toggleWatchlist = useCallback(async () => {
    if (!validTmdbId) return;
    haptic.light();
    try {
      if (inWatchlist) {
        await removeFromWatchlist(tmdbId, 'movie');
        setInWatchlist(false);
      } else {
        await addToWatchlist({
          tmdbId,
          mediaType: 'movie',
          title: heroTitle,
          year: heroYear,
          posterPath: heroPosterPath,
        });
        setInWatchlist(true);
      }
    } catch (e) {
      console.error('Failed to toggle watchlist', e);
    }
  }, [tmdbId, validTmdbId, inWatchlist, heroTitle, heroYear, heroPosterPath]);

  const openActions = useCallback(() => {
    if (!validTmdbId || !heroTitle) return;
    haptic.medium();
    const actions: ActionItem[] = [];
    if (entry) {
      actions.push({
        label: 'Edit log',
        icon: 'pencil',
        onPress: () => router.push(`/edit-entry/${entry.id}`),
      });
      actions.push({
        label: 'Delete log',
        icon: 'trash-outline',
        destructive: true,
        onPress: confirmDelete,
      });
    } else {
      actions.push({
        label: 'Log a watch',
        icon: 'eye-outline',
        onPress: () =>
          router.push({
            pathname: '/new-entry',
            params: {
              tmdbId: String(tmdbId),
              title: heroTitle,
              year: heroYear ?? '',
              posterPath: heroPosterPath ?? '',
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
    validTmdbId,
    heroTitle,
    entry,
    inWatchlist,
    router,
    tmdbId,
    heroYear,
    heroPosterPath,
    confirmDelete,
    toggleWatchlist,
  ]);

  if (!validTmdbId) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Film not found</Text>
            <Text
              variant="body"
              tone="muted"
              style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
            >
              The film reference is invalid.
            </Text>
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

  const fabIcon: keyof typeof Ionicons.glyphMap = entry
    ? 'eye'
    : inWatchlist
      ? 'bookmark'
      : 'add';

  const overview = details?.overview ?? '';
  const tagline = details?.tagline ?? '';

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
              runtime={details?.runtime ?? null}
              genres={(details?.genres ?? []).map((g) => g.name)}
              byline={details?.director ? `Directed by ${details.director}` : null}
              certification={details?.certification ?? null}
              scrollY={scrollY}
            />
          ) : (
            <BackdropPosterHeaderSkeleton />
          )}

          {entry ? <YourLogSection entry={entry} /> : null}

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
                  <CrewAndGenresSection keyCrew={details.keyCrew} genres={details.genres} mediaType="movie" />
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
                  <SectionTitle title="Similar movies" />
                  <MoviePosterRow items={details.recommendations} />
                </>
              ) : null}
            </>
          ) : null}
        </Animated.ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Film actions"
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
          <Ionicons name={fabIcon} size={FAB_ICON_SIZE} color={t.colors.accent.on} />
        </Pressable>
      </Screen>
      <ActionSheet ref={actionSheetRef} />
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

function YourLogSection({ entry }: { entry: DiaryEntry }) {
  const t = useTheme();
  const watched = parseISO(entry.watchedDate);
  return (
    <View
      style={{
        marginTop: t.spacing.xxxl,
        paddingHorizontal: t.spacing.lg,
      }}
    >
      <Text
        variant="label"
        tone="muted"
        style={{
          marginBottom: t.spacing.md,
          textTransform: 'uppercase',
          letterSpacing: t.tracking.label,
        }}
      >
        Your log
      </Text>
      {entry.rating > 0 ? (
        <StarRating value={entry.rating} size={32} readOnly />
      ) : (
        <Text variant="bodyStrong" tone="muted">
          Unrated
        </Text>
      )}
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.sm }}>
        {format(watched, 'EEEE, MMMM d, yyyy')}
      </Text>
      {entry.note ? (
        <Text variant="body" style={{ marginTop: t.spacing.md }}>
          {entry.note}
        </Text>
      ) : (
        <Text variant="body" tone="muted" style={{ marginTop: t.spacing.md }}>
          No note.
        </Text>
      )}
    </View>
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
      <Text variant="bodyStrong">Couldn&apos;t load film details</Text>
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
});
