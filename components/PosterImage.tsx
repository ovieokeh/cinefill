import { Image, ImageStyle } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/tokens';
import { posterUrl } from '@/lib/tmdb';
import { getReviewImageMeta } from '@/lib/review-fixtures';
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
  const reviewMeta = getReviewImageMeta(posterPath);

  if (reviewMeta) {
    return (
      <View
        style={[
          styles.reviewPoster,
          {
            width: dim.width,
            height: dim.height,
            borderRadius: t.radii.sm,
            backgroundColor: reviewMeta.bg,
          },
          style,
        ]}
      >
        <View
          style={[
            styles.reviewAccent,
            {
              backgroundColor: reviewMeta.accent,
              opacity: size === 'sm' ? 0.72 : 0.82,
            },
          ]}
        />
        <Text
          variant={size === 'lg' ? 'label' : 'caption'}
          style={[
            styles.reviewEyebrow,
            {
              color: reviewMeta.accent,
            },
          ]}
          numberOfLines={1}
        >
          {reviewMeta.eyebrow}
        </Text>
        <Text
          variant={size === 'lg' ? 'titleMd' : 'caption'}
          style={[styles.reviewTitle, { color: reviewMeta.fg }]}
          numberOfLines={size === 'sm' ? 2 : 4}
        >
          {reviewMeta.title}
        </Text>
      </View>
    );
  }

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
  reviewPoster: {
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: spacing.sm,
  },
  reviewAccent: {
    position: 'absolute',
    bottom: -24,
    right: -18,
    width: '82%',
    height: '48%',
    transform: [{ rotate: '-12deg' }],
  },
  reviewEyebrow: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reviewTitle: {
    textTransform: 'uppercase',
  },
});
