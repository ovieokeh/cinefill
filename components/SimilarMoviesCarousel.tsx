import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { MovieDetails } from '@/lib/tmdb';
import { PosterImage } from './PosterImage';
import { Text } from './Text';

const ITEM_WIDTH = 96;

type Item = MovieDetails['recommendations'][number];

export function SimilarMoviesCarousel({
  movies,
}: {
  movies: MovieDetails['recommendations'];
}) {
  const t = useTheme();
  return (
    <FlatList
      data={movies}
      horizontal
      keyExtractor={(m) => String(m.tmdbId)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: t.spacing.lg }}
      ItemSeparatorComponent={() => <View style={{ width: t.spacing.md }} />}
      renderItem={({ item }) => <SimilarItem item={item} />}
    />
  );
}

function SimilarItem({ item }: { item: Item }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/movie/[tmdbId]',
          params: {
            tmdbId: String(item.tmdbId),
            title: item.title,
            year: item.year ?? '',
            posterPath: item.posterPath ?? '',
          },
        })
      }
      style={({ pressed }) => [
        styles.item,
        { width: ITEM_WIDTH, opacity: pressed ? t.opacity.pressed : 1 },
      ]}
    >
      <PosterImage posterPath={item.posterPath} size="md" />
      <Text
        variant="caption"
        numberOfLines={2}
        style={{ marginTop: t.spacing.xs }}
      >
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
  item: { alignItems: 'flex-start' },
});
