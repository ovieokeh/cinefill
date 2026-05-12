import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Screen,
  Text,
  Input,
  Button,
  PosterImage,
  StarRating,
  DateField,
  Skeleton,
  SkeletonPoster,
  SkeletonText,
} from '@/components';
import { useTheme } from '@/theme';
import { getEntry, updateEntry, type DiaryEntry } from '@/db/diary';
import { haptic } from '@/lib/haptics';

type EntryState = DiaryEntry | null | 'missing';

export default function EditEntryScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = Number(id);

  const [entry, setEntry] = useState<EntryState>(null);
  const [watchedDate, setWatchedDate] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!Number.isFinite(entryId)) {
      setEntry('missing');
      return;
    }
    (async () => {
      const row = await getEntry(entryId);
      if (cancelled) return;
      if (!row) {
        setEntry('missing');
        return;
      }
      setEntry(row);
      setWatchedDate(row.watchedDate);
      setRating(row.rating);
      setNote(row.note);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  async function onSave() {
    if (!entry || entry === 'missing') return;
    setSaving(true);
    try {
      await updateEntry(entry.id, {
        watchedDate,
        rating,
        note: note.trim(),
      });
      haptic.success();
      router.back();
    } catch (e) {
      setSaving(false);
      console.error('Failed to update entry', e);
    }
  }

  if (entry === 'missing') {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text variant="titleLg">Entry not found</Text>
          <Text
            variant="body"
            tone="muted"
            style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
          >
            This diary entry may have been deleted.
          </Text>
          <Button
            title="Close"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: t.spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  if (entry == null) {
    return (
      <Screen padded={false}>
        <View
          style={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.md,
          }}
        >
          <View style={styles.pickedRow}>
            <SkeletonPoster size="lg" />
            <View style={[styles.pickedBody, { marginLeft: t.spacing.md }]}>
              <SkeletonText variant="titleLg" width="80%" />
              <View style={{ marginTop: t.spacing.xs }}>
                <SkeletonText variant="caption" width="30%" />
              </View>
            </View>
          </View>

          <View style={{ marginTop: t.spacing.xl }}>
            <View style={{ marginBottom: t.spacing.xs }}>
              <SkeletonText variant="label" width="20%" />
            </View>
            <Skeleton width="100%" height={46} borderRadius={t.radii.md} />
          </View>

          <View style={{ marginTop: t.spacing.lg }}>
            <View style={{ marginBottom: t.spacing.sm }}>
              <SkeletonText variant="label" width="18%" />
            </View>
            <Skeleton
              width={5 * 32 + 4 * t.spacing.xs}
              height={32}
              borderRadius={t.radii.sm}
            />
          </View>

          <View style={{ marginTop: t.spacing.lg }}>
            <View style={{ marginBottom: t.spacing.xs }}>
              <SkeletonText variant="label" width="14%" />
            </View>
            <Skeleton width="100%" height={96} borderRadius={t.radii.md} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAwareScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.lg,
          paddingTop: t.spacing.md,
          paddingBottom: t.spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={t.spacing.lg}
        style={styles.flex}
      >
        <View style={styles.pickedRow}>
          <PosterImage posterPath={entry.posterPath} size="lg" />
          <View style={[styles.pickedBody, { marginLeft: t.spacing.md }]}>
            <Text variant="titleLg">{entry.title}</Text>
            {entry.year ? (
              <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
                {entry.year}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: t.spacing.xl }}>
          <DateField value={watchedDate} onChange={setWatchedDate} />
        </View>

        <View style={{ marginTop: t.spacing.lg }}>
          <Text variant="label" tone="secondary" style={{ marginBottom: t.spacing.sm }}>
            Rating
          </Text>
          <StarRating value={rating} onChange={setRating} size={32} />
        </View>

        <View style={{ marginTop: t.spacing.lg }}>
          <Input
            label="Note"
            placeholder="A few thoughts (optional)"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        <Button
          title="Save changes"
          onPress={onSave}
          loading={saving}
          style={{ marginTop: t.spacing.xl }}
        />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickedRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pickedBody: { flex: 1, minWidth: 0 },
});
