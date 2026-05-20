import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Screen,
  Text,
  Button,
  EntryRow,
  FilterBar,
  MediaTypeChips,
  GenreChip,
  DecadeChip,
  SortChip,
  Skeleton,
  SkeletonPoster,
  SkeletonText,
  type MediaTypeOption,
  type SortOption,
} from '@/components';
import { useTheme } from '@/theme';
import { listEntries, type DiaryEntry } from '@/db/diary';
import { listAllCache, type MediaCacheRow } from '@/db/media_cache';
import {
  applyFilters,
  applySort,
  countActiveFilters,
  EMPTY_FILTERS,
  type FilterAccessors,
  type ListFilters,
  type ListMediaType,
} from '@/lib/list-filters';
import {
  groupDiaryEntries,
  type DiarySection,
  type DiarySortKey,
} from '@/lib/diary-grouping';
import { useFilmContext } from '@/lib/film-context';

const MEDIA_OPTIONS: MediaTypeOption<ListMediaType>[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
];

const SORT_OPTIONS: SortOption<DiarySortKey>[] = [
  { key: 'recently-watched', label: 'Recently watched' },
  { key: 'highest-rated', label: 'Highest rated' },
  { key: 'recently-logged', label: 'Recently logged' },
  { key: 'release-year', label: 'Release year' },
];

