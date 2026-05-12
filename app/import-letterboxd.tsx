import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import JSZip from 'jszip';

import { Screen, Text, Button, SectionTitle } from '@/components';
import { useTheme } from '@/theme';
import {
  parseDiaryCsv,
  parseReviewsCsv,
  parseWatchedCsv,
  parseWatchlistCsv,
} from '@/lib/letterboxd-csv';
import {
  buildParsedExport,
  collectMatchTargets,
  matchTargets,
  assembleInserts,
  type ParsedExport,
  type MatchResult,
  type MatchTarget,
} from '@/lib/letterboxd-import';
import { searchMovies } from '@/lib/tmdb';
import {
  addEntries,
  listExistingMovieWatchKeys,
  type NewDiaryEntry,
} from '@/db/diary';
import { addToWatchlistBatch, type NewWatchlistItem } from '@/db/watchlist';
import { haptic } from '@/lib/haptics';

const CONCURRENCY = 6;
const UNMATCHED_PREVIEW_LIMIT = 5;

type Phase =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | {
      kind: 'preview';
      parsed: ParsedExport;
      reviews: ReturnType<typeof parseReviewsCsv>;
      targets: MatchTarget[];
    }
  | {
      kind: 'matching';
      parsed: ParsedExport;
      reviews: ReturnType<typeof parseReviewsCsv>;
      targets: MatchTarget[];
      done: number;
      total: number;
    }
  | {
      kind: 'reviewing';
      diaryInserts: NewDiaryEntry[];
      watchlistInserts: NewWatchlistItem[];
      unmatchedTitles: string[];
      dupeKeys: Set<string>;
    }
  | { kind: 'committing' }
  | {
      kind: 'done';
      diaryAdded: number;
      duplicatesSkipped: number;
      watchlistAdded: number;
      unmatchedTitles: string[];
    }
  | { kind: 'error'; message: string };

export default function ImportLetterboxdScreen() {
  const t = useTheme();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const matchAbortRef = useRef<AbortController | null>(null);

  // Abort any in-flight matching if the screen unmounts.
  useEffect(() => {
    return () => matchAbortRef.current?.abort();
  }, []);

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'public.zip-archive'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      await readAndParse(result.assets[0].uri);
    } catch (err) {
      console.warn('document pick failed', err);
      setPhase({
        kind: 'error',
        message: 'Could not open that file. Try again with a Letterboxd export zip.',
      });
    }
  }

  async function readAndParse(uri: string) {
    setPhase({ kind: 'parsing' });
    try {
      const file = new File(uri);
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);

      const readMaybe = async (name: string): Promise<string> => {
        const f = zip.file(name);
        if (!f) return '';
        return f.async('string');
      };

      const [diaryText, reviewsText, watchedText, watchlistText] = await Promise.all([
        readMaybe('diary.csv'),
        readMaybe('reviews.csv'),
        readMaybe('watched.csv'),
        readMaybe('watchlist.csv'),
      ]);

      if (!diaryText && !watchedText && !watchlistText) {
        setPhase({
          kind: 'error',
          message: "This doesn't look like a Letterboxd export. None of diary.csv, watched.csv, or watchlist.csv were found.",
        });
        return;
      }

      const diary = diaryText ? parseDiaryCsv(diaryText) : [];
      const reviews = reviewsText ? parseReviewsCsv(reviewsText) : [];
      const watched = watchedText ? parseWatchedCsv(watchedText) : [];
      const watchlist = watchlistText ? parseWatchlistCsv(watchlistText) : [];

      const parsed = buildParsedExport({ diary, reviews, watched, watchlist });
      const targets = collectMatchTargets(parsed);

      setPhase({ kind: 'preview', parsed, reviews, targets });
    } catch (err) {
      console.warn('parse failed', err);
      setPhase({
        kind: 'error',
        message: 'Could not read the export. The file might be corrupted.',
      });
    }
  }

  async function startMatching() {
    if (phase.kind !== 'preview') return;
    const controller = new AbortController();
    matchAbortRef.current = controller;
    setPhase({
      kind: 'matching',
      parsed: phase.parsed,
      reviews: phase.reviews,
      targets: phase.targets,
      done: 0,
      total: phase.targets.length,
    });
    let matches: Map<string, MatchResult>;
    try {
      matches = await matchTargets(phase.targets, searchMovies, {
        concurrency: CONCURRENCY,
        signal: controller.signal,
        onProgress: (done, total) => {
          setPhase((p) =>
            p.kind === 'matching' && !controller.signal.aborted
              ? { ...p, done, total }
              : p,
          );
        },
      });
    } catch (err) {
      console.warn('matching failed', err);
      setPhase({ kind: 'error', message: 'Matching failed unexpectedly.' });
      return;
    }
    if (controller.signal.aborted) {
      setPhase({ kind: 'error', message: 'Import cancelled.' });
      return;
    }

    const { diaryInserts, watchlistInserts, unmatchedTitles } = assembleInserts(
      phase.parsed,
      matches,
      phase.reviews,
    );

    const tmdbIds = diaryInserts.map((d) => d.tmdbId);
    const dupeKeys = await listExistingMovieWatchKeys(tmdbIds);

    setPhase({
      kind: 'reviewing',
      diaryInserts,
      watchlistInserts,
      unmatchedTitles,
      dupeKeys,
    });
  }

  async function commit() {
    if (phase.kind !== 'reviewing') return;
    const { diaryInserts, watchlistInserts, unmatchedTitles, dupeKeys } = phase;
    setPhase({ kind: 'committing' });
    try {
      const newDiary = diaryInserts.filter(
        (d) => !dupeKeys.has(`${d.tmdbId}|${d.watchedDate}`),
      );
      await addEntries(newDiary);
      await addToWatchlistBatch(watchlistInserts);
      haptic.success();
      setPhase({
        kind: 'done',
        diaryAdded: newDiary.length,
        duplicatesSkipped: diaryInserts.length - newDiary.length,
        watchlistAdded: watchlistInserts.length,
        unmatchedTitles,
      });
    } catch (err) {
      console.warn('commit failed', err);
      setPhase({
        kind: 'error',
        message: 'Saving failed. No partial data should have been written.',
      });
    }
  }

  function cancelMatching() {
    matchAbortRef.current?.abort();
  }

  function reset() {
    matchAbortRef.current?.abort();
    setPhase({ kind: 'idle' });
  }

  // ----- views -----

  const cancelHeaderButton = (
    <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Import from Letterboxd',
          headerRight: () => cancelHeaderButton,
        }}
      />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={{ padding: t.spacing.lg }}>
          {phase.kind === 'idle' ? <IdleView onPick={pickFile} /> : null}
          {phase.kind === 'parsing' ? <BusyView caption="Reading export…" /> : null}
          {phase.kind === 'preview' ? (
            <PreviewView
              parsed={phase.parsed}
              targets={phase.targets}
              onContinue={startMatching}
              onChangeFile={reset}
            />
          ) : null}
          {phase.kind === 'matching' ? (
            <MatchingView
              done={phase.done}
              total={phase.total}
              onCancel={cancelMatching}
            />
          ) : null}
          {phase.kind === 'reviewing' ? (
            <ReviewingView
              diaryInserts={phase.diaryInserts}
              watchlistInserts={phase.watchlistInserts}
              unmatchedTitles={phase.unmatchedTitles}
              dupeKeys={phase.dupeKeys}
              onCommit={commit}
              onCancel={reset}
            />
          ) : null}
          {phase.kind === 'committing' ? <BusyView caption="Saving…" /> : null}
          {phase.kind === 'done' ? (
            <DoneView
              diaryAdded={phase.diaryAdded}
              duplicatesSkipped={phase.duplicatesSkipped}
              watchlistAdded={phase.watchlistAdded}
              unmatchedTitles={phase.unmatchedTitles}
              onOpenDiary={() => {
                router.dismiss();
                router.push('/(tabs)');
              }}
              onClose={() => router.dismiss()}
            />
          ) : null}
          {phase.kind === 'error' ? (
            <ErrorView message={phase.message} onRetry={reset} />
          ) : null}
        </ScrollView>
      </Screen>
    </>
  );
}

