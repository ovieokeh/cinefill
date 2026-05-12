import { FlatList, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { PosterImage } from './PosterImage';
import { SkeletonPoster, SkeletonText } from './Skeleton';
import { Text } from './Text';
import { FilmBadge } from './FilmBadge';

const ITEM_WIDTH = 96;

export type MoviePosterItem = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  /** Optional contextual line: a character name, a job, etc. */
  role?: string;
};

export function MoviePosterRow({ items }: { items: MoviePosterItem[] }) {
  const t = useTheme();
  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={(item, idx) => `${item.mediaType}-${item.tmdbId}-${item.role ?? ''}-${idx}`}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: t.spacing.lg }}
      ItemSeparatorComponent={() => <View style={{ width: t.spacing.md }} />}
      renderItem={({ item }) => <Item item={item} />}
    />
  );
}

function Item({ item }: { item: MoviePosterItem }) {
  const t = useTheme();
  const router = useRouter();
  const metaPieces = [item.year, item.role].filter((x): x is string => !!x && x.length > 0);
  const metaLine = metaPieces.join(' · ');

  const body = (
    <View style={[styles.item, { width: ITEM_WIDTH }]}>
      <View>
        <PosterImage posterPath={item.posterPath} size="md" />
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
        <FilmBadge
          tmdbId={item.tmdbId}
          mediaType={item.mediaType}
          style={[styles.filmBadge, { top: t.spacing.xs, right: t.spacing.xs }]}
        />
      </View>
      <Text variant="caption" numberOfLines={1} style={{ marginTop: t.spacing.xs }}>
        {item.title}
      </Text>
      {metaLine ? (
        <Text
          variant="caption"
          tone="muted"
          numberOfLines={1}
          style={{ marginTop: t.spacing.xxs }}
        >
          {metaLine}
        </Text>
      ) : null}
    </View>
  );

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
      style={({ pressed }) => ({ opacity: pressed ? t.opacity.pressed : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function MoviePosterRowSkeleton({ count = 6 }: { count?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: t.spacing.lg,
        flexDirection: 'row',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.item,
            { width: ITEM_WIDTH, marginRight: i === count - 1 ? 0 : t.spacing.md },
          ]}
        >
          <SkeletonPoster size="md" />
          <View style={{ marginTop: t.spacing.xs, width: '100%' }}>
            <SkeletonText variant="caption" width="90%" />
          </View>
          <View style={{ marginTop: t.spacing.xxs, width: '100%' }}>
            <SkeletonText variant="caption" width="50%" />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'flex-start' },
  tvChip: { position: 'absolute' },
  filmBadge: { position: 'absolute' },
});
