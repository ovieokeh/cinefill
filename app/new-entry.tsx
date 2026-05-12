import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen, Text, Input, Button, PosterImage, StarRating, DateField } from '@/components';
import { useTheme } from '@/theme';
import { addEntry } from '@/db/diary';
import { isInWatchlist, removeFromWatchlist } from '@/db/watchlist';

type SeededFilm = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseSeededFilm(params: {
  tmdbId?: string;
  title?: string;
  year?: string;
  posterPath?: string;
}): SeededFilm | null {
  const tmdbIdNum = Number(params.tmdbId);
  if (!Number.isFinite(tmdbIdNum) || !params.title) return null;
  return {
    tmdbId: tmdbIdNum,
    title: params.title,
    year: params.year && params.year.length > 0 ? params.year : null,
    posterPath: params.posterPath && params.posterPath.length > 0 ? params.posterPath : null,
  };
}

export default function NewEntryScreen() {
  const t = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{
    tmdbId?: string;
    title?: string;
    year?: string;
    posterPath?: string;
  }>();
  const film = parseSeededFilm(params);

  const [watchedDate, setWatchedDate] = useState<string>(todayIso());
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!film) return;
    setSaving(true);
    try {
      await addEntry({
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterPath: film.posterPath,
        watchedDate,
        rating,
        note: note.trim(),
      });
      if (await isInWatchlist(film.tmdbId)) {
        await removeFromWatchlist(film.tmdbId);
      }
      router.back();
    } catch (e) {
      setSaving(false);
      console.error('Failed to save entry', e);
    }
  }

  if (!film) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text variant="titleLg">Pick a film first</Text>
          <Text
            variant="body"
            tone="muted"
            style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
          >
            Open a film from search or your watchlist, then choose “Log a watch”.
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
          <PosterImage posterPath={film.posterPath} size="lg" />
          <View style={[styles.pickedBody, { marginLeft: t.spacing.md }]}>
            <Text variant="titleLg">{film.title}</Text>
            {film.year ? (
              <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
                {film.year}
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
          title="Save entry"
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
