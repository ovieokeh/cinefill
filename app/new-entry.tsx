import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';

import { Screen, Text, Input, Button, PosterImage, StarRating, DateField } from '@/components';
import { useTheme } from '@/theme';
import { searchMovies, type TmdbMovie } from '@/lib/tmdb';
import { addEntry } from '@/db/diary';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewEntryScreen() {
  const t = useTheme();
  const router = useRouter();

  const [picked, setPicked] = useState<TmdbMovie | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [watchedDate, setWatchedDate] = useState<string>(todayIso());
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (picked) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchError(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await searchMovies(q, controller.signal);
        if (!controller.signal.aborted) setResults(r);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Search failed';
        setSearchError(msg);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, picked]);

  async function onSave() {
    if (!picked) return;
    setSaving(true);
    try {
      await addEntry({
        tmdbId: picked.tmdbId,
        title: picked.title,
        year: picked.year,
        posterPath: picked.posterPath,
        watchedDate,
        rating,
        note: note.trim(),
      });
      router.back();
    } catch (e) {
      setSaving(false);
      console.error('Failed to save entry', e);
    }
  }

  if (!picked) {
    return (
      <Screen padded={false}>
        <View style={{ paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md }}>
          <Input
            label="Find a film"
            placeholder="Search by title…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchError ? (
            <Text variant="caption" tone="danger" style={{ marginTop: t.spacing.sm }}>
              {searchError}
            </Text>
          ) : null}
        </View>

        {searching && results.length === 0 ? (
          <View style={[styles.centered, { paddingTop: t.spacing.xl }]}>
            <ActivityIndicator color={t.colors.text.muted} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(m) => String(m.tmdbId)}
            contentContainerStyle={{
              paddingHorizontal: t.spacing.lg,
              paddingTop: t.spacing.md,
              paddingBottom: t.spacing.xxxl,
            }}
            ItemSeparatorComponent={() => <View style={{ height: t.spacing.sm }} />}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setPicked(item)}
                style={({ pressed }) => [
                  styles.resultRow,
                  {
                    backgroundColor: pressed ? t.colors.bg.elevated : t.colors.bg.surface,
                    borderRadius: t.radii.md,
                    padding: t.spacing.md,
                  },
                ]}
              >
                <PosterImage posterPath={item.posterPath} size="sm" />
                <View style={[styles.resultBody, { marginLeft: t.spacing.md }]}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.year ? (
                    <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
                      {item.year}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              query.trim() && !searching ? (
                <Text
                  variant="body"
                  tone="muted"
                  style={{ textAlign: 'center', marginTop: t.spacing.xl }}
                >
                  No matches.
                </Text>
              ) : null
            }
          />
        )}
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
            <PosterImage posterPath={picked.posterPath} size="lg" />
            <View style={[styles.pickedBody, { marginLeft: t.spacing.md }]}>
              <Text variant="titleLg">{picked.title}</Text>
              {picked.year ? (
                <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
                  {picked.year}
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  setPicked(null);
                  setRating(0);
                  setNote('');
                }}
                hitSlop={t.spacing.sm}
              >
                <Text variant="label" tone="accent" style={{ marginTop: t.spacing.sm }}>
                  Change film
                </Text>
              </Pressable>
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
            disabled={!picked}
            style={{ marginTop: t.spacing.xl }}
          />
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultBody: { flex: 1, minWidth: 0 },
  pickedRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pickedBody: { flex: 1, minWidth: 0 },
});
