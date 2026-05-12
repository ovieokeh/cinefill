import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { PosterImage } from './PosterImage';
import type { WatchlistItem } from '@/db/watchlist';

const META_GENRE_LIMIT = 2;

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function WatchlistRow({
  item,
  genres,
  runtime,
}: {
  item: WatchlistItem;
  /** Resolved genre names (e.g. ["Drama", "Thriller"]). Caller maps from cache.genreIds. */
  genres?: string[];
  /** Minutes; for TV this is the per-episode runtime. */
  runtime?: number | null;
}) {
  const t = useTheme();
  const metaPieces: string[] = [];
  if (genres && genres.length > 0) {
    metaPieces.push(...genres.slice(0, META_GENRE_LIMIT));
  }
  const runtimeLabel = formatRuntime(runtime);
  if (runtimeLabel) metaPieces.push(runtimeLabel);
  const meta = metaPieces.join(' · ');

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
        {meta ? (
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ marginTop: t.spacing.xxs }}
          >
            {meta}
          </Text>
        ) : null}
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
