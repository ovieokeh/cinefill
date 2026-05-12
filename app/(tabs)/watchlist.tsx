import { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, Text, WatchlistRow } from '@/components';
import { useTheme } from '@/theme';
import { listWatchlist, type WatchlistItem } from '@/db/watchlist';

export default function WatchlistScreen() {
  const t = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await listWatchlist();
    setItems(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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
        renderItem={({ item }) => (
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
            <WatchlistRow item={item} />
          </Pressable>
        )}
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
