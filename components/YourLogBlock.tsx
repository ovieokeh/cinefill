import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { StarRating } from './StarRating';
import { SectionEyebrow } from './SectionEyebrow';
import type { DiaryEntry } from '@/db/diary';

/**
 * Editorial "Your log" panel used on movie / TV / season detail pages.
 * Rating row + optional ellipsis actions, decorative tick rule when there
 * is a note, italic pull-quote note, uppercase tracked date.
 *
 * Pass a `number` like "01" to render a chapter eyebrow above the panel.
 * Pass `onActions` to surface the ellipsis button on the right.
 */
export function YourLogBlock({
  entry,
  number,
  onActions,
}: {
  entry: DiaryEntry;
  number?: string;
  onActions?: () => void;
}) {
  const t = useTheme();
  const watched = parseISO(entry.watchedDate);
  const dateLabel = format(watched, 'EEEE, MMMM d, yyyy').toUpperCase();
  return (
    <>
      <SectionEyebrow number={number} title="Your log" />
      <View style={{ paddingHorizontal: t.spacing.lg }}>
        <View style={[styles.row, { gap: t.spacing.md, alignItems: 'center' }]}>
          {entry.rating > 0 ? (
            <>
              <StarRating value={entry.rating} size={20} readOnly />
              <Text variant="displayMd" style={{ color: t.colors.accent.base }}>
                {entry.rating.toFixed(1)}
              </Text>
            </>
          ) : (
            <Text variant="bodyStrong" tone="muted">
              Unrated
            </Text>
          )}
          <View style={styles.flex1} />
          {onActions ? (
            <Pressable
              onPress={onActions}
              accessibilityRole="button"
              accessibilityLabel="Log options"
              hitSlop={t.spacing.sm}
              style={({ pressed }) => ({
                paddingHorizontal: t.spacing.sm,
                paddingVertical: t.spacing.xs,
                opacity: pressed ? t.opacity.pressed : 1,
              })}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={t.spacing.xl}
                color={t.colors.accent.base}
              />
            </Pressable>
          ) : null}
        </View>

        {entry.note ? (
          <>
            <View
              style={{
                marginTop: t.spacing.lg,
                width: t.spacing.xxxl,
                height: StyleSheet.hairlineWidth,
                backgroundColor: t.colors.accent.base,
              }}
            />
            <Text
              variant="body"
              style={{ marginTop: t.spacing.md, fontStyle: 'italic' }}
            >
              {entry.note}
            </Text>
          </>
        ) : null}

        <Text
          variant="caption"
          tone="muted"
          style={{
            marginTop: t.spacing.lg,
            textTransform: 'uppercase',
            letterSpacing: t.tracking.label,
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
});
