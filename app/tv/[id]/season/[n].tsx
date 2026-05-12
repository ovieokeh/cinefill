import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import {
  Screen,
  Text,
  Button,
  PosterImage,
  StarRating,
  ActionSheet,
  type ActionSheetHandle,
  type ActionItem,
  Skeleton,
  SkeletonText,
} from '@/components';
import { useTheme } from '@/theme';
import { getSeasonDetails, type SeasonDetails, type TvEpisode } from '@/lib/tmdb';
import {
  deleteEntry,
  getTvSeasonEntry,
  type DiaryEntry,
} from '@/db/diary';
import {
  listStandoutsForSeason,
  markStandout,
  unmarkStandout,
} from '@/db/standouts';
import { haptic } from '@/lib/haptics';

export default function SeasonDetailScreen() {
  const t = useTheme();
  const router = useRouter();
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
            } catch (e) {
              console.error('Failed to delete entry', e);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [entry]);

  const openActions = useCallback(() => {
    if (!entry) return;
    const actions: ActionItem[] = [
      {
        label: 'Edit log',
        icon: 'pencil',
        onPress: () => router.push(`/edit-entry/${entry.id}`),
      },
      {
        label: 'Delete log',
        icon: 'trash-outline',
        destructive: true,
        onPress: confirmDelete,
      },
    ];
    actionSheetRef.current?.present(actions);
  }, [entry, router, confirmDelete]);

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

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
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
            {entry ? (
              <YourLogBlock entry={entry} onActions={openActions} />
            ) : (
              <Button title="Log this season" onPress={openLogForm} />
            )}
          </View>

          {season?.overview ? (
            <>
              <SectionTitle title="Overview" />
              <Text variant="body" style={{ paddingHorizontal: t.spacing.lg }}>
                {season.overview}
              </Text>
            </>
          ) : null}

          <SectionTitle title="Episodes" />
          {loading && !season ? (
            <EpisodeListSkeleton />
          ) : error && !season ? (
            <ErrorBlock message={error} onRetry={() => setRetryKey((k) => k + 1)} />
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
        </ScrollView>
      </Screen>
      <ActionSheet ref={actionSheetRef} />
    </>
  );
}

function YourLogBlock({
  entry,
  onActions,
}: {
  entry: DiaryEntry;
  onActions: () => void;
}) {
  const t = useTheme();
  const watched = parseISO(entry.watchedDate);
  return (
    <View
      style={[
        styles.logBlock,
        {
          backgroundColor: t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.lg,
        },
      ]}
    >
      <View style={styles.logHeader}>
        {entry.rating > 0 ? (
          <StarRating value={entry.rating} size={20} readOnly />
        ) : (
          <Text variant="bodyStrong" tone="muted">
            Unrated
          </Text>
        )}
        <Pressable
          onPress={onActions}
          accessibilityRole="button"
          accessibilityLabel="Log options"
          hitSlop={t.spacing.sm}
          style={{
            paddingHorizontal: t.spacing.sm,
            paddingVertical: t.spacing.xs,
          }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={t.spacing.xl}
            color={t.colors.accent.base}
          />
        </Pressable>
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
        {format(watched, 'EEEE, MMMM d, yyyy')}
      </Text>
      {entry.note ? (
        <Text variant="body" style={{ marginTop: t.spacing.md }}>
          {entry.note}
        </Text>
      ) : null}
    </View>
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

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        marginTop: t.spacing.lg,
        marginHorizontal: t.spacing.lg,
        padding: t.spacing.lg,
        borderRadius: t.radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.border.subtle,
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <Text variant="bodyStrong">Couldn&apos;t load this season</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
        {message}
      </Text>
      <Button title="Retry" variant="ghost" onPress={onRetry} style={{ marginTop: t.spacing.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  headerMeta: { flex: 1, minWidth: 0 },
  logBlock: {},
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  episodeRow: { flexDirection: 'row', alignItems: 'center' },
  episodeBody: {},
  flex1: { flex: 1, minWidth: 0 },
});
