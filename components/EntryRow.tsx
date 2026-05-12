import { View, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { PosterImage } from './PosterImage';
import { StarRating } from './StarRating';
import type { DiaryEntry } from '@/db/diary';

const DAY_SIZE = 64;

export function EntryRow({ entry }: { entry: DiaryEntry }) {
  const t = useTheme();
  const watched = parseISO(entry.watchedDate);

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
      <View
        style={[
          styles.day,
          {
            width: DAY_SIZE,
            height: DAY_SIZE,
            borderRadius: t.radii.md,
            borderColor: t.colors.border.strong,
          },
        ]}
      >
        <Text variant="titleLg">{format(watched, 'd')}</Text>
      </View>
      <PosterImage
        posterPath={entry.posterPath}
        size="sm"
        style={{ marginLeft: t.spacing.md }}
      />
      <View style={[styles.content, { marginLeft: t.spacing.md }]}>
        <View style={styles.titleRow}>
          <Text variant="titleMd" numberOfLines={1} style={styles.flex1}>
            {entry.title}
          </Text>
          {entry.year ? (
            <Text variant="caption" tone="muted" style={{ marginLeft: t.spacing.sm }}>
              {entry.year}
            </Text>
          ) : null}
        </View>
        {entry.mediaType === 'tv_season' && entry.seasonNumber != null ? (
          <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
            Season {entry.seasonNumber}
            {entry.seasonName && entry.seasonName !== `Season ${entry.seasonNumber}`
              ? ` · ${entry.seasonName}`
              : ''}
          </Text>
        ) : null}
        <View style={[styles.starsRow, { marginTop: t.spacing.xs }]}>
          <StarRating value={entry.rating} size={16} readOnly />
          {entry.note ? (
            <Ionicons
              name="reorder-three-outline"
              size={18}
              color={t.colors.text.muted}
              style={{ marginLeft: t.spacing.sm }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  flex1: { flex: 1 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
});
