import {
  buildParsedExport,
  collectMatchTargets,
  matchTargets,
  pickBestMatch,
  assembleInserts,
  matchKey,
  type MatchResult,
} from '@/lib/letterboxd-import';
import type {
  DiaryRow,
  ReviewRow,
  WatchedRow,
  WatchlistRow,
} from '@/lib/letterboxd-csv';
import type { TmdbMovie } from '@/lib/tmdb';

// ---------- fixtures ----------

const diary = (over: Partial<DiaryRow> & Pick<DiaryRow, 'uri' | 'name'>): DiaryRow => ({
  date: '2025-01-01',
  year: '2024',
  rating: 4,
  watchedDate: '2024-12-15',
  ...over,
});

const review = (over: Partial<ReviewRow> & Pick<ReviewRow, 'uri' | 'name'>): ReviewRow => ({
  date: '2025-01-01',
  year: '2024',
  rating: 4,
  watchedDate: '2024-12-15',
  review: 'A note.',
  ...over,
});

const watched = (over: Partial<WatchedRow> & Pick<WatchedRow, 'uri' | 'name'>): WatchedRow => ({
  date: '2025-01-01',
  year: '2024',
  ...over,
});

const watchlist = (
  over: Partial<WatchlistRow> & Pick<WatchlistRow, 'uri' | 'name'>,
): WatchlistRow => ({
  date: '2025-01-01',
  year: '2024',
  ...over,
});

const tmdb = (over: Partial<TmdbMovie> & Pick<TmdbMovie, 'tmdbId' | 'title'>): TmdbMovie => ({
  year: '2024',
  posterPath: null,
  overview: '',
  popularity: 10,
  ...over,
});

// ---------- buildParsedExport ----------

