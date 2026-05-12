import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  Screen,
  Text,
  Input,
  PosterImage,
  MoviePosterRow,
  ActionSheet,
  type ActionItem,
  type ActionSheetHandle,
} from '@/components';
import { useTheme } from '@/theme';
import {
  discoverByGenre,
  getGenres,
  getPopularMovies,
  getPopularPeople,
  getPopularTv,
  getTrending,
  posterUrl,
  profileUrl,
  searchByType,
  searchMulti,
  type DiscoverItem,
  type GenreRef,
  type PersonSearchResult,
  type SearchResult,
} from '@/lib/tmdb';

type MediaFilter = 'all' | 'movie' | 'tv' | 'person';

const MEDIA_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
  { value: 'person', label: 'People' },
];

export default function SearchTabScreen() {
  const t = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{
    mediaType?: string;
    genreId?: string;
    genreName?: string;
  }>();

  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaFilter>('all');
  const [genre, setGenre] = useState<GenreRef | null>(null);

  // Apply filters from URL params when they change (e.g., from a genre chip tap).
  const lastAppliedRef = useRef<string>('');
  useEffect(() => {
    const key = `${params.mediaType ?? ''}|${params.genreId ?? ''}|${params.genreName ?? ''}`;
    if (key === '||' || key === lastAppliedRef.current) return;
    lastAppliedRef.current = key;
    if (params.mediaType === 'movie' || params.mediaType === 'tv' || params.mediaType === 'person' || params.mediaType === 'all') {
      setMediaType(params.mediaType);
    }
    if (params.genreId && params.genreName) {
      const gid = Number(params.genreId);
      if (Number.isFinite(gid)) setGenre({ id: gid, name: params.genreName });
    }
    setQuery('');
  }, [params.mediaType, params.genreId, params.genreName]);

  // Clear genre when media type can't hold one.
  useEffect(() => {
    if (mediaType !== 'movie' && mediaType !== 'tv' && genre) {
      setGenre(null);
    }
  }, [mediaType, genre]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  return (
    <Screen padded={false}>
      <View
        style={{
          paddingHorizontal: t.spacing.lg,
          paddingTop: t.spacing.md,
          paddingBottom: t.spacing.md,
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        <Input
          placeholder="Search films, shows, people…"
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={{ marginTop: t.spacing.md }}>
          <MediaTypeRow value={mediaType} onChange={setMediaType} />
        </View>
        {mediaType === 'movie' || mediaType === 'tv' ? (
          <View style={{ marginTop: t.spacing.sm }}>
            <GenrePickerChip
              mediaType={mediaType}
              value={genre}
              onChange={setGenre}
            />
          </View>
        ) : null}
      </View>

      {hasQuery ? (
        <ResultsBody
          query={trimmedQuery}
          mediaType={mediaType}
          genre={genre}
          onPick={(item) => navigateToItem(router, item)}
        />
      ) : mediaType === 'all' ? (
        <DiscoveryFeed router={router} />
      ) : mediaType === 'person' ? (
        <PopularPeopleList router={router} />
      ) : genre ? (
        <DiscoverGrid mediaType={mediaType} genreId={genre.id} router={router} />
      ) : (
        <PopularGrid mediaType={mediaType} router={router} />
      )}
    </Screen>
  );
}

function MediaTypeRow({
  value,
  onChange,
}: {
  value: MediaFilter;
  onChange: (next: MediaFilter) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.mediaRow, { gap: t.spacing.sm }]}>
      {MEDIA_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? t.colors.accent.base : t.colors.bg.elevated,
                borderRadius: t.radii.pill,
                paddingHorizontal: t.spacing.md,
                paddingVertical: t.spacing.xs,
                opacity: pressed ? t.opacity.pressed : 1,
              },
            ]}
          >
            <Text variant="caption" tone={active ? 'inverted' : 'secondary'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GenrePickerChip({
  mediaType,
  value,
  onChange,
}: {
  mediaType: 'movie' | 'tv';
  value: GenreRef | null;
  onChange: (next: GenreRef | null) => void;
}) {
  const t = useTheme();
  const sheetRef = useRef<ActionSheetHandle>(null);
  const [genres, setGenres] = useState<GenreRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGenres([]);
    (async () => {
      try {
        const list = await getGenres(mediaType);
        if (!cancelled) setGenres(list);
      } catch {
        // Silent: chip just won't open anything until reload.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaType]);

  function openPicker() {
    if (genres.length === 0) return;
    const actions: ActionItem[] = genres.map((g) => ({
      label: g.name,
      onPress: () => onChange(g),
    }));
    sheetRef.current?.present(actions);
  }

  return (
    <>
      <View style={styles.chipRow}>
        <Pressable
          onPress={openPicker}
          disabled={loading || genres.length === 0}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: t.colors.bg.elevated,
              borderRadius: t.radii.pill,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.xs,
              opacity: pressed ? t.opacity.pressed : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={t.colors.text.muted} size="small" />
          ) : (
            <Text variant="caption" tone="secondary">
              {value ? value.name : 'Any genre'}
            </Text>
          )}
        </Pressable>
        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={t.spacing.xs}
            style={({ pressed }) => ({
              marginLeft: t.spacing.xs,
              opacity: pressed ? t.opacity.pressed : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Clear genre"
          >
            <Ionicons name="close-circle" size={t.spacing.lg} color={t.colors.text.muted} />
          </Pressable>
        ) : null}
      </View>
      <ActionSheet ref={sheetRef} />
    </>
  );
}

function navigateToItem(
  router: ReturnType<typeof useRouter>,
  item: SearchResult | DiscoverItem,
) {
  if ('mediaType' in item && item.mediaType === 'person') {
    router.push(`/person/${item.tmdbId}`);
    return;
  }
  // movie / tv
  if (item.mediaType === 'movie') {
    router.push({
      pathname: '/movie/[tmdbId]',
      params: {
        tmdbId: String(item.tmdbId),
        title: 'title' in item ? item.title : '',
        year: item.year ?? '',
        posterPath: item.posterPath ?? '',
      },
    });
  } else {
    router.push({
      pathname: '/tv/[id]',
      params: {
        id: String(item.tmdbId),
        title: 'title' in item ? item.title : '',
        year: item.year ?? '',
        posterPath: item.posterPath ?? '',
      },
    });
  }
}

function ResultsBody({
  query,
  mediaType,
  genre,
  onPick,
}: {
  query: string;
  mediaType: MediaFilter;
  genre: GenreRef | null;
  onPick: (item: SearchResult) => void;
}) {
  const t = useTheme();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        let items: SearchResult[];
        if (mediaType === 'all') {
          items = await searchMulti(query, controller.signal);
        } else {
          const page = await searchByType(query, mediaType, 1, controller.signal);
          items = page.results;
        }
        if (controller.signal.aborted) return;
        if (genre && (mediaType === 'movie' || mediaType === 'tv')) {
          items = items.filter((r) => {
            if (r.mediaType === 'movie' || r.mediaType === 'tv') {
              return r.genreIds.includes(genre.id);
            }
            return false;
          });
        }
        setResults(items);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, mediaType, genre]);

  if (loading && results.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <ActivityIndicator color={t.colors.text.muted} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      </View>
    );
  }
  if (results.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <Text variant="body" tone="muted">
          No matches.
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={results}
      keyExtractor={(r) => `${r.mediaType}-${r.tmdbId}`}
      contentContainerStyle={{
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.md,
        paddingBottom: t.spacing.xxxl,
      }}
      ItemSeparatorComponent={() => <View style={{ height: t.spacing.sm }} />}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <SearchResultRow item={item} onPress={() => onPick(item)} />}
    />
  );
}

