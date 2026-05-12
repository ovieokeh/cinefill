import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export function ErrorBlock({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        marginTop: t.spacing.xxxl,
        marginHorizontal: t.spacing.lg,
        padding: t.spacing.lg,
        borderRadius: t.radii.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.border.subtle,
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
        {message}
      </Text>
      <Button
        title="Retry"
        variant="ghost"
        onPress={onRetry}
        style={{ marginTop: t.spacing.md }}
      />
    </View>
  );
}
