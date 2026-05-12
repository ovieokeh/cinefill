import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { PosterImage } from './PosterImage';
import type { WatchlistItem } from '@/db/watchlist';

export function WatchlistRow({ item }: { item: WatchlistItem }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View>
        <PosterImage posterPath={item.posterPath} size="sm" />
        {item.mediaType === 'tv' ? (
          <View
            style={[
              styles.tvChip,
              {
                top: t.spacing.xs,
                left: t.spacing.xs,
                backgroundColor: t.colors.bg.elevated,
                borderRadius: t.radii.sm,
                paddingHorizontal: t.spacing.xs,
                paddingVertical: t.spacing.xxs,
              },
            ]}
          >
            <Text variant="caption" tone="primary" style={{ letterSpacing: t.tracking.badge }}>
              TV
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.content, { marginLeft: t.spacing.md }]}>
        <View style={styles.titleRow}>
          <Text variant="titleMd" numberOfLines={1} style={styles.flex1}>
            {item.title}
          </Text>
          {item.year ? (
            <Text variant="caption" tone="muted" style={{ marginLeft: t.spacing.sm }}>
              {item.year}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  flex1: { flex: 1 },
  tvChip: { position: 'absolute' },
});
