import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Text, WatchlistRow } from '@/components';
import { useTheme } from '@/theme';
import { listWatchlist, type WatchlistItem } from '@/db/watchlist';
import { listAllCache, type MediaCacheRow } from '@/db/media_cache';
import { getGenres, type GenreRef } from '@/lib/tmdb';

type GenreMap = Map<number, string>;

export default function WatchlistScreen() {
  const t = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [cache, setCache] = useState<MediaCacheRow[]>([]);
  const [genreMaps, setGenreMaps] = useState<{ movie: GenreMap; tv: GenreMap } | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <Screen padded={false}>
      <FlatList
        data={items ?? []}
        keyExtractor={(m) => String(m.tmdbId)}
        contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}
        renderItem={({ item }) => {
          const c = cacheByKey.get(`${item.mediaType}:${item.tmdbId}`);
          const map = genreMaps?.[item.mediaType];
          const genres = c && map
            ? c.genreIds
                .map((id) => map.get(id))
                .filter((n): n is string => typeof n === 'string')
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
              <WatchlistRow item={item} genres={genres} runtime={c?.runtime ?? null} />
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
          items == null ? null : (
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
                Search to find films and save them for later.
              </Text>
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
