import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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
} from '@/components';
import { useTheme } from '@/theme';
import { getEntry, updateEntry, type DiaryEntry } from '@/db/diary';

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
        <View style={styles.centered}>
          <ActivityIndicator color={t.colors.text.muted} />
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
