import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { useFilmBadge } from '@/lib/film-context';
import { Text } from './Text';

const LABEL: Record<'watched' | 'watching' | 'watchlist', string> = {
  watched: 'Watched',
  watching: 'Watching',
  watchlist: 'Watchlist',
};

export function FilmBadge({
  tmdbId,
  mediaType,
  style,
}: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const kind = useFilmBadge(tmdbId, mediaType);
  if (!kind) return null;
  const tone = kind === 'watchlist' ? t.colors.text.secondary : t.colors.accent.base;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          backgroundColor: t.colors.bg.elevated,
          borderRadius: t.radii.sm,
          paddingHorizontal: t.spacing.xs,
          paddingVertical: t.spacing.xxs,
          borderColor: t.colors.border.subtle,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        style={{ color: tone, letterSpacing: t.tracking.badge }}
      >
        {LABEL[kind]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
