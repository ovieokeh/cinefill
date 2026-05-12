import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen, Text, Input, Button, PosterImage, StarRating, DateField } from '@/components';
import { useTheme } from '@/theme';
import { addEntry, type EntryMediaType } from '@/db/diary';
import { isInWatchlist, removeFromWatchlist } from '@/db/watchlist';
import { haptic } from '@/lib/haptics';

type SeededTarget = {
  tmdbId: number;
  mediaType: EntryMediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  seasonNumber: number | null;
  seasonName: string | null;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseSeededTarget(params: {
  tmdbId?: string;
  title?: string;
  year?: string;
  posterPath?: string;
  mediaType?: string;
  seasonNumber?: string;
  seasonName?: string;
}): SeededTarget | null {
  const tmdbIdNum = Number(params.tmdbId);
  if (!Number.isFinite(tmdbIdNum) || !params.title) return null;

  const mediaType: EntryMediaType = params.mediaType === 'tv_season' ? 'tv_season' : 'movie';
  let seasonNumber: number | null = null;
  let seasonName: string | null = null;

  if (mediaType === 'tv_season') {
    const n = Number(params.seasonNumber);
    if (!Number.isFinite(n)) return null;
    seasonNumber = n;
    seasonName = params.seasonName && params.seasonName.length > 0 ? params.seasonName : null;
  }

  return {
    tmdbId: tmdbIdNum,
    mediaType,
    title: params.title,
    year: params.year && params.year.length > 0 ? params.year : null,
    posterPath: params.posterPath && params.posterPath.length > 0 ? params.posterPath : null,
    seasonNumber,
    seasonName,
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
    mediaType?: string;
    seasonNumber?: string;
    seasonName?: string;
  }>();
  const target = parseSeededTarget(params);

  const [watchedDate, setWatchedDate] = useState<string>(todayIso());
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!target) return;
    setSaving(true);
    try {
      await addEntry({
        tmdbId: target.tmdbId,
        mediaType: target.mediaType,
        seasonNumber: target.seasonNumber,
        seasonName: target.seasonName,
        title: target.title,
        year: target.year,
        posterPath: target.posterPath,
        watchedDate,
        rating,
        note: note.trim(),
      });
      if (target.mediaType === 'movie') {
        if (await isInWatchlist(target.tmdbId, 'movie')) {
          await removeFromWatchlist(target.tmdbId, 'movie');
        }
      }
      haptic.success();
      router.back();
    } catch (e) {
      setSaving(false);
      console.error('Failed to save entry', e);
    }
  }

  if (!target) {
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

  const isSeason = target.mediaType === 'tv_season';
  const subtitle = isSeason
    ? `Season ${target.seasonNumber}${target.seasonName ? ` · ${target.seasonName}` : ''}`
    : target.year;

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
          <PosterImage posterPath={target.posterPath} size="lg" />
          <View style={[styles.pickedBody, { marginLeft: t.spacing.md }]}>
            <Text variant="titleLg">{target.title}</Text>
            {subtitle ? (
              <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
                {subtitle}
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
          title={isSeason ? 'Save log' : 'Save entry'}
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