describe('buildParsedExport', () => {
  test('reviews merge into diary by URI (no duplicate rows)', () => {
    const out = buildParsedExport({
      diary: [diary({ uri: 'A', name: 'A' })],
      reviews: [review({ uri: 'A', name: 'A' })],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
  });

  test('standalone review (no matching diary row) becomes a diary row', () => {
    const out = buildParsedExport({
      diary: [],
      reviews: [review({ uri: 'A', name: 'Solo Review' })],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
    expect(out.diary[0].name).toBe('Solo Review');
  });

  test('watched.csv rows overlapping diary by URI are dropped', () => {
    const out = buildParsedExport({
      diary: [diary({ uri: 'A', name: 'A' })],
      reviews: [],
      watched: [watched({ uri: 'A', name: 'A' })],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
  });

  test('non-overlapping watched.csv rows enter diary with date fallback', () => {
    const out = buildParsedExport({
      diary: [],
      reviews: [],
      watched: [watched({ uri: 'X', name: 'X', date: '2024-03-03' })],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
    expect(out.diary[0].watchedDate).toBe('2024-03-03');
    expect(out.diary[0].rating).toBe(0);
  });

  test('watchlist dedupes by URI', () => {
    const out = buildParsedExport({
      diary: [],
      reviews: [],
      watched: [],
      watchlist: [
        watchlist({ uri: 'A', name: 'A' }),
        watchlist({ uri: 'A', name: 'A' }),
      ],
    });
    expect(out.watchlist).toHaveLength(1);
  });
});

// ---------- collectMatchTargets ----------

describe('collectMatchTargets', () => {
  test('dedupes by (name, year)', () => {
    const out = collectMatchTargets({
      diary: [
        diary({ uri: 'A', name: 'Inception', year: '2010' }),
        diary({ uri: 'B', name: 'Inception', year: '2010' }),
        diary({ uri: 'C', name: 'Inception', year: '2010', watchedDate: '2020-01-01' }),
      ],
      watchlist: [watchlist({ uri: 'D', name: 'Tenet', year: '2020' })],
    });
    expect(out).toEqual([
      { name: 'Inception', year: '2010' },
      { name: 'Tenet', year: '2020' },
    ]);
  });
});

// ---------- pickBestMatch ----------

describe('pickBestMatch', () => {
  test('empty results → unmatched/no-results', () => {
    expect(pickBestMatch({ name: 'X', year: '2020' }, [])).toEqual({
      status: 'unmatched',
      reason: 'no-results',
    });
  });

  test('single year-match wins', () => {
    const r = pickBestMatch({ name: 'X', year: '2010' }, [
      tmdb({ tmdbId: 1, title: 'X', year: '2010' }),
      tmdb({ tmdbId: 2, title: 'X', year: '1999' }),
    ]);
    expect(r).toMatchObject({ status: 'matched', tmdbId: 1 });
  });

  test('multiple year-matches → highest popularity wins', () => {
    const r = pickBestMatch({ name: 'X', year: '2010' }, [
      tmdb({ tmdbId: 1, title: 'X', year: '2010', popularity: 5 }),
      tmdb({ tmdbId: 2, title: 'X', year: '2010', popularity: 50 }),
      tmdb({ tmdbId: 3, title: 'X', year: '2010', popularity: 20 }),
    ]);
    expect(r).toMatchObject({ status: 'matched', tmdbId: 2 });
  });

  test('no year-match (and year given) → falls back to first result', () => {
    const r = pickBestMatch({ name: 'X', year: '2010' }, [
      tmdb({ tmdbId: 7, title: 'X', year: '1999' }),
      tmdb({ tmdbId: 8, title: 'X', year: '1998' }),
    ]);
    expect(r).toMatchObject({ status: 'matched', tmdbId: 7 });
  });

  test('year null → top result', () => {
    const r = pickBestMatch({ name: 'X', year: null }, [
      tmdb({ tmdbId: 9, title: 'X', year: '2024', popularity: 1 }),
    ]);
    expect(r).toMatchObject({ status: 'matched', tmdbId: 9 });
  });
});

// ---------- matchTargets ----------

describe('matchTargets', () => {
  test('runs all targets to completion in normal flow', async () => {
    const targets = [
      { name: 'A', year: '2020' },
      { name: 'B', year: null },
    ];
    const search = jest.fn(async (q: string) => {
      if (q === 'A') return [tmdb({ tmdbId: 1, title: 'A', year: '2020' })];
      return [tmdb({ tmdbId: 2, title: 'B', year: '1999' })];
    });
    const controller = new AbortController();
    const result = await matchTargets(targets, search, {
      concurrency: 2,
      signal: controller.signal,
    });
    expect(result.size).toBe(2);
    expect(result.get('A|2020')).toMatchObject({ status: 'matched', tmdbId: 1 });
    expect(result.get('B|')).toMatchObject({ status: 'matched', tmdbId: 2 });
  });

  test('aborted signal yields unmatched/aborted for unsearched targets', async () => {
    const targets = [
      { name: 'A', year: null },
      { name: 'B', year: null },
      { name: 'C', year: null },
    ];
    const controller = new AbortController();
    controller.abort();
    const search = jest.fn(async () => [tmdb({ tmdbId: 1, title: 'A' })]);
    const result = await matchTargets(targets, search, {
      concurrency: 6,
      signal: controller.signal,
    });
    expect(result.size).toBe(3);
    for (const target of targets) {
      const m = result.get(matchKey(target));
      expect(m).toEqual({ status: 'unmatched', reason: 'aborted' });
    }
    expect(search).not.toHaveBeenCalled();
  });

  test('thrown error from searchMovies surfaces as unmatched/no-results', async () => {
    const targets = [{ name: 'A', year: null }];
    const search = jest.fn(async () => {
      throw new Error('network');
    });
    const controller = new AbortController();
    const result = await matchTargets(targets, search, {
      concurrency: 1,
      signal: controller.signal,
    });
    expect(result.get('A|')).toEqual({
      status: 'unmatched',
      reason: 'no-results',
    });
  });

  test('onProgress reports done count', async () => {
    const targets = [
      { name: 'A', year: null },
      { name: 'B', year: null },
    ];
    const search = jest.fn(async () => []);
    const progress: number[] = [];
    await matchTargets(targets, search, {
      concurrency: 2,
      signal: new AbortController().signal,
      onProgress: (done) => progress.push(done),
    });
    expect(progress).toEqual([1, 2]);
  });
});

// ---------- assembleInserts ----------

describe('assembleInserts', () => {
  const parsed = {
    diary: [
      diary({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
      diary({
        uri: 'B',
        name: 'B',
        year: '2020',
        watchedDate: '2024-02-02',
        rating: 4.5,
      }),
      diary({
        uri: 'X',
        name: 'No-TMDB',
        year: '2024',
        watchedDate: '2024-03-03',
      }),
    ],
    watchlist: [
      watchlist({ uri: 'C', name: 'C', year: '2024' }),
      watchlist({ uri: 'Y', name: 'No-TMDB-Either', year: '1995' }),
    ],
  };

  const matches: Map<string, MatchResult> = new Map([
    ['A|2010', { status: 'matched', tmdbId: 1, title: 'A (canonical)', year: '2010', posterPath: '/a.jpg' }],
    ['B|2020', { status: 'matched', tmdbId: 2, title: 'B (canonical)', year: '2020', posterPath: null }],
    ['No-TMDB|2024', { status: 'unmatched', reason: 'no-results' }],
    ['C|2024', { status: 'matched', tmdbId: 3, title: 'C (canonical)', year: '2024', posterPath: null }],
    ['No-TMDB-Either|1995', { status: 'unmatched', reason: 'no-results' }],
  ]);

  test('matched rows become NewDiaryEntry / NewWatchlistItem with canonical TMDB titles', () => {
    const out = assembleInserts(parsed, matches, []);
    expect(out.diaryInserts).toHaveLength(2);
    expect(out.diaryInserts[0]).toMatchObject({
      tmdbId: 1,
      mediaType: 'movie',
      title: 'A (canonical)',
      year: '2010',
      posterPath: '/a.jpg',
      watchedDate: '2024-01-01',
      rating: 4,
      note: '',
    });
    expect(out.diaryInserts[1]).toMatchObject({
      tmdbId: 2,
      title: 'B (canonical)',
      rating: 4.5,
    });
    expect(out.watchlistInserts).toHaveLength(1);
    expect(out.watchlistInserts[0]).toMatchObject({
      tmdbId: 3,
      mediaType: 'movie',
      title: 'C (canonical)',
    });
  });

  test('unmatched names surface in unmatchedTitles', () => {
    const out = assembleInserts(parsed, matches, []);
    expect(out.unmatchedTitles).toContain('No-TMDB');
    expect(out.unmatchedTitles).toContain('No-TMDB-Either');
  });

  test('review notes propagate via URI', () => {
    const reviews = [review({ uri: 'A', name: 'A', review: 'Great film' })];
    const out = assembleInserts(parsed, matches, reviews);
    const a = out.diaryInserts.find((d) => d.tmdbId === 1);
    expect(a?.note).toBe('Great film');
  });

  test('dedupes diary inserts by (tmdbId, watchedDate) within the batch', () => {
    const duped = {
      diary: [
        diary({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
        diary({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
      ],
      watchlist: [],
    };
    const out = assembleInserts(duped, matches, []);
    expect(out.diaryInserts).toHaveLength(1);
  });
});
