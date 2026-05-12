import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Screen, Text, Input, PosterImage } from '@/components';
import { useTheme } from '@/theme';
import { searchMulti, type MultiSearchResult } from '@/lib/tmdb';

export default function SearchScreen() {
  const t = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MultiSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchError(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await searchMulti(q, controller.signal);
        if (!controller.signal.aborted) setResults(r);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setSearchError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function pick(item: MultiSearchResult) {
    if (item.mediaType === 'movie') {
      router.replace({
        pathname: '/movie/[tmdbId]',
        params: {
          tmdbId: String(item.tmdbId),
          title: item.title,
          year: item.year ?? '',
          posterPath: item.posterPath ?? '',
        },
      });
    } else {
      router.replace({
        pathname: '/tv/[id]',
        params: {
          id: String(item.tmdbId),
          title: item.title,
          year: item.year ?? '',
          posterPath: item.posterPath ?? '',
        },
      });
    }
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md }}>
        <Input
          label="Find a film or show"
          placeholder="Search by title…"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchError ? (
          <Text variant="caption" tone="danger" style={{ marginTop: t.spacing.sm }}>
            {searchError}
          </Text>
        ) : null}
      </View>

      {searching && results.length === 0 ? (
        <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
          <ActivityIndicator color={t.colors.text.muted} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(m) => `${m.mediaType}-${m.tmdbId}`}
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.md,
            paddingBottom: t.spacing.xxxl,
          }}
          ItemSeparatorComponent={() => <View style={{ height: t.spacing.sm }} />}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => pick(item)}
              style={({ pressed }) => [
                styles.resultRow,
                {
                  backgroundColor: pressed ? t.colors.bg.elevated : t.colors.bg.surface,
                  borderRadius: t.radii.md,
                  padding: t.spacing.md,
                },
              ]}
            >
              <View>
                <PosterImage posterPath={item.posterPath} size="sm" />
                {item.mediaType === 'tv' ? (
                  <View
                    style={[
                      styles.tvChip,
                      {
                        top: t.spacing.xs,
                        left: t.spacing.xs,
                        backgroundColor: t.colors.bg.elevated,
                        borderRadius: t.radii.sm,
                        paddingHorizontal: t.spacing.xs,
                        paddingVertical: t.spacing.xxs,
                      },
                    ]}
                  >
                    <Text variant="caption" tone="primary" style={{ letterSpacing: t.tracking.badge }}>
                      TV
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.resultBody, { marginLeft: t.spacing.md }]}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {item.title}
                </Text>
                {item.year ? (
                  <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
                    {item.year}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            query.trim() && !searching ? (
              <Text
                variant="body"
                tone="muted"
                style={{ textAlign: 'center', marginTop: t.spacing.xl }}
              >
                No matches.
              </Text>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultBody: { flex: 1, minWidth: 0 },
  tvChip: { position: 'absolute' },
});