function SearchResultRow({
  item,
  onPress,
}: {
  item: SearchResult;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        {
          backgroundColor: pressed ? t.colors.bg.elevated : t.colors.bg.surface,
          borderRadius: t.radii.md,
          padding: t.spacing.md,
        },
      ]}
    >
      {item.mediaType === 'person' ? (
        <PersonAvatar profilePath={item.profilePath} />
      ) : (
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
      )}
      <View style={[styles.resultBody, { marginLeft: t.spacing.md }]}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {item.mediaType === 'person' ? item.name : item.title}
        </Text>
        {item.mediaType === 'person' ? (
          item.knownFor ? (
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
              {item.knownFor}
            </Text>
          ) : null
        ) : item.year ? (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            {item.year}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const AVATAR_SIZE = 48;

function PersonAvatar({ profilePath }: { profilePath: string | null }) {
  const t = useTheme();
  const url = profileUrl(profilePath, 'w185');
  if (!url) {
    return (
      <View
        style={[
          styles.avatarFallback,
          {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: t.radii.pill,
            backgroundColor: t.colors.bg.elevated,
            borderColor: t.colors.border.subtle,
          },
        ]}
      />
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={[
        {
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: t.radii.pill,
          backgroundColor: t.colors.bg.elevated,
        },
      ]}
      contentFit="cover"
      transition={t.durations.fast}
    />
  );
}

function DiscoveryFeed({ router }: { router: ReturnType<typeof useRouter> }) {
  const t = useTheme();
  const [trending, setTrending] = useState<DiscoverItem[] | null>(null);
  const [popularMovies, setPopularMovies] = useState<DiscoverItem[] | null>(null);
  const [popularTv, setPopularTv] = useState<DiscoverItem[] | null>(null);
  const [trendingErr, setTrendingErr] = useState<string | null>(null);
  const [moviesErr, setMoviesErr] = useState<string | null>(null);
  const [tvErr, setTvErr] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const controllers: AbortController[] = [];
      const run = async <T,>(
        fn: (signal: AbortSignal) => Promise<T>,
        setData: (v: T) => void,
        setErr: (e: string | null) => void,
      ) => {
        const c = new AbortController();
        controllers.push(c);
        try {
          const data = await fn(c.signal);
          if (!cancelled) {
            setData(data);
            setErr(null);
          }
        } catch (e) {
          if (cancelled || c.signal.aborted) return;
          setErr(e instanceof Error ? e.message : 'Failed to load');
        }
      };
      run((s) => getTrending('all', s), setTrending, setTrendingErr);
      run((s) => getPopularMovies(s), setPopularMovies, setMoviesErr);
      run((s) => getPopularTv(s), setPopularTv, setTvErr);
      return () => {
        cancelled = true;
        for (const c of controllers) c.abort();
      };
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
      <DiscoverySection title="Trending today" items={trending} error={trendingErr} />
      <DiscoverySection title="Popular movies" items={popularMovies} error={moviesErr} />
      <DiscoverySection title="Popular shows" items={popularTv} error={tvErr} />
    </ScrollView>
  );
}

function DiscoverySection({
  title,
  items,
  error,
}: {
  title: string;
  items: DiscoverItem[] | null;
  error: string | null;
}) {
  const t = useTheme();
  return (
    <>
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
      {error ? (
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing.lg }}>
          Couldn&apos;t load.
        </Text>
      ) : items == null ? (
        <View style={[styles.centered, { paddingVertical: t.spacing.lg }]}>
          <ActivityIndicator color={t.colors.text.muted} size="small" />
        </View>
      ) : items.length === 0 ? (
        <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing.lg }}>
          Nothing today.
        </Text>
      ) : (
        <MoviePosterRow items={items} />
      )}
    </>
  );
}

