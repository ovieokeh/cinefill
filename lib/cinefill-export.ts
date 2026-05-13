import type { DiaryEntry } from '@/db/diary';
import type { EpisodeStandout } from '@/db/standouts';
import type { WatchlistItem } from '@/db/watchlist';

export const CINEFILL_EXPORT_SCHEMA_VERSION = 1;

export type CinefillExportInput = {
  diaryEntries: DiaryEntry[];
  watchlistItems: WatchlistItem[];
  episodeStandouts: EpisodeStandout[];
};

export type CinefillExportPayload = ReturnType<typeof buildCinefillExportPayload>;

type ExportCounts = {
  diaryEntries: number;
  watchlistItems: number;
  episodeStandouts: number;
};

function isoFromMs(value: number | null): string | null {
  return value == null ? null : new Date(value).toISOString();
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]): string {
  return `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`;
}

function exportFileDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildCinefillExportPayload(input: CinefillExportInput, exportedAt = new Date()) {
  return {
    schemaVersion: CINEFILL_EXPORT_SCHEMA_VERSION,
    app: 'cinefill',
    exportedAt: exportedAt.toISOString(),
    counts: {
      diaryEntries: input.diaryEntries.length,
      watchlistItems: input.watchlistItems.length,
      episodeStandouts: input.episodeStandouts.length,
    },
    data: {
      diaryEntries: input.diaryEntries.map((entry) => ({
        syncId: entry.syncId,
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        seasonNumber: entry.seasonNumber,
        seasonName: entry.seasonName,
        title: entry.title,
        year: entry.year,
        posterPath: entry.posterPath,
        watchedDate: entry.watchedDate,
        rating: entry.rating,
        note: entry.note,
        createdAt: isoFromMs(entry.createdAt),
        updatedAt: isoFromMs(entry.updatedAt),
      })),
      watchlistItems: input.watchlistItems.map((item) => ({
        syncId: item.syncId,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
        addedAt: isoFromMs(item.addedAt),
        updatedAt: isoFromMs(item.updatedAt),
      })),
      episodeStandouts: input.episodeStandouts.map((item) => ({
        syncId: item.syncId,
        tmdbId: item.tmdbId,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
        episodeName: item.episodeName,
        showTitle: item.showTitle,
        posterPath: item.posterPath,
        markedAt: isoFromMs(item.markedAt),
        updatedAt: isoFromMs(item.updatedAt),
      })),
    },
  };
}

export function diaryCsv(entries: DiaryEntry[]): string {
  return csv([
    [
      'Watched Date',
      'Name',
      'Year',
      'Type',
      'TMDB ID',
      'Season Number',
      'Season Name',
      'Rating',
      'Note',
      'Poster Path',
      'Sync ID',
      'Created At',
      'Updated At',
    ],
    ...entries.map((entry) => [
      entry.watchedDate,
      entry.title,
      entry.year,
      entry.mediaType,
      entry.tmdbId,
      entry.seasonNumber,
      entry.seasonName,
      entry.rating,
      entry.note,
      entry.posterPath,
      entry.syncId,
      isoFromMs(entry.createdAt),
      isoFromMs(entry.updatedAt),
    ]),
  ]);
}

export function watchlistCsv(items: WatchlistItem[]): string {
  return csv([
    ['Added At', 'Name', 'Year', 'Type', 'TMDB ID', 'Poster Path', 'Sync ID', 'Updated At'],
    ...items.map((item) => [
      isoFromMs(item.addedAt),
      item.title,
      item.year,
      item.mediaType,
      item.tmdbId,
      item.posterPath,
      item.syncId,
      isoFromMs(item.updatedAt),
    ]),
  ]);
}

export function episodeStandoutsCsv(items: EpisodeStandout[]): string {
  return csv([
    [
      'Marked At',
      'Show',
      'TMDB ID',
      'Season Number',
      'Episode Number',
      'Episode Name',
      'Poster Path',
      'Sync ID',
      'Updated At',
    ],
    ...items.map((item) => [
      isoFromMs(item.markedAt),
      item.showTitle,
      item.tmdbId,
      item.seasonNumber,
      item.episodeNumber,
      item.episodeName,
      item.posterPath,
      item.syncId,
      isoFromMs(item.updatedAt),
    ]),
  ]);
}

function readme(counts: ExportCounts): string {
  return [
    'cinefill export',
    '',
    `Diary entries: ${counts.diaryEntries}`,
    `Watchlist items: ${counts.watchlistItems}`,
    `Episode standouts: ${counts.episodeStandouts}`,
    '',
    'Files:',
    '- cinefill.json: complete cinefill export payload.',
    '- diary.csv: watched films and TV seasons.',
    '- watchlist.csv: saved films and shows.',
    '- episode-standouts.csv: TV episodes marked as standouts.',
    '- manifest.json: export metadata and file descriptions.',
    '',
    'Only user-owned cinefill data is included. Derived TMDB cache data is not exported.',
    '',
  ].join('\n');
}

export function buildCinefillExportFiles(
  input: CinefillExportInput,
  exportedAt = new Date(),
): Record<string, string> {
  const payload = buildCinefillExportPayload(input, exportedAt);
  const manifest = {
    schemaVersion: CINEFILL_EXPORT_SCHEMA_VERSION,
    app: 'cinefill',
    exportedAt: payload.exportedAt,
    counts: payload.counts,
    files: {
      'cinefill.json': 'Complete cinefill export payload.',
      'diary.csv': 'Watched films and TV seasons.',
      'watchlist.csv': 'Saved films and shows.',
      'episode-standouts.csv': 'TV episodes marked as standouts.',
      'README.txt': 'Human-readable export notes.',
    },
  };

  return {
    'README.txt': readme(payload.counts),
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'cinefill.json': `${JSON.stringify(payload, null, 2)}\n`,
    'diary.csv': diaryCsv(input.diaryEntries),
    'watchlist.csv': watchlistCsv(input.watchlistItems),
    'episode-standouts.csv': episodeStandoutsCsv(input.episodeStandouts),
  };
}

export async function exportCinefillData(): Promise<{
  uri: string;
  fileName: string;
  shared: boolean;
  counts: ExportCounts;
}> {
  const [{ listEntries }, { listWatchlist }, { listStandouts }] = await Promise.all([
    import('@/db/diary'),
    import('@/db/watchlist'),
    import('@/db/standouts'),
  ]);

  const [diaryEntries, watchlistItems, episodeStandouts] = await Promise.all([
    listEntries(),
    listWatchlist(),
    listStandouts(),
  ]);

  const exportedAt = new Date();
  const files = buildCinefillExportFiles(
    { diaryEntries, watchlistItems, episodeStandouts },
    exportedAt,
  );
  const payload = buildCinefillExportPayload(
    { diaryEntries, watchlistItems, episodeStandouts },
    exportedAt,
  );

  const [{ File, Paths }, Sharing, JSZipModule] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
    import('jszip'),
  ]);
  const zip = new JSZipModule.default();

  for (const [name, contents] of Object.entries(files)) {
    zip.file(name, contents);
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const fileName = `cinefill-export-${exportFileDate(exportedAt)}.zip`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(bytes);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
      dialogTitle: 'Export cinefill data',
    });
  }

  return {
    uri: file.uri,
    fileName,
    shared: canShare,
    counts: payload.counts,
  };
}