// ---------- subviews ----------

function IdleView({ onPick }: { onPick: () => void }) {
  const t = useTheme();
  return (
    <View>
      <Text variant="displayMd">Bring your Letterboxd history</Text>
      <Text
        variant="body"
        tone="muted"
        style={{ marginTop: t.spacing.md, marginBottom: t.spacing.xl }}
      >
        Pick the .zip from your Letterboxd account export. We&apos;ll match each film
        to TMDB and add diary entries, reviews, and watchlist items to cinefill.
      </Text>
      <Button title="Choose export file" onPress={onPick} />
      <Text
        variant="caption"
        tone="muted"
        style={{ marginTop: t.spacing.lg }}
      >
        Get your export at letterboxd.com/settings/data.
      </Text>
    </View>
  );
}

function BusyView({ caption }: { caption: string }) {
  const t = useTheme();
  return (
    <View style={[styles.centered, { paddingVertical: t.spacing.xxxl }]}>
      <ActivityIndicator color={t.colors.text.muted} />
      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.md }}>
        {caption}
      </Text>
    </View>
  );
}

function PreviewView({
  parsed,
  targets,
  onContinue,
  onChangeFile,
}: {
  parsed: ParsedExport;
  targets: MatchTarget[];
  onContinue: () => void;
  onChangeFile: () => void;
}) {
  const t = useTheme();
  return (
    <View>
      <Text variant="displayMd">Looks good</Text>
      <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
        <Stat label="Diary entries" value={parsed.diary.length} />
        <Stat label="Watchlist items" value={parsed.watchlist.length} />
        <Stat label="Unique films to look up" value={targets.length} />
      </View>
      <Text
        variant="caption"
        tone="muted"
        style={{ marginTop: t.spacing.lg }}
      >
        Next step matches each film to TMDB. This usually takes a few seconds per
        hundred films.
      </Text>
      <Button
        title="Match to TMDB"
        onPress={onContinue}
        style={{ marginTop: t.spacing.xl }}
      />
      <Button
        title="Choose a different file"
        variant="ghost"
        onPress={onChangeFile}
        style={{ marginTop: t.spacing.sm }}
      />
    </View>
  );
}

