import { Pressable, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const t = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          paddingHorizontal: t.spacing.lg,
          paddingVertical: t.spacing.md,
          borderRadius: t.radii.md,
          opacity: disabled ? t.opacity.disabled : pressed ? t.opacity.pressed : 1,
          backgroundColor: isPrimary
            ? pressed
              ? t.colors.accent.pressed
              : t.colors.accent.base
            : t.colors.transparent,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          borderColor: isPrimary ? t.colors.transparent : t.colors.border.strong,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? t.colors.accent.on : t.colors.text.primary} />
      ) : (
        <Text variant="bodyStrong" tone={isPrimary ? 'inverted' : 'primary'} style={styles.text}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    textAlign: 'center',
  },
});
