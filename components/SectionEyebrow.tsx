import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

/**
 * Magazine-style numbered section header. Renders:
 *
 *   01 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  RATINGS
 *
 * Used across the You tab to give the page a chaptered rhythm.
 */
export function SectionEyebrow({
  number,
  title,
}: {
  /** Two-digit chapter number like "01". Omit for headers that aren't part of a numbered sequence. */
  number?: string;
  title: string;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="header"
      style={[
        styles.row,
        {
          marginTop: t.spacing.xxxl,
          marginBottom: t.spacing.lg,
          paddingHorizontal: t.spacing.lg,
          gap: t.spacing.md,
        },
      ]}
    >
      {number ? (
        <Text
          variant="titleLg"
          style={{
            color: t.colors.accent.base,
            opacity: t.opacity.disabled,
          }}
        >
          {number}
        </Text>
      ) : null}
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: t.colors.border.strong,
        }}
      />
      <Text
        variant="label"
        tone="secondary"
        style={{
          textTransform: 'uppercase',
          letterSpacing: t.tracking.label,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
