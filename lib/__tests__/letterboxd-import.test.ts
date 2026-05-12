import {
  buildParsedExport,
  collectMatchTargets,
  matchTargets,
  pickBestMatch,
  assembleInserts,
  matchKey,
  type MatchResult,
  type MergedDiaryRow,
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

// Helper for assembleInserts tests — ParsedExport.diary is now MergedDiaryRow[].
const merged = (
  over: Partial<MergedDiaryRow> & Pick<MergedDiaryRow, 'uri' | 'name'>,
): MergedDiaryRow => ({
  date: '2025-01-01',
  year: '2024',
  rating: 4,
  watchedDate: '2024-12-15',
  review: '',
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
  test('reviews merge into diary by film — different URIs', () => {
    // Letterboxd assigns a different URI to each CSV row even for the same film,
    // so URI-based merge would create duplicates. Film-key merge fixes it.
    const out = buildParsedExport({
      diary: [diary({ uri: 'diary-uri-1', name: 'A', watchedDate: '2024-01-01' })],
      reviews: [
        review({
          uri: 'review-uri-1',
          name: 'A',
          watchedDate: '2024-01-01',
          review: 'My take.',
        }),
      ],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
    expect(out.diary[0].review).toBe('My take.');
  });

  test('review with a different watchedDate still pairs to the diary row of the same film', () => {
    // Real-world case from a Letterboxd export: the user wrote a review days
    // later and Letterboxd stamped the review row with a different "Watched
    // Date" than the original diary row. With name+year+watchedDate as the
    // strict key, these would emit as two duplicate entries.
    const out = buildParsedExport({
      diary: [
        diary({
          uri: 'd',
          name: 'Predator: Badlands',
          year: '2025',
          watchedDate: '2025-11-08',
        }),
      ],
      reviews: [
        review({
          uri: 'r',
          name: 'Predator: Badlands',
          year: '2025',
          watchedDate: '2025-11-12',
          review: 'Loved it',
        }),
      ],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
    expect(out.diary[0].review).toBe('Loved it');
    // The diary row's original watchedDate stays — that's the canonical one.
    expect(out.diary[0].watchedDate).toBe('2025-11-08');
  });

  test('multiple diary rows + multiple reviews → closest-date pairing', () => {
    // Genuine rewatch: two diary entries, two reviews; the closer-dated pair
    // matches up correctly so each review attaches to its own watch.
    const out = buildParsedExport({
      diary: [
        diary({ uri: 'd1', name: 'X', year: '2010', watchedDate: '2020-01-01' }),
        diary({ uri: 'd2', name: 'X', year: '2010', watchedDate: '2024-06-01' }),
      ],
      reviews: [
        review({
          uri: 'r1',
          name: 'X',
          year: '2010',
          watchedDate: '2020-01-05',
          review: 'first watch',
        }),
        review({
          uri: 'r2',
          name: 'X',
          year: '2010',
          watchedDate: '2024-06-02',
          review: 'rewatch',
        }),
      ],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(2);
    const byWatched = Object.fromEntries(
      out.diary.map((d) => [d.watchedDate, d.review]),
    );
    expect(byWatched['2020-01-01']).toBe('first watch');
    expect(byWatched['2024-06-01']).toBe('rewatch');
  });

  test('reviewed films do not double-emit even when reviews.csv is processed second', () => {
    // The regression: prior URI-based logic would add review rows as new
    // diary entries whenever URIs differed (which is always).
    const out = buildParsedExport({
      diary: [
        diary({ uri: 'd1', name: 'Inception', year: '2010', watchedDate: '2024-12-15' }),
        diary({ uri: 'd2', name: 'Tenet', year: '2020', watchedDate: '2025-01-01' }),
      ],
      reviews: [
        review({
          uri: 'r1',
          name: 'Inception',
          year: '2010',
          watchedDate: '2024-12-15',
          review: 'Wow',
        }),
        review({
          uri: 'r2',
          name: 'Tenet',
          year: '2020',
          watchedDate: '2025-01-01',
          review: 'OK',
        }),
      ],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(2);
    expect(out.diary.map((d) => d.review).sort()).toEqual(['OK', 'Wow']);
  });

  test('standalone review (no matching diary row) becomes a diary row', () => {
    const out = buildParsedExport({
      diary: [],
      reviews: [
        review({ uri: 'r', name: 'Solo Review', watchedDate: '2024-06-01' }),
      ],
      watched: [],
      watchlist: [],
    });
    expect(out.diary).toHaveLength(1);
    expect(out.diary[0].name).toBe('Solo Review');
  });

  test('watched.csv rows overlapping diary by film are dropped', () => {
    // URIs differ but (name, year) matches — the watched row should be skipped.
    const out = buildParsedExport({
      diary: [diary({ uri: 'd1', name: 'A', year: '2010' })],
      reviews: [],
      watched: [watched({ uri: 'w1', name: 'A', year: '2010' })],
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

  test('watchlist dedupes by (name, year)', () => {
    const out = buildParsedExport({
      diary: [],
      reviews: [],
      watched: [],
      watchlist: [
        watchlist({ uri: 'w1', name: 'A', year: '2020' }),
        watchlist({ uri: 'w2', name: 'A', year: '2020' }),
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
        merged({ uri: 'A', name: 'Inception', year: '2010' }),
        merged({ uri: 'B', name: 'Inception', year: '2010' }),
        merged({ uri: 'C', name: 'Inception', year: '2010', watchedDate: '2020-01-01' }),
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
      merged({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
      merged({
        uri: 'B',
        name: 'B',
        year: '2020',
        watchedDate: '2024-02-02',
        rating: 4.5,
      }),
      merged({
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
    const out = assembleInserts(parsed, matches);
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
    const out = assembleInserts(parsed, matches);
    expect(out.unmatchedTitles).toContain('No-TMDB');
    expect(out.unmatchedTitles).toContain('No-TMDB-Either');
  });

  test('review text on the merged row propagates to the note field', () => {
    const parsedWithReview = {
      diary: [
        merged({
          uri: 'A',
          name: 'A',
          year: '2010',
          watchedDate: '2024-01-01',
          review: 'Great film',
        }),
      ],
      watchlist: [],
    };
    const out = assembleInserts(parsedWithReview, matches);
    expect(out.diaryInserts[0].note).toBe('Great film');
  });

  test('dedupes diary inserts by (tmdbId, watchedDate) within the batch', () => {
    const duped = {
      diary: [
        merged({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
        merged({ uri: 'A', name: 'A', year: '2010', watchedDate: '2024-01-01' }),
      ],
      watchlist: [],
    };
    const out = assembleInserts(duped, matches);
    expect(out.diaryInserts).toHaveLength(1);
  });
});
