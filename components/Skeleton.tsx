import { useEffect } from 'react';
import { View, StyleSheet, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme, type Tokens } from '@/theme';

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

const POSTER_DIMENSIONS = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
} as const;

type PosterSize = keyof typeof POSTER_DIMENSIONS;
type TypographyVariant = keyof Tokens['typography'];

const SHIMMER_DURATION_MS = 1200;

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: Props) {
  const t = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-50 + progress.value * 150}%` }],
  }));

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          backgroundColor: t.colors.bg.elevated,
          borderRadius: borderRadius ?? t.radii.md,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.sweep, sweepStyle]}>
        <LinearGradient
          colors={[
            t.colors.shimmer.highlightTransparent,
            t.colors.shimmer.highlight,
            t.colors.shimmer.highlightTransparent,
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonText({
  variant = 'body',
  width = '100%',
  style,
}: {
  variant?: TypographyVariant;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const lineHeight = t.typography[variant].lineHeight ?? t.typography.body.lineHeight ?? 16;
  return (
    <Skeleton
      width={width}
      height={lineHeight as number}
      borderRadius={t.radii.sm}
      style={style}
    />
  );
}

export function SkeletonPoster({
  size = 'md',
  style,
}: {
  size?: PosterSize;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const dim = POSTER_DIMENSIONS[size];
  return (
    <Skeleton
      width={dim.width}
      height={dim.height}
      borderRadius={t.radii.sm}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  sweep: { ...StyleSheet.absoluteFillObject, width: '50%' },
  gradient: { flex: 1 },
});
