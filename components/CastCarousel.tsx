import { FlatList, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { profileUrl } from '@/lib/tmdb';
import type { MovieDetails } from '@/lib/tmdb';
import { Text } from './Text';

const AVATAR_SIZE = 64;
const ITEM_WIDTH = 80;

type CastMember = MovieDetails['cast'][number];

export function CastCarousel({ cast }: { cast: MovieDetails['cast'] }) {
  const t = useTheme();
  return (
    <FlatList
      data={cast}
      horizontal
      keyExtractor={(c) => String(c.id)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: t.spacing.lg }}
      ItemSeparatorComponent={() => <View style={{ width: t.spacing.md }} />}
      renderItem={({ item }) => <CastItem item={item} />}
    />
  );
}

function CastItem({ item }: { item: CastMember }) {
  const t = useTheme();
  const url = profileUrl(item.profilePath, 'w185');
  return (
    <View style={[styles.item, { width: ITEM_WIDTH }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[
            styles.avatar,
            { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: t.radii.pill, backgroundColor: t.colors.bg.elevated },
          ]}
          contentFit="cover"
          transition={t.durations.fast}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.avatarFallback,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: t.radii.pill,
              backgroundColor: t.colors.bg.elevated,
              borderColor: t.colors.border.subtle,
            },
          ]}
        >
          <Text variant="label" tone="muted">
            {item.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')}
          </Text>
        </View>
      )}
      <Text
        variant="caption"
        numberOfLines={2}
        style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
      >
        {item.name}
      </Text>
      {item.character ? (
        <Text
          variant="caption"
          tone="muted"
          numberOfLines={1}
          style={{ marginTop: t.spacing.xxs, textAlign: 'center' }}
        >
          {item.character}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'center' },
  avatar: {},
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
