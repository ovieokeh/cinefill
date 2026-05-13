import { View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Slider-style indicator for ordinal data. Renders a subtle track with an amber
 * dot at the position. Reads as "you are here on a continuum," which is far less
 * ambiguous than discrete dots for scales like era / recency / reach.
 *
 * Pass `ratio` in [0, 1]; pass `null` to render the track without a marker
 * (used for unknown / not-enough-data states).
 *
 * Use `size="lg"` to render a taller track + bigger dot, suitable for the
 * metric-detail bottom sheet where the scale gets its own row and axis labels.
 */
export function PositionScale({
  ratio,
  size = 'sm',
}: {
  ratio: number | null;
  size?: 'sm' | 'lg';
}) {
  const t = useTheme();
  const isLg = size === 'lg';
  const trackHeight = isLg ? t.spacing.xs : t.spacing.xxs;
  const dotSize = isLg ? t.spacing.md : t.spacing.sm;
  const dotOffset = isLg ? t.spacing.sm : t.spacing.xs;

  return (
    <View
      style={{
        height: trackHeight,
        backgroundColor: t.colors.border.subtle,
        borderRadius: t.radii.pill,
        justifyContent: 'center',
      }}
    >
      {ratio == null ? null : (
        <View
          style={{
            position: 'absolute',
            left: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`,
            marginLeft: -dotOffset,
            width: dotSize,
            height: dotSize,
            borderRadius: t.radii.pill,
            backgroundColor: t.colors.accent.base,
          }}
        />
      )}
    </View>
  );
}
