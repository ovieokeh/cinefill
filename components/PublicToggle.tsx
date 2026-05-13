import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export function PublicToggle({
  value,
  onValueChange,
  compact = false,
  style,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();

  return (
    <View
      onTouchStart={(event) => event.stopPropagation()}
      style={[
        compact ? styles.compactRow : styles.row,
        {
          borderRadius: t.radii.md,
          borderColor: t.colors.border.subtle,
          backgroundColor: compact ? t.colors.transparent : t.colors.bg.surface,
          paddingHorizontal: compact ? 0 : t.spacing.md,
          paddingVertical: compact ? 0 : t.spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.copy}>
        <Text variant={compact ? 'caption' : 'bodyStrong'}>Make public</Text>
        {compact ? null : (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            Show this on your public media page after sync.
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.colors.border.strong, true: t.colors.accent.base }}
        thumbColor={t.colors.text.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
});
