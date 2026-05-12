import { Fragment } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { MovieDetails } from '@/lib/tmdb';
import { Text } from './Text';

const ROLE_COL_WIDTH = 140;

type GenreEntry = { id: number; name: string };

type Props = {
  keyCrew: MovieDetails['keyCrew'];
  genres: GenreEntry[];
  mediaType: 'movie' | 'tv';
};

export function CrewAndGenresSection({ keyCrew, genres, mediaType }: Props) {
  const t = useTheme();
  const router = useRouter();
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
          <View style={[styles.namesRow, styles.flex1]}>
            {row.members.map((member, idx) => (
              <Fragment key={member.id}>
                <Pressable
                  onPress={() => router.push(`/person/${member.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? t.opacity.pressed : 1 })}
                  hitSlop={t.spacing.xs}
                >
                  <Text variant="body">{member.name}</Text>
                </Pressable>
                {idx < row.members.length - 1 ? (
                  <Text variant="body">, </Text>
                ) : null}
              </Fragment>
            ))}
          </View>
        </View>
      ))}

      {genres.length > 0 ? (
        <View style={[styles.chips, { marginTop: keyCrew.length > 0 ? t.spacing.lg : 0, gap: t.spacing.sm }]}>
          {genres.map((g) => (
            <Pressable
              key={g.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/search',
                  params: { mediaType, genreId: String(g.id), genreName: g.name },
                })
              }
              style={({ pressed }) => [
                {
                  backgroundColor: t.colors.bg.elevated,
                  borderRadius: t.radii.pill,
                  paddingHorizontal: t.spacing.md,
                  paddingVertical: t.spacing.xs,
                  opacity: pressed ? t.opacity.pressed : 1,
                },
              ]}
            >
              <Text variant="caption" tone="secondary">
                {g.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  crewRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flex1: { flex: 1, minWidth: 0 },
  namesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
