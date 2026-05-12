import { ActivityIndicator, Pressable, StyleSheet, View, type AccessibilityState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { haptic } from '@/lib/haptics';
import { Text } from './Text';
import { useFilterHint } from './FilterBar';

type AccessibilityRole = 'button' | 'radio';

export type ChipProps = {
  label: string;
  /** Filled in accent.base when true; surface tone otherwise. */
  active?: boolean;
  /** Disables the underlying picker; shows a spinner in place of the label. */
  loading?: boolean;
  /**
   * Visually disables the chip. The chip stays mounted and tappable so that
   * pressing it can surface `disabledReason` via the FilterBar's hint banner.
   */
  disabled?: boolean;
  /**
   * Brief explanation shown via the FilterBar hint banner when a disabled chip
   * is pressed. If omitted, a disabled chip is fully inert.
   */
  disabledReason?: string;
  /** Leading Ionicon name; rendered before the label. */
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** When present, renders a trailing close-circle that fires this callback. */
  onClear?: () => void;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
};

export function Chip({
  label,
  active,
  loading,
  disabled,
  disabledReason,
  iconName,
  onPress,
  onClear,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
}: ChipProps) {
  const t = useTheme();
  const hint = useFilterHint();

  const enabled = !!onPress && !disabled && !loading;
  const explainable = !!disabled && !!disabledReason;
  const tappable = enabled || explainable;

  function handlePress() {
    if (loading) return;
    if (disabled) {
      if (disabledReason) {
        haptic.warning();
        hint.show(disabledReason);
      }
      return;
    }
    haptic.selection();
    onPress?.();
  }

  function handleClear() {
    haptic.light();
    onClear?.();
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handlePress}
        disabled={!tappable}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={
          accessibilityState ?? {
            selected: !!active,
            disabled: !!disabled,
          }
        }
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: active ? t.colors.accent.base : t.colors.bg.elevated,
            borderRadius: t.radii.pill,
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.xs,
            gap: t.spacing.xxs,
            opacity: disabled
              ? t.opacity.disabled
              : pressed && enabled
                ? t.opacity.pressed
                : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={t.colors.text.muted} size="small" />
        ) : (
          <>
            {iconName ? (
              <Ionicons
                name={iconName}
                size={t.spacing.md}
                color={active ? t.colors.accent.on : t.colors.text.secondary}
              />
            ) : null}
            <Text variant="caption" tone={active ? 'inverted' : 'secondary'}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
      {onClear && !disabled ? (
        <Pressable
          onPress={handleClear}
          hitSlop={t.spacing.xs}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label}`}
          style={({ pressed }) => ({
            marginLeft: t.spacing.xs,
            opacity: pressed ? t.opacity.pressed : 1,
          })}
        >
          <Ionicons name="close-circle" size={t.spacing.lg} color={t.colors.text.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
