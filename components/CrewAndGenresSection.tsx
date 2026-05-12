import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { MovieDetails } from '@/lib/tmdb';
import { Text } from './Text';

const ROLE_COL_WIDTH = 140;

type Props = {
  keyCrew: MovieDetails['keyCrew'];
  genres: string[];
};

export function CrewAndGenresSection({ keyCrew, genres }: Props) {
  const t = useTheme();
  if (keyCrew.length === 0 && genres.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: t.spacing.lg }}>
      {keyCrew.map((row) => (
        <View
          key={row.role}
          style={[styles.crewRow, { marginBottom: t.spacing.sm, gap: t.spacing.lg }]}
        >
          <Text
            variant="caption"
            tone="muted"
            style={{
              width: ROLE_COL_WIDTH,
              textTransform: 'uppercase',
              letterSpacing: t.tracking.label,
            }}
          >
            {row.role}
          </Text>
          <Text variant="body" style={styles.flex1}>
            {row.names.join(', ')}
          </Text>
        </View>
      ))}

      {genres.length > 0 ? (
        <View style={[styles.chips, { marginTop: keyCrew.length > 0 ? t.spacing.lg : 0, gap: t.spacing.sm }]}>
          {genres.map((g) => (
            <View
              key={g}
              style={{
                backgroundColor: t.colors.bg.elevated,
                borderRadius: t.radii.pill,
                paddingHorizontal: t.spacing.md,
                paddingVertical: t.spacing.xs,
              }}
            >
              <Text variant="caption" tone="secondary">
                {g}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  crewRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flex1: { flex: 1, minWidth: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
