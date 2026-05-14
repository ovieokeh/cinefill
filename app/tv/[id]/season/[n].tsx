import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import {
  Screen,
  Text,
  Button,
  PosterImage,
  ActionSheet,
  type ActionSheetHandle,
  type ActionItem,
  Skeleton,
  SkeletonText,
  SectionEyebrow,
  ErrorBlock,
  YourLogBlock,
} from '@/components';
import { useTheme } from '@/theme';
import { useScrollTitle } from '@/lib/useScrollTitle';
import { getSeasonDetails, type SeasonDetails, type TvEpisode } from '@/lib/tmdb';
import {
  deleteEntry,
  getTvSeasonEntry,
  setEntryPublic,
  type DiaryEntry,
} from '@/db/diary';
import {
  listStandoutsForSeason,
  markStandout,
  unmarkStandout,
} from '@/db/standouts';
import { haptic } from '@/lib/haptics';
import { useFilmContext } from '@/lib/film-context';
import { useSync } from '@/lib/sync/context';

// Season hero is a poster + show + season-name row (≈ 120pt tall); match the
// person-detail threshold so the title flips on at roughly the same scroll
// distance across short-hero detail pages.
const SEASON_HERO_THRESHOLD = 120;

export default function SeasonDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { refresh } = useFilmContext();
  const { meta } = useSync();
  const { id, n, showTitle, showPosterPath, showYear } = useLocalSearchParams<{
    id: string;
    n: string;
    showTitle?: string;
    showPosterPath?: string;
    showYear?: string;
  }>();
  const tvId = Number(id);
  const seasonNumber = Number(n);
  const validIds = Number.isFinite(tvId) && Number.isFinite(seasonNumber);

  const seedShowTitle = showTitle ?? '';
  const seedShowPosterPath =
    showPosterPath && showPosterPath.length > 0 ? showPosterPath : null;
  const seedShowYear = showYear && showYear.length > 0 ? showYear : null;

  const [season, setSeason] = useState<SeasonDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [standoutKeys, setStandoutKeys] = useState<Set<number>>(new Set());

  const actionSheetRef = useRef<ActionSheetHandle>(null);
  const showPublicControls = Boolean(meta?.enabled && meta.serverUrl.trim().length > 0);

  const { scrollHandler, showTitle: showNavTitle } = useScrollTitle(SEASON_HERO_THRESHOLD);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!validIds) return;
      (async () => {
        const [e, sb] = await Promise.all([
          getTvSeasonEntry(tvId, seasonNumber),
          listStandoutsForSeason(tvId, seasonNumber),
        ]);
        if (cancelled) return;
        setEntry(e);
        setStandoutKeys(new Set(sb.map((s) => s.episodeNumber)));
      })();
      return () => {
        cancelled = true;
      };
    }, [tvId, seasonNumber, validIds]),
  );

  useEffect(() => {
    if (!validIds) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const s = await getSeasonDetails(tvId, seasonNumber, controller.signal);
        if (!controller.signal.aborted) setSeason(s);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Failed to load season');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [tvId, seasonNumber, validIds, retryKey]);

  const openLogForm = useCallback(() => {
    router.push({
      pathname: '/new-entry',
      params: {
        tmdbId: String(tvId),
        title: seedShowTitle,
        year: seedShowYear ?? '',
        posterPath: seedShowPosterPath ?? '',
        mediaType: 'tv_season',
        seasonNumber: String(seasonNumber),
        seasonName: season?.name ?? `Season ${seasonNumber}`,
      },
    });
  }, [router, tvId, seasonNumber, seedShowTitle, seedShowYear, seedShowPosterPath, season]);

  const confirmDelete = useCallback(() => {
    if (!entry) return;
    Alert.alert(
      'Delete log?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              setEntry(null);
              await refresh();
            } catch (e) {
              console.error('Failed to delete entry', e);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [entry, refresh]);

  const setLogPublic = useCallback(
    async (next: boolean) => {
      if (!entry) return;
      const previous = entry;
      haptic.selection();
      setEntry({ ...entry, isPublic: next });
      try {
        await setEntryPublic(entry.id, next);
      } catch (e) {
        setEntry(previous);
        console.error('Failed to update log visibility', e);
      }
    },
    [entry],
  );

  const openActions = useCallback(() => {
    if (!entry) return;
    const actions: ActionItem[] = [];
    actions.push({
      label: 'Edit log',
      icon: 'pencil',
      onPress: () => router.push(`/edit-entry/${entry.id}`),
    });
    if (showPublicControls) {
      actions.push({
        label: 'Make log public',
        icon: 'globe-outline',
        switch: {
          value: entry.isPublic,
          onValueChange: setLogPublic,
        },
      });
    }
    actions.push({
      label: 'Delete log',
      icon: 'trash-outline',
      destructive: true,
      onPress: confirmDelete,
    });
    actionSheetRef.current?.present(actions);
  }, [entry, router, confirmDelete, showPublicControls, setLogPublic]);

  const toggleStandout = useCallback(
    async (episode: TvEpisode) => {
      haptic.selection();
      const wasMarked = standoutKeys.has(episode.episodeNumber);
      // Optimistic UI flip
      setStandoutKeys((prev) => {
        const next = new Set(prev);
        if (wasMarked) next.delete(episode.episodeNumber);
        else next.add(episode.episodeNumber);
        return next;
      });
      try {
        if (wasMarked) {
          await unmarkStandout(tvId, seasonNumber, episode.episodeNumber);
        } else {
          await markStandout({
            tmdbId: tvId,
            seasonNumber,
            episodeNumber: episode.episodeNumber,
            episodeName: episode.name,
            showTitle: seedShowTitle,
            posterPath: seedShowPosterPath,
          });
        }
      } catch (e) {
        // Revert on failure
        setStandoutKeys((prev) => {
          const next = new Set(prev);
          if (wasMarked) next.add(episode.episodeNumber);
          else next.delete(episode.episodeNumber);
          return next;
        });
        console.error('Failed to toggle standout', e);
      }
    },
    [tvId, seasonNumber, seedShowTitle, seedShowPosterPath, standoutKeys],
  );

  if (!validIds) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Season not found</Text>
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

  const headerTitle = season?.name ?? `Season ${seasonNumber}`;
  const scrollTitle = seedShowTitle
    ? `${seedShowTitle} · ${headerTitle}`
    : headerTitle;

  // Numbered eyebrows count visible sections only.
  let sectionNo = 0;
  const num = () => String(++sectionNo).padStart(2, '0');

  return (
    <>
      <Stack.Screen options={{ title: showNavTitle ? scrollTitle : '' }} />
      <Screen padded={false}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}
        >
          <View
            style={[
              styles.row,
              { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md },
            ]}
          >
            <PosterImage posterPath={season?.posterPath ?? seedShowPosterPath} size="lg" />
            <View style={[styles.headerMeta, { marginLeft: t.spacing.md }]}>
              <Text variant="titleLg" numberOfLines={2}>
                {seedShowTitle || 'TV show'}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
                {headerTitle}
              </Text>
              {season?.airDate ? (
                <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
                  Aired {format(parseISO(season.airDate), 'MMM yyyy')}
                </Text>
              ) : null}
            </View>
          </View>

          {entry ? (
            <YourLogBlock entry={entry} number={num()} onActions={openActions} />
          ) : (
            <>
              <SectionEyebrow number={num()} title="Your log" />
              <View style={{ paddingHorizontal: t.spacing.lg }}>
                <Button title="Log this season" onPress={openLogForm} />
              </View>
            </>
          )}

          {season?.overview ? (
            <>
              <SectionEyebrow number={num()} title="Overview" />
              <Text variant="body" style={{ paddingHorizontal: t.spacing.lg }}>
                {season.overview}
              </Text>
            </>
          ) : null}

          <SectionEyebrow number={num()} title="Episodes" />
          {loading && !season ? (
            <EpisodeListSkeleton />
          ) : error && !season ? (
            <ErrorBlock
              title="Couldn't load this season"
              message={error}
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          ) : season ? (
            season.episodes.length === 0 ? (
              <Text
                variant="body"
                tone="muted"
                style={{ paddingHorizontal: t.spacing.lg }}
              >
                Episodes haven&apos;t aired yet.
              </Text>
            ) : (
              <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
                {season.episodes.map((ep) => (
                  <EpisodeRow
                    key={ep.episodeNumber}
                    episode={ep}
                    isStandout={standoutKeys.has(ep.episodeNumber)}
                    onToggleStandout={() => toggleStandout(ep)}
                  />
                ))}
              </View>
            )
          ) : null}
        </Animated.ScrollView>
      </Screen>
      <ActionSheet ref={actionSheetRef} />
    </>
  );
}

function EpisodeRow({
  episode,
  isStandout: marked,
  onToggleStandout,
}: {
  episode: TvEpisode;
  isStandout: boolean;
  onToggleStandout: () => void;
}) {
  const t = useTheme();
  const airYear =
    episode.airDate && episode.airDate.length >= 4 ? episode.airDate.slice(0, 4) : null;
  return (
    <View
      style={[
        styles.episodeRow,
        {
          backgroundColor: t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.md,
          gap: t.spacing.md,
        },
      ]}
    >
      <View style={[styles.episodeBody, styles.flex1]}>
        <Text variant="bodyStrong">
          {episode.episodeNumber}. {episode.name}
        </Text>
        {airYear ? (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            {airYear}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onToggleStandout}
        accessibilityRole="button"
        accessibilityLabel={marked ? 'Unmark standout' : 'Mark as standout'}
        hitSlop={t.spacing.sm}
        style={({ pressed }) => ({ opacity: pressed ? t.opacity.pressed : 1 })}
      >
        <Ionicons
          name={marked ? 'heart' : 'heart-outline'}
          size={t.spacing.xl}
          color={marked ? t.colors.danger : t.colors.text.muted}
        />
      </Pressable>
    </View>
  );
}

function EpisodeListSkeleton({ count = 6 }: { count?: number }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.episodeRow,
            {
              backgroundColor: t.colors.bg.surface,
              borderRadius: t.radii.md,
              padding: t.spacing.md,
              gap: t.spacing.md,
            },
          ]}
        >
          <View style={[styles.episodeBody, styles.flex1]}>
            <SkeletonText variant="bodyStrong" width="70%" />
            <View style={{ marginTop: t.spacing.xxs }}>
              <SkeletonText variant="caption" width="20%" />
            </View>
          </View>
          <Skeleton width={t.spacing.xl} height={t.spacing.xl} borderRadius={t.radii.sm} />
        </View>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  headerMeta: { flex: 1, minWidth: 0 },
  episodeRow: { flexDirection: 'row', alignItems: 'center' },
  episodeBody: {},
  flex1: { flex: 1, minWidth: 0 },
});
