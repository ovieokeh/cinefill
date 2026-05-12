import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Chip } from './Chip';

export type MediaTypeOption<V extends string> = { value: V; label: string };

/**
 * Radio-group row of media-type chips. Generic over the value set so the same
 * primitive serves Search (`all | movie | tv | person`) and Diary/Watchlist
 * (`all | movie | tv`).
 */
export function MediaTypeChips<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V;
  options: MediaTypeOption<V>[];
  onChange: (next: V) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, { gap: t.spacing.sm }]}>
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={opt.value === value}
          onPress={() => onChange(opt.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: opt.value === value }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