function PopularPeopleList({ router }: { router: ReturnType<typeof useRouter> }) {
  const t = useTheme();
  const [people, setPeople] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const c = new AbortController();
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const list = await getPopularPeople(c.signal);
          if (!cancelled) setPeople(list);
        } catch (e) {
          if (cancelled || c.signal.aborted) return;
          setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
        c.abort();
      };
    }, []),
  );

  if (loading && people.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <ActivityIndicator color={t.colors.text.muted} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={people}
      keyExtractor={(p) => String(p.tmdbId)}
      contentContainerStyle={{
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.md,
        paddingBottom: t.spacing.xxxl,
      }}
      ItemSeparatorComponent={() => <View style={{ height: t.spacing.sm }} />}
      renderItem={({ item }) => (
        <SearchResultRow item={item} onPress={() => router.push(`/person/${item.tmdbId}`)} />
      )}
    />
  );
}

function PopularGrid({
  mediaType,
  router,
}: {
  mediaType: 'movie' | 'tv';
  router: ReturnType<typeof useRouter>;
}) {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // retryKey is read so the linter is satisfied; bumping it re-runs this effect.
      void retryKey;
      let cancelled = false;
      const c = new AbortController();
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const fn = mediaType === 'movie' ? getPopularMovies : getPopularTv;
          const data = await fn(c.signal);
          if (!cancelled) setItems(data);
        } catch (e) {
          if (cancelled || c.signal.aborted) return;
          setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
        c.abort();
      };
    }, [mediaType, retryKey]),
  );

  return (
    <GridView
      items={items}
      loading={loading}
      error={error}
      onRetry={() => setRetryKey((k) => k + 1)}
      router={router}
    />
  );
}

