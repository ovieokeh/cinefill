import {
  CINEFILL_EXPORT_SCHEMA_VERSION,
  buildCinefillExportFiles,
  buildCinefillExportPayload,
  diaryCsv,
} from '@/lib/cinefill-export';
import type { DiaryEntry } from '@/db/diary';
import type { EpisodeStandout } from '@/db/standouts';
import type { WatchlistItem } from '@/db/watchlist';

const diaryEntry: DiaryEntry = {
  id: 1,
  syncId: 'diary:1',
  tmdbId: 550,
  mediaType: 'movie',
  seasonNumber: null,
  seasonName: null,
  title: 'Fight Club, obviously',
  year: '1999',
  posterPath: '/poster.jpg',
  watchedDate: '2026-05-13',
  rating: 4.5,
  note: 'Line one\n"Line two"',
  isPublic: true,
  createdAt: Date.UTC(2026, 4, 13, 10),
  updatedAt: Date.UTC(2026, 4, 13, 11),
  deletedAt: null,
  dirty: 0,
  lastModifiedDeviceId: 'device-a',
};

const watchlistItem: WatchlistItem = {
  syncId: 'watchlist:movie:13',
  tmdbId: 13,
  mediaType: 'movie',
  title: 'Forrest Gump',
  year: '1994',
  posterPath: '/forrest.jpg',
  isPublic: false,
  addedAt: Date.UTC(2026, 4, 12, 10),
  updatedAt: Date.UTC(2026, 4, 12, 10),
  deletedAt: null,
  dirty: 0,
  lastModifiedDeviceId: 'device-a',
};

const standout: EpisodeStandout = {
  syncId: 'standout:1:2:3',
  tmdbId: 1,
  seasonNumber: 2,
  episodeNumber: 3,
  episodeName: 'The One With Export Tests',
  showTitle: 'Test Show',
  posterPath: null,
  markedAt: Date.UTC(2026, 4, 11, 10),
  updatedAt: Date.UTC(2026, 4, 11, 10),
  deletedAt: null,
  dirty: 0,
  lastModifiedDeviceId: 'device-a',
};

describe('cinefill export', () => {
  test('builds a stable JSON payload with counts and ISO timestamps', () => {
    const payload = buildCinefillExportPayload(
      {
        diaryEntries: [diaryEntry],
        watchlistItems: [watchlistItem],
        episodeStandouts: [standout],
      },
      new Date('2026-05-13T12:00:00.000Z'),
    );

    expect(payload.schemaVersion).toBe(CINEFILL_EXPORT_SCHEMA_VERSION);
    expect(payload.counts).toEqual({
      diaryEntries: 1,
      watchlistItems: 1,
      episodeStandouts: 1,
    });
    expect(payload.data.diaryEntries[0]).toMatchObject({
      syncId: 'diary:1',
      title: 'Fight Club, obviously',
      isPublic: true,
      createdAt: '2026-05-13T10:00:00.000Z',
      updatedAt: '2026-05-13T11:00:00.000Z',
    });
  });

  test('escapes cinefill CSV values for spreadsheet imports', () => {
    const text = diaryCsv([diaryEntry]);

    expect(text).toContain('"Fight Club, obviously"');
    expect(text).toContain('"Line one\n""Line two"""');
  });

  test('creates the expected zip file set', () => {
    const files = buildCinefillExportFiles(
      {
        diaryEntries: [diaryEntry],
        watchlistItems: [watchlistItem],
        episodeStandouts: [standout],
      },
      new Date('2026-05-13T12:00:00.000Z'),
    );

    expect(Object.keys(files).sort()).toEqual([
      'README.txt',
      'cinefill.json',
      'diary.csv',
      'episode-standouts.csv',
      'manifest.json',
      'watchlist.csv',
    ]);
    expect(files['README.txt']).toContain('Only user-owned cinefill data is included');
    expect(JSON.parse(files['manifest.json']).counts.diaryEntries).toBe(1);
  });
});
