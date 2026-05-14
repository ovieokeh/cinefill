import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Screen,
  Text,
  Button,
  WatchlistRow,
  FilterBar,
  MediaTypeChips,
  GenreChip,
  DecadeChip,
  SortChip,
  type MediaTypeOption,
  type SortOption,
} from '@/components';
import { useTheme } from '@/theme';
import { listWatchlist, type WatchlistItem } from '@/db/watchlist';
import { listAllCache, type MediaCacheRow } from '@/db/media_cache';
import { getGenres, type GenreRef } from '@/lib/tmdb';
import {
  applyFilters,
  applySort,
  countActiveFilters,
  EMPTY_FILTERS,
  type FilterAccessors,
  type ListFilters,
  type ListMediaType,
} from '@/lib/list-filters';

type GenreMap = Map<number, string>;

const MEDIA_OPTIONS: MediaTypeOption<ListMediaType>[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
];

type WatchlistSortKey = 'recently-added' | 'title-asc' | 'year-desc';

const SORT_OPTIONS: SortOption<WatchlistSortKey>[] = [
  { key: 'recently-added', label: 'Recently added' },
  { key: 'title-asc', label: 'Title A–Z' },
  { key: 'year-desc', label: 'Year (newest)' },
];

const SORT_COMPARATORS: Record<
  WatchlistSortKey,
  (a: WatchlistItem, b: WatchlistItem) => number
> = {
  'recently-added': (a, b) => b.addedAt - a.addedAt,
  'title-asc': (a, b) => a.title.localeCompare(b.title),
  'year-desc': (a, b) => Number(b.year ?? 0) - Number(a.year ?? 0) || b.addedAt - a.addedAt,
};

export default function WatchlistScreen() {
  const t = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [cache, setCache] = useState<MediaCacheRow[]>([]);
  const [genreMaps, setGenreMaps] = useState<{ movie: GenreMap; tv: GenreMap } | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<WatchlistSortKey>('recently-added');

  const load = useCallback(async () => {
    const [list, cs] = await Promise.all([listWatchlist(), listAllCache()]);
    setItems(list);
    setCache(cs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // One-shot genre catalogue load — genre IDs change rarely enough to keep in memory.
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
        // Silent — rows just won't show genre names.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cacheByKey = useMemo(
    () => new Map(cache.map((c) => [`${c.mediaType}:${c.tmdbId}`, c])),
    [cache],
  );

  const accessors: FilterAccessors<WatchlistItem> = useMemo(
    () => ({
      getMediaType: (it) => it.mediaType,
      getYear: (it) => it.year,
      getGenreIds: (it) => {
        const c = cacheByKey.get(`${it.mediaType}:${it.tmdbId}`);
        return c?.genreIds ?? null;
      },
    }),
    [cacheByKey],
  );

  const decades = useMemo(() => {
    const set = new Set<number>();
    for (const it of items ?? []) {
      if (!it.year) continue;
      const y = Number(it.year);
      if (Number.isFinite(y)) set.add(Math.floor(y / 10) * 10);
    }
    return [...set].sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(
    () => applyFilters(items ?? [], filters, accessors),
    [items, filters, accessors],
  );

  const sorted = useMemo(
    () => applySort(filtered, sortKey, SORT_COMPARATORS),
    [filtered, sortKey],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const activeFilters = countActiveFilters(filters);
  const totalItems = items?.length ?? 0;
  const filteredOut = totalItems > 0 && sorted.length === 0;

  return (
    <Screen padded={false} edges={['top']}>
      {totalItems > 0 ? (
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
                disabledReason="No release years on your watchlist yet."
              />
            </>
          }
          sort={<SortChip value={sortKey} options={SORT_OPTIONS} onChange={setSortKey} />}
        />
      ) : null}
      <FlatList
        data={sorted}
        keyExtractor={(m) => `${m.mediaType}:${m.tmdbId}`}
        contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}
        renderItem={({ item }) => {
          const c = cacheByKey.get(`${item.mediaType}:${item.tmdbId}`);
          const map = genreMaps?.[item.mediaType];
          const genres = c && map
            ? c.genreIds.flatMap((id) => {
                const name = map.get(id);
                return name ? [{ id, name }] : [];
              })
            : undefined;
          return (
            <Pressable
              onPress={() => {
                if (item.mediaType === 'tv') {
                  router.push(`/tv/${item.tmdbId}`);
                } else {
                  router.push(`/movie/${item.tmdbId}`);
                }
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
              })}
            >
              <WatchlistRow
                item={item}
                genres={genres}
                runtime={c?.runtime ?? null}
              />
            </Pressable>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.text.muted}
          />
        }
        ListEmptyComponent={
          items == null ? null : filteredOut ? (
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
                  : 'Nothing saved with these constraints yet.'}
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
              <Ionicons
                name="bookmark-outline"
                size={t.spacing.xxxl}
                color={t.colors.text.muted}
              />
              <Text variant="titleLg" style={{ marginTop: t.spacing.md }}>
                No films saved yet
              </Text>
              <Text
                variant="body"
                tone="muted"
                style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
              >
                Search to find films and save them for later, or bring your watchlist over from Letterboxd.
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
});
