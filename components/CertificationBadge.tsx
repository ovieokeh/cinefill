import { View, StyleSheet } from 'react-native';
import { useTheme, Tokens } from '@/theme';
import { Text } from './Text';

type Props = {
  certification: string | null | undefined;
};

function bgColorFor(certification: string, colors: Tokens['colors']): string {
  const c = certification.toUpperCase().trim();
  if (c === 'G' || c === 'PG' || c === 'U') return colors.rating.mild;
  if (c === 'PG-13' || c === '12' || c === '12A') return colors.rating.cautionary;
  if (c === 'R' || c === '15' || c === 'MA15+') return colors.rating.restricted;
  if (c === 'NC-17' || c === '18' || c === 'X' || c === 'R18+') return colors.rating.adult;
  return colors.rating.unknown;
}

export function CertificationBadge({ certification }: Props) {
  const t = useTheme();
  if (!certification) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColorFor(certification, t.colors),
          borderRadius: t.radii.sm,
          paddingHorizontal: t.spacing.sm,
          paddingVertical: t.spacing.xxs,
        },
      ]}
      accessibilityLabel={`Rated ${certification}`}
    >
      <Text variant="label" tone="primary" style={{ letterSpacing: t.tracking.badge }}>
        {certification.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
