import { Fragment } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, genreColor } from '@/theme';
import { Text } from './Text';
import { PosterImage } from './PosterImage';
import { PublicToggle } from './PublicToggle';
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

export type WatchlistRowGenre = { id: number; name: string };

export function WatchlistRow({
  item,
  genres,
  runtime,
  showPublicToggle = false,
  onTogglePublic,
}: {
  item: WatchlistItem;
  /** Resolved genres (id + name). Caller maps from cache.genreIds + the TMDB genre catalogue. */
  genres?: WatchlistRowGenre[];
  /** Minutes; for TV this is the per-episode runtime. */
  runtime?: number | null;
  showPublicToggle?: boolean;
  onTogglePublic?: (value: boolean) => void;
}) {
  const t = useTheme();
  const shownGenres = (genres ?? []).slice(0, META_GENRE_LIMIT);
  const runtimeLabel = formatRuntime(runtime);
  const hasMeta = shownGenres.length > 0 || !!runtimeLabel;

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
        {hasMeta ? (
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ marginTop: t.spacing.xxs }}
          >
            {shownGenres.map((g, idx) => (
              <Fragment key={g.id}>
                {idx > 0 ? ' · ' : ''}
                <Text variant="caption" style={{ color: genreColor(g.id) }}>
                  {g.name}
                </Text>
              </Fragment>
            ))}
            {runtimeLabel
              ? `${shownGenres.length > 0 ? ' · ' : ''}${runtimeLabel}`
              : ''}
          </Text>
        ) : null}
        {showPublicToggle && onTogglePublic ? (
          <PublicToggle
            compact
            value={item.isPublic}
            onValueChange={onTogglePublic}
            style={{ marginTop: t.spacing.sm }}
          />
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
