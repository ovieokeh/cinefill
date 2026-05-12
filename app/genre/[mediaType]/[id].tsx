import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Screen, Text, Button } from '@/components';
import { useTheme } from '@/theme';
import {
  discoverByGenre,
  posterUrl,
  type DiscoverItem,
} from '@/lib/tmdb';

export default function GenreScreen() {
  const t = useTheme();
  const router = useRouter();
  const { mediaType, id, name } = useLocalSearchParams<{
    mediaType: 'movie' | 'tv';
    id: string;
    name?: string;
  }>();
  const genreId = Number(id);
  const validParams = (mediaType === 'movie' || mediaType === 'tv') && Number.isFinite(genreId);
  const headerTitle = name ?? '';

  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (n: number) => {
      if (!validParams) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      if (n === 1) setError(null);
      try {
        const pageData = await discoverByGenre(mediaType, genreId, n, controller.signal);
        if (controller.signal.aborted) return;
        setTotalPages(pageData.totalPages);
        setItems((prev) => (n === 1 ? pageData.results : [...prev, ...pageData.results]));
        setPage(pageData.page);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        if (n === 1) {
          setError(e instanceof Error ? e.message : 'Failed to load');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [mediaType, genreId, validParams],
  );

  useEffect(() => {
    if (!validParams) return;
    setItems([]);
    setPage(0);
    setTotalPages(1);
    loadPage(1);
    return () => controllerRef.current?.abort();
  }, [validParams, loadPage, retryKey]);

  const onEndReached = useCallback(() => {
    if (loading) return;
    if (page === 0) return;
    if (page >= totalPages) return;
    loadPage(page + 1);
  }, [loading, page, totalPages, loadPage]);

  if (!validParams) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Genre not found</Text>
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

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <Screen padded={false}>
        {error && items.length === 0 ? (
          <View style={styles.centered}>
            <Text variant="bodyStrong">Couldn&apos;t load this genre</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs, textAlign: 'center' }}>
              {error}
            </Text>
            <Button
              title="Retry"
              variant="ghost"
              onPress={() => setRetryKey((k) => k + 1)}
              style={{ marginTop: t.spacing.lg }}
            />
          </View>
        ) : items.length === 0 && loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={t.colors.text.muted} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <Text variant="body" tone="muted">
              Nothing matched this genre.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            numColumns={2}
            keyExtractor={(it, idx) => `${it.mediaType}-${it.tmdbId}-${idx}`}
            contentContainerStyle={{
              paddingHorizontal: t.spacing.lg,
              paddingTop: t.spacing.md,
              paddingBottom: t.spacing.xxxl * 2,
              gap: t.spacing.lg,
            }}
            columnWrapperStyle={{ gap: t.spacing.md }}
            renderItem={({ item }) => <GridCard item={item} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loading && items.length > 0 ? (
                <View style={{ paddingVertical: t.spacing.lg }}>
                  <ActivityIndicator color={t.colors.text.muted} />
                </View>
              ) : null
            }
          />
        )}
      </Screen>
    </>
  );
}

function GridCard({ item }: { item: DiscoverItem }) {
  const t = useTheme();
  const router = useRouter();
  const poster = posterUrl(item.posterPath, 'w342');

  const onPress = () => {
    if (item.mediaType === 'movie') {
      router.push({
        pathname: '/movie/[tmdbId]',
        params: {
          tmdbId: String(item.tmdbId),
          title: item.title,
          year: item.year ?? '',
          posterPath: item.posterPath ?? '',
        },
      });
    } else {
      router.push({
        pathname: '/tv/[id]',
        params: {
          id: String(item.tmdbId),
          title: item.title,
          year: item.year ?? '',
          posterPath: item.posterPath ?? '',
        },
      });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? t.opacity.pressed : 1 }]}
    >
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={[
            styles.poster,
            {
              borderRadius: t.radii.sm,
              backgroundColor: t.colors.bg.elevated,
            },
          ]}
          contentFit="cover"
          transition={t.durations.fast}
        />
      ) : (
        <View
          style={[
            styles.poster,
            styles.posterFallback,
            {
              borderRadius: t.radii.sm,
              backgroundColor: t.colors.bg.elevated,
              borderColor: t.colors.border.subtle,
            },
          ]}
        >
          <Text variant="caption" tone="muted">
            No poster
          </Text>
        </View>
      )}
      <Text variant="bodyStrong" style={{ marginTop: t.spacing.sm }}>
        {item.title}
      </Text>
      {item.year ? (
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
          {item.year}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { flex: 1, minWidth: 0 },
  poster: { width: '100%', aspectRatio: 2 / 3 },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