function MatchingView({
  done,
  total,
  onCancel,
}: {
  done: number;
  total: number;
  onCancel: () => void;
}) {
  const t = useTheme();
  const pct = total === 0 ? 1 : done / total;
  return (
    <View>
      <Text variant="displayMd">Matching films</Text>
      <Text variant="body" tone="muted" style={{ marginTop: t.spacing.sm }}>
        {done} of {total}
      </Text>
      <View
        style={[
          styles.barTrack,
          {
            marginTop: t.spacing.lg,
            height: t.spacing.sm,
            backgroundColor: t.colors.bg.elevated,
            borderRadius: t.radii.pill,
          },
        ]}
      >
        <View
          style={{
            width: `${Math.round(pct * 100)}%`,
            height: t.spacing.sm,
            backgroundColor: t.colors.accent.base,
            borderRadius: t.radii.pill,
          }}
        />
      </View>
      <Button
        title="Cancel"
        variant="ghost"
        onPress={onCancel}
        style={{ marginTop: t.spacing.xl }}
      />
    </View>
  );
}

function ReviewingView({
  diaryInserts,
  watchlistInserts,
  unmatchedTitles,
  dupeKeys,
  onCommit,
  onCancel,
}: {
  diaryInserts: NewDiaryEntry[];
  watchlistInserts: NewWatchlistItem[];
  unmatchedTitles: string[];
  dupeKeys: Set<string>;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const willSkip = diaryInserts.filter((d) =>
    dupeKeys.has(`${d.tmdbId}|${d.watchedDate}`),
  ).length;
  const willInsert = diaryInserts.length - willSkip;
  const previewUnmatched = unmatchedTitles.slice(0, UNMATCHED_PREVIEW_LIMIT);
  const remainingUnmatched = unmatchedTitles.length - previewUnmatched.length;

  return (
    <View>
      <Text variant="displayMd">Ready to import</Text>
      <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
        <Stat label="Diary entries to add" value={willInsert} />
        {willSkip > 0 ? (
          <Stat label="Duplicates that will skip" value={willSkip} />
        ) : null}
        <Stat label="Watchlist items" value={watchlistInserts.length} />
        {unmatchedTitles.length > 0 ? (
          <Stat label="Couldn't be matched" value={unmatchedTitles.length} />
        ) : null}
      </View>

      {unmatchedTitles.length > 0 ? (
        <View style={{ marginTop: t.spacing.xl }}>
          <SectionTitle title="Couldn't match" />
          <View style={{ paddingHorizontal: t.spacing.lg }}>
            {previewUnmatched.map((title) => (
              <Text
                key={title}
                variant="body"
                tone="muted"
                style={{ marginBottom: t.spacing.xxs }}
              >
                · {title}
              </Text>
            ))}
            {remainingUnmatched > 0 ? (
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: t.spacing.xs }}
              >
                + {remainingUnmatched} more
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <Button
        title="Import"
        onPress={onCommit}
        style={{ marginTop: t.spacing.xl }}
        disabled={willInsert === 0 && watchlistInserts.length === 0}
      />
      <Button
        title="Cancel"
        variant="ghost"
        onPress={onCancel}
        style={{ marginTop: t.spacing.sm }}
      />
    </View>
  );
}

function DoneView({
  diaryAdded,
  duplicatesSkipped,
  watchlistAdded,
  unmatchedTitles,
  onOpenDiary,
  onClose,
}: {
  diaryAdded: number;
  duplicatesSkipped: number;
  watchlistAdded: number;
  unmatchedTitles: string[];
  onOpenDiary: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <View>
      <Text variant="displayMd">All done</Text>
      <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
        <Stat label="Diary entries added" value={diaryAdded} />
        {duplicatesSkipped > 0 ? (
          <Stat label="Duplicates skipped" value={duplicatesSkipped} />
        ) : null}
        <Stat label="Watchlist items added" value={watchlistAdded} />
        {unmatchedTitles.length > 0 ? (
          <Stat label="Films we couldn't match" value={unmatchedTitles.length} />
        ) : null}
      </View>
      <Button
        title="Open Diary"
        onPress={onOpenDiary}
        style={{ marginTop: t.spacing.xl }}
      />
      <Button
        title="Close"
        variant="ghost"
        onPress={onClose}
        style={{ marginTop: t.spacing.sm }}
      />
    </View>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View>
      <Text variant="displayMd">Something went wrong</Text>
      <Text variant="body" tone="muted" style={{ marginTop: t.spacing.md }}>
        {message}
      </Text>
      <Button
        title="Try again"
        onPress={onRetry}
        style={{ marginTop: t.spacing.xl }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <Text variant="body" tone="muted" style={styles.flex1}>
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  barTrack: { width: '100%', overflow: 'hidden' },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
