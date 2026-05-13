import { View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Subtle track with an amber fill from 0 to `ratio`. Use for "amount" metrics
 * (runtime, loyalty share) where direction is intuitive — more fill = more X.
 *
 * `size="lg"` renders a taller track, suitable for the metric-detail sheet.
 */
export function BarFill({
  ratio,
  size = 'sm',
}: {
  ratio: number;
  size?: 'sm' | 'lg';
}) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const trackHeight = size === 'lg' ? t.spacing.xs : t.spacing.xxs;
  return (
    <View
      style={{
        height: trackHeight,
        backgroundColor: t.colors.border.subtle,
        borderRadius: t.radii.pill,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.round(clamped * 100)}%`,
          height: '100%',
          backgroundColor: t.colors.accent.base,
          borderRadius: t.radii.pill,
        }}
      />
    </View>
  );
}
