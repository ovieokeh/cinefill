import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
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
  CastCarousel,
  TrailerCard,
  WatchProviders,
  CrewAndGenresSection,
  SimilarMoviesCarousel,
  ActionSheet,
  type ActionSheetHandle,
} from '@/components';
import { useTheme } from '@/theme';
import { getEntry, deleteEntry, type DiaryEntry } from '@/db/diary';
import { getMovieDetails, type MovieDetails } from '@/lib/tmdb';

const HERO_COLLAPSE_THRESHOLD = 160;
const SKELETON_BLOCK_HEIGHT = 96;

type EntryState = DiaryEntry | null | 'missing';

export default function EntryDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);

  const [entry, setEntry] = useState<EntryState>(null);
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
      if (!Number.isFinite(entryId)) {
        setEntry('missing');
        return;
      }
      (async () => {
        const row = await getEntry(entryId);
        if (cancelled) return;
        setEntry(row ?? 'missing');
      })();
      return () => {
        cancelled = true;
      };
    }, [entryId]),
  );

  const tmdbId = entry && entry !== 'missing' ? entry.tmdbId : null;

  useEffect(() => {
    if (tmdbId == null) return;
    const controller = new AbortController();
    setLoadingDetails(true);
    setDetailsError(null);
    (async () => {
      try {
        const d = await getMovieDetails(tmdbId, controller.signal);
        if (!controller.signal.aborted) setDetails(d);
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
  }, [tmdbId, retryKey]);

  const navTitle =
    showNavTitle && entry && entry !== 'missing' ? entry.title : '';

  const loadedEntry = entry && entry !== 'missing' ? entry : null;
  const actionSheetRef = useRef<ActionSheetHandle>(null);

  const doDelete = useCallback(async () => {
    if (!loadedEntry) return;
    try {
      await deleteEntry(loadedEntry.id);
      router.dismissTo('/');
    } catch (e) {
      console.error('Failed to delete entry', e);
    }
  }, [loadedEntry, router]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete entry?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
      { cancelable: true },
    );
  }, [doDelete]);

  const openActions = useCallback(() => {
    if (!loadedEntry) return;
    actionSheetRef.current?.present([
      {
        label: 'Edit entry',
        icon: 'pencil',
        onPress: () => router.push(`/edit-entry/${loadedEntry.id}`),
      },
      {
        label: 'Delete entry',
        icon: 'trash-outline',
        destructive: true,
        onPress: confirmDelete,
      },
    ]);
  }, [loadedEntry, router, confirmDelete]);

  if (entry === 'missing') {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Entry not found</Text>
            <Text
              variant="body"
              tone="muted"
              style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
            >
              This diary entry may have been deleted.
            </Text>
            <Button
              title="Back to diary"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: t.spacing.lg }}
            />
          </View>
        </Screen>
      </>
    );
  }

  if (entry == null) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen padded={false}>
          <View style={styles.centered}>
            <ActivityIndicator color={t.colors.text.muted} />
          </View>
        </Screen>
      </>
    );
  }

  const watched = parseISO(entry.watchedDate);
  const tagline = details?.tagline ?? '';
  const overview = details?.overview ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: navTitle,
          headerRight: () => (
            <Pressable
              onPress={openActions}
              hitSlop={t.spacing.sm}
              accessibilityLabel="Entry options"
              accessibilityRole="button"
              style={{
                paddingHorizontal: t.spacing.sm,
                paddingVertical: t.spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={t.spacing.xl}
                color={t.colors.accent.base}
              />
            </Pressable>
          ),
        }}
      />
      <Screen padded={false}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}
        >
          <BackdropPosterHeader
            backdropPath={details?.backdropPath ?? null}
            posterPath={details?.posterPath ?? entry.posterPath}
            title={entry.title}
            year={entry.year}
            runtime={details?.runtime ?? null}
            genres={details?.genres ?? []}
            director={details?.director ?? null}
            certification={details?.certification ?? null}
            scrollY={scrollY}
          />

          <YourLogSection entry={entry} watched={watched} />

          {loadingDetails && !details ? (
            <SkeletonBlocks />
          ) : detailsError ? (
            <ErrorBlock message={detailsError} onRetry={() => setRetryKey((k) => k + 1)} />
          ) : details ? (
            <>
              {overview || tagline ? (
                <SectionTitle title="Overview" />
              ) : null}
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
                  <SectionTitle title="Similar movies" />
                  <SimilarMoviesCarousel movies={details.recommendations} />
                </>
              ) : null}
            </>
          ) : null}
        </Animated.ScrollView>
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

function YourLogSection({ entry, watched }: { entry: DiaryEntry; watched: Date }) {
  const t = useTheme();
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
});