function releaseYearValue(year: string | null): number {
  const value = Number(year);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

const SORT_COMPARATORS: Record<DiarySortKey, (a: DiaryEntry, b: DiaryEntry) => number> = {
  'recently-watched': (a, b) =>
    b.watchedDate.localeCompare(a.watchedDate) || b.createdAt - a.createdAt,
  'highest-rated': (a, b) =>
    b.rating - a.rating || b.watchedDate.localeCompare(a.watchedDate),
  'recently-logged': (a, b) => b.createdAt - a.createdAt,
  'release-year': (a, b) =>
    releaseYearValue(b.year) - releaseYearValue(a.year) ||
    b.watchedDate.localeCompare(a.watchedDate) ||
    b.createdAt - a.createdAt,
};

const SKELETON_DAY_SIZE = 64;

type Row =
  | { type: 'header'; key: string; label: string }
  | { type: 'entry'; entry: DiaryEntry };

function toRows(sections: DiarySection[]): Row[] {
  const rows: Row[] = [];
  for (const s of sections) {
    rows.push({ type: 'header', key: s.key, label: s.label });
    for (const item of s.items) rows.push({ type: 'entry', entry: item });
  }
  return rows;
}

export default function DiaryScreen() {
  const t = useTheme();
  const router = useRouter();
  const { version: dataVersion } = useFilmContext();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [cache, setCache] = useState<MediaCacheRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showLoadError, setShowLoadError] = useState(false);
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<DiarySortKey>('recently-watched');
  const inflightLoadRef = useRef<Promise<void> | null>(null);
  const pendingLoadRef = useRef(false);

  const load = useCallback(async () => {
    if (inflightLoadRef.current) {
      pendingLoadRef.current = true;
      return inflightLoadRef.current;
    }
    const run = (async () => {
      do {
        pendingLoadRef.current = false;
        try {
          const rows = await listEntries();
          const cs = await listAllCache();
          setEntries(rows);
          setCache(cs);
          setLoadError(null);
          setShowLoadError(false);
        } catch (error) {
          console.warn('diary load failed', error);
          setLoadError('Could not load your diary.');
        }
      } while (pendingLoadRef.current);
      inflightLoadRef.current = null;
    })();
    inflightLoadRef.current = run;
    return run;
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  useEffect(() => {
    if (dataVersion > 0) load().catch(() => {});
  }, [dataVersion, load]);

  useEffect(() => {
    if (!loadError || entries !== null) {
      setShowLoadError(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowLoadError(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [entries, loadError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const cacheByKey = useMemo(
    () => new Map(cache.map((c) => [`${c.mediaType}:${c.tmdbId}`, c])),
    [cache],
  );

  const accessors: FilterAccessors<DiaryEntry> = useMemo(
    () => ({
      getMediaType: (e) => (e.mediaType === 'movie' ? 'movie' : 'tv'),
      getYear: (e) => e.year,
      getGenreIds: (e) => {
        const mt = e.mediaType === 'movie' ? 'movie' : 'tv';
        const c = cacheByKey.get(`${mt}:${e.tmdbId}`);
        return c?.genreIds ?? null;
      },
    }),
    [cacheByKey],
  );

  const decades = useMemo(() => {
    const set = new Set<number>();
    for (const e of entries ?? []) {
      if (!e.year) continue;
      const y = Number(e.year);
      if (Number.isFinite(y)) set.add(Math.floor(y / 10) * 10);
    }
    return [...set].sort((a, b) => b - a);
  }, [entries]);

  const filtered = useMemo(
    () => applyFilters(entries ?? [], filters, accessors),
    [entries, filters, accessors],
  );

  const sorted = useMemo(
    () => applySort(filtered, sortKey, SORT_COMPARATORS),
    [filtered, sortKey],
  );

  const rows: Row[] = useMemo(
    () => toRows(groupDiaryEntries(sortKey, sorted)),
    [sorted, sortKey],
  );

  // Sorts that already group by month-of-watched-date carry temporal context in
  // the section header; everything else relies on the day-square to do so.
  const showMonthInDay = sortKey !== 'recently-watched' && sortKey !== 'recently-logged';

  const activeFilters = countActiveFilters(filters);
  const totalEntries = entries?.length ?? 0;
  const filteredOut = totalEntries > 0 && sorted.length === 0;

  return (
    <Screen padded={false} edges={['top']}>
      {totalEntries > 0 ? (
        <FilterBar
          filters={
            <>
              <MediaTypeChips
                options={MEDIA_OPTIONS}
                value={filters.mediaType}
                onChange={(mediaType) => setFilters((f) => ({ ...f, mediaType }))}
              />
              <GenreChip
                mediaType={filters.mediaType === 'all' ? null : filters.mediaType}
                value={filters.genreId}
                onChange={(genreId) => setFilters((f) => ({ ...f, genreId }))}
                disabled={filters.mediaType === 'all'}
                disabledReason="Pick Movies or Shows to filter by genre."
              />
              <DecadeChip
                value={filters.decade}
                decades={decades}
                onChange={(decade) => setFilters((f) => ({ ...f, decade }))}
                disabled={decades.length === 0}
                disabledReason="No release years in your library yet."
              />
            </>
          }
          sort={<SortChip value={sortKey} options={SORT_OPTIONS} onChange={setSortKey} />}
        />
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.type === 'header' ? `h:${r.key}` : `e:${r.entry.id}`)}
        contentContainerStyle={{
          paddingBottom: t.spacing.xxxl * 2,
        }}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View
              style={{
                backgroundColor: t.colors.bg.surface,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.sm,
              }}
            >
              <Text
                variant="label"
                tone="muted"
                style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
              >
                {item.label}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                if (item.entry.mediaType === 'tv_season') {
                  router.push(`/tv/${item.entry.tmdbId}`);
                } else {
                  router.push(`/movie/${item.entry.tmdbId}`);
                }
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
              })}
            >
              <EntryRow entry={item.entry} showMonth={showMonthInDay} />
            </Pressable>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.text.muted}
          />
        }
        ListEmptyComponent={
          showLoadError && loadError ? (
            <View
              style={[
                styles.empty,
                { marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.xl },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={t.spacing.xxxl}
                color={t.colors.text.muted}
              />
              <Text variant="titleLg" style={{ marginTop: t.spacing.md }}>
                Diary unavailable
              </Text>
              <Text
                variant="body"
                tone="muted"
                style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
              >
                {loadError} Try again in a moment.
              </Text>
              <Pressable
                onPress={() => {
                  setShowLoadError(false);
                  load().catch(() => {});
                }}
                style={({ pressed }) => ({
                  marginTop: t.spacing.md,
                  paddingHorizontal: t.spacing.lg,
                  paddingVertical: t.spacing.sm,
                  borderRadius: t.radii.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: t.colors.border.strong,
                  opacity: pressed ? t.opacity.pressed : 1,
                })}
              >
                <Text variant="bodyStrong">Retry</Text>
              </Pressable>
            </View>
          ) : entries == null ? (
            <DiaryListSkeleton />
          ) : filteredOut ? (
            <View
              style={[
                styles.empty,
                { marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.xl },
              ]}
            >
              <Ionicons
                name="funnel-outline"
                size={t.spacing.xxxl}
                color={t.colors.text.muted}
              />
              <Text variant="titleLg" style={{ marginTop: t.spacing.md }}>
                No matches
              </Text>
              <Text
                variant="body"
                tone="muted"
                style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
              >
                {activeFilters > 0
                  ? 'Try clearing a filter to widen the view.'
                  : 'Nothing logged with these constraints yet.'}
              </Text>
              {activeFilters > 0 ? (
                <Pressable
                  onPress={() => setFilters(EMPTY_FILTERS)}
                  style={({ pressed }) => ({
                    marginTop: t.spacing.md,
                    paddingHorizontal: t.spacing.lg,
                    paddingVertical: t.spacing.sm,
                    borderRadius: t.radii.md,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: t.colors.border.strong,
                    opacity: pressed ? t.opacity.pressed : 1,
                  })}
                >
                  <Text variant="bodyStrong">Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.empty,
                { marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.xl },
              ]}
            >
              <Ionicons name="film-outline" size={t.spacing.xxxl} color={t.colors.text.muted} />
              <Text variant="titleLg" style={{ marginTop: t.spacing.md }}>
                No entries yet
              </Text>
              <Text variant="body" tone="muted" style={{ marginTop: t.spacing.xs, textAlign: 'center' }}>
                Log a film you watched recently, or bring your history over from Letterboxd.
              </Text>
              <Button
                title="Import from Letterboxd"
                variant="ghost"
                onPress={() => router.push('/import-letterboxd')}
                style={{ marginTop: t.spacing.lg }}
              />
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  skeletonContent: {
    flex: 1,
    minWidth: 0,
  },
});

function DiaryListSkeleton({ count = 7 }: { count?: number }) {
  const t = useTheme();
  return (
    <View style={{ paddingTop: t.spacing.md }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonRow,
            {
              paddingVertical: t.spacing.md,
              paddingHorizontal: t.spacing.lg,
              borderBottomColor: t.colors.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Skeleton
            width={SKELETON_DAY_SIZE}
            height={SKELETON_DAY_SIZE}
            borderRadius={t.radii.md}
          />
          <SkeletonPoster size="sm" style={{ marginLeft: t.spacing.md }} />
          <View style={[styles.skeletonContent, { marginLeft: t.spacing.md }]}>
            <SkeletonText variant="titleMd" width={index % 3 === 0 ? '56%' : '76%'} />
            <View style={{ marginTop: t.spacing.xs }}>
              <SkeletonText variant="caption" width={index % 2 === 0 ? '30%' : '44%'} />
            </View>
            <View style={{ marginTop: t.spacing.xs }}>
              <SkeletonText variant="caption" width="34%" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
