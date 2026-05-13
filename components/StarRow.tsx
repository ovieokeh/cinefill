import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

/**
 * Read-only 5-star row that supports half-stars. Used by the TasteCard's Style
 * cell and the metric-detail sheet. Mirrors `StarRating`'s half-fill logic but
 * stays decoupled so it can adopt the card's amber tint instead of the global
 * star colour.
 */
export function StarRow({
  value,
  size,
  color,
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const t = useTheme();
  const iconSize = size ?? t.spacing.sm;
  const tint = color ?? t.colors.accent.base;
  return (
    <View
      style={{ flexDirection: 'row', gap: t.spacing.xxs }}
      accessibilityRole="image"
      accessibilityLabel={`${value} of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = Math.max(0, Math.min(1, value - i));
        const name: 'star' | 'star-half' | 'star-outline' =
          filled >= 0.75 ? 'star' : filled >= 0.25 ? 'star-half' : 'star-outline';
        return (
          <Ionicons
            key={i}
            name={name}
            size={iconSize}
            color={filled > 0 ? tint : t.colors.text.muted}
          />
        );
      })}
    </View>
  );
}