function DiscoverGrid({
  mediaType,
  genreId,
  router,
}: {
  mediaType: 'movie' | 'tv';
  genreId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (n: number) => {
      controllerRef.current?.abort();
      const c = new AbortController();
      controllerRef.current = c;
      setLoading(true);
      if (n === 1) setError(null);
      try {
        const data = await discoverByGenre(mediaType, genreId, n, c.signal);
        if (c.signal.aborted) return;
        setTotalPages(data.totalPages);
        setItems((prev) => (n === 1 ? data.results : [...prev, ...data.results]));
        setPage(data.page);
      } catch (e) {
        if (c.signal.aborted) return;
        if (n === 1) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    },
    [mediaType, genreId],
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotalPages(1);
    loadPage(1);
    return () => controllerRef.current?.abort();
  }, [loadPage, retryKey]);

  const onEndReached = useCallback(() => {
    if (loading || page === 0 || page >= totalPages) return;
    loadPage(page + 1);
  }, [loading, page, totalPages, loadPage]);

  return (
    <GridView
      items={items}
      loading={loading}
      error={error}
      onRetry={() => setRetryKey((k) => k + 1)}
      router={router}
      onEndReached={onEndReached}
    />
  );
}

function GridView({
  items,
  loading,
  error,
  onRetry,
  router,
  onEndReached,
}: {
  items: DiscoverItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  router: ReturnType<typeof useRouter>;
  onEndReached?: () => void;
}) {
  const t = useTheme();
  if (error && items.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <Text variant="bodyStrong">Couldn&apos;t load</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
          {error}
        </Text>
        <Pressable
          onPress={onRetry}
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
    );
  }
  if (loading && items.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
        <ActivityIndicator color={t.colors.text.muted} />
      </View>
    );
  }
  return (
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
      renderItem={({ item }) => <GridCard item={item} onPress={() => navigateToItem(router, item)} />}
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
  );
}

function GridCard({ item, onPress }: { item: DiscoverItem; onPress: () => void }) {
  const t = useTheme();
  const poster = posterUrl(item.posterPath, 'w342');
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
            { borderRadius: t.radii.sm, backgroundColor: t.colors.bg.elevated },
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultBody: { flex: 1, minWidth: 0 },
  tvChip: { position: 'absolute' },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: { flex: 1, minWidth: 0 },
  poster: { width: '100%', aspectRatio: 2 / 3 },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
