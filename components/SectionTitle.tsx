import { useTheme } from '@/theme';
import { Text } from './Text';

export function SectionTitle({ title }: { title: string }) {
  const t = useTheme();
  return (
    <Text
      variant="label"
      tone="muted"
      accessibilityRole="header"
      style={{
        marginTop: t.spacing.xxxl,
        marginBottom: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: t.tracking.label,
      }}
    >
      {title}
    </Text>
  );
}
