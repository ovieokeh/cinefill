import { Image, ImageStyle } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { posterUrl } from '@/lib/tmdb';
import { Text } from './Text';

type Size = 'sm' | 'md' | 'lg';

const DIMENSIONS: Record<Size, { width: number; height: number; tmdbSize: 'w154' | 'w342' | 'w500' }> = {
  sm: { width: 48, height: 72, tmdbSize: 'w154' },
  md: { width: 72, height: 108, tmdbSize: 'w342' },
  lg: { width: 120, height: 180, tmdbSize: 'w342' },
};

export function PosterImage({
  posterPath,
  size = 'md',
  style,
}: {
  posterPath: string | null;
  size?: Size;
  style?: ImageStyle;
}) {
  const t = useTheme();
  const dim = DIMENSIONS[size];
  const url = posterUrl(posterPath, dim.tmdbSize);

  if (!url) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: dim.width,
            height: dim.height,
            backgroundColor: t.colors.bg.elevated,
            borderRadius: t.radii.sm,
            borderColor: t.colors.border.subtle,
          },
        ]}
      >
        <Text variant="caption" tone="muted">
          No poster
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={[
        {
          width: dim.width,
          height: dim.height,
          borderRadius: t.radii.sm,
          backgroundColor: t.colors.bg.elevated,
        },
        style,
      ]}
      contentFit="cover"
      transition={t.durations.fast}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
