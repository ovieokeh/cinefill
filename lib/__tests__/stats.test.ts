import {
  summary,
  ratingDistribution,
  decadeDistribution,
  monthlyActivity,
  topRated,
  genreDistribution,
  filmHoursWatched,
  tvSeasonHoursWatched,
  topDirectors,
  type StatsEntry,
  type StatsCacheRow,
  type GenreMap,
} from '@/lib/stats';

function entry(overrides: Partial<StatsEntry> & Pick<StatsEntry, 'tmdbId'>): StatsEntry {
  return {
    mediaType: 'movie',
    seasonNumber: null,
    year: '2024',
    watchedDate: '2024-06-15',
    rating: 4,
    ...overrides,
  };
}

function cacheRow(
  overrides: Partial<StatsCacheRow> & Pick<StatsCacheRow, 'tmdbId' | 'mediaType'>,
): StatsCacheRow {
  return {
    genreIds: [],
    runtime: null,
    director: null,
    directorIds: [],
    seasons: [],
    popularity: null,
    ...overrides,
  };
}

const movieGenres: GenreMap = new Map([
  [18, 'Drama'],
  [28, 'Action'],
  [12, 'Adventure'],
  [35, 'Comedy'],
]);

const tvGenres: GenreMap = new Map([
  [18, 'Drama'], // same id, same name (TMDB happens to align)
  [10765, 'Sci-Fi & Fantasy'],
  [35, 'Comedy'],
]);

// ----------- summary -----------

describe('summary', () => {
  test('empty array returns all-zero summary', () => {
    const s = summary([], new Date('2024-06-15'));
    expect(s).toEqual({
      totalMovies: 0,
      totalSeasons: 0,
      currentYearMovies: 0,
      currentYearSeasons: 0,
      avgRating: 0,
    });
  });

  test('counts movies vs tv_seasons separately', () => {
    const s = summary(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 2, mediaType: 'movie' }),
        entry({ tmdbId: 3, mediaType: 'tv_season' }),
      ],
      new Date('2024-06-15'),
    );
    expect(s.totalMovies).toBe(2);
    expect(s.totalSeasons).toBe(1);
  });

  test('isolates current-year counts via watchedDate', () => {
    const s = summary(
      [
        entry({ tmdbId: 1, watchedDate: '2024-01-01' }),
        entry({ tmdbId: 2, watchedDate: '2023-12-31' }),
        entry({ tmdbId: 3, mediaType: 'tv_season', watchedDate: '2024-08-15' }),
        entry({ tmdbId: 4, mediaType: 'tv_season', watchedDate: '2022-05-01' }),
      ],
      new Date('2024-06-15'),
    );
    expect(s.currentYearMovies).toBe(1);
    expect(s.currentYearSeasons).toBe(1);
  });

  test('avgRating ignores rating-0 entries', () => {
    const s = summary(
      [
        entry({ tmdbId: 1, rating: 5 }),
        entry({ tmdbId: 2, rating: 0 }), // unrated — excluded
        entry({ tmdbId: 3, rating: 3 }),
      ],
      new Date('2024-06-15'),
    );
    expect(s.avgRating).toBe(4);
  });

  test('avgRating is 0 when no rated entries', () => {
    const s = summary([entry({ tmdbId: 1, rating: 0 })], new Date('2024-06-15'));
    expect(s.avgRating).toBe(0);
  });
});

// ----------- ratingDistribution -----------

describe('ratingDistribution', () => {
  test('empty input → 10 zero-count buckets with correct labels', () => {
    const buckets = ratingDistribution([]);
    expect(buckets).toHaveLength(10);
    expect(buckets.map((b) => b.label)).toEqual(
      ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'],
    );
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  test('buckets each half-star value correctly', () => {
    const buckets = ratingDistribution([
      entry({ tmdbId: 1, rating: 0.5 }),
      entry({ tmdbId: 2, rating: 3 }),
      entry({ tmdbId: 3, rating: 3 }),
      entry({ tmdbId: 4, rating: 5 }),
    ]);
    const map = Object.fromEntries(buckets.map((b) => [b.label, b.count]));
    expect(map['0.5']).toBe(1);
    expect(map['3.0']).toBe(2);
    expect(map['5.0']).toBe(1);
    expect(map['4.5']).toBe(0);
  });

  test('excludes rating-0 entries', () => {
    const buckets = ratingDistribution([
      entry({ tmdbId: 1, rating: 0 }),
      entry({ tmdbId: 2, rating: 0 }),
    ]);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });
});

// ----------- decadeDistribution -----------

describe('decadeDistribution', () => {
  test('empty array → empty result', () => {
    expect(decadeDistribution([])).toEqual([]);
  });

  test('groups by decade DESC; older bucket pinned last', () => {
    const buckets = decadeDistribution([
      entry({ tmdbId: 1, year: '2024' }),
      entry({ tmdbId: 2, year: '2019' }),
      entry({ tmdbId: 3, year: '2015' }),
      entry({ tmdbId: 4, year: '1965' }),
      entry({ tmdbId: 5, year: '1999' }),
    ]);
    expect(buckets.map((b) => b.label)).toEqual(['2020s', '2010s', '1990s', 'older']);
    expect(buckets.find((b) => b.label === '2010s')?.count).toBe(2);
    expect(buckets.find((b) => b.label === 'older')?.count).toBe(1);
  });

  test('null-year entries are excluded', () => {
    const buckets = decadeDistribution([
      entry({ tmdbId: 1, year: null }),
      entry({ tmdbId: 2, year: '2020' }),
    ]);
    expect(buckets).toEqual([{ label: '2020s', count: 1 }]);
  });
});

// ----------- monthlyActivity -----------

describe('monthlyActivity', () => {
  test('exactly N buckets, anchored to now, oldest first', () => {
    const buckets = monthlyActivity([], 12, new Date(2024, 5, 15)); // June 2024
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toEqual({ year: 2023, month: 6, count: 0 }); // July 2023
    expect(buckets[11]).toEqual({ year: 2024, month: 5, count: 0 }); // June 2024
  });

  test('correctly counts entries in window and ignores out-of-window', () => {
    const buckets = monthlyActivity(
      [
        entry({ tmdbId: 1, watchedDate: '2024-06-01' }),
        entry({ tmdbId: 2, watchedDate: '2024-06-30' }),
        entry({ tmdbId: 3, watchedDate: '2024-02-15' }),
        entry({ tmdbId: 4, watchedDate: '2022-01-01' }), // outside the 12-month window
      ],
      12,
      new Date(2024, 5, 15),
    );
    expect(buckets.find((b) => b.year === 2024 && b.month === 5)?.count).toBe(2);
    expect(buckets.find((b) => b.year === 2024 && b.month === 1)?.count).toBe(1);
    const total = buckets.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(3); // the 2022 one is excluded
  });

  test('window of 0 returns no buckets', () => {
    expect(monthlyActivity([entry({ tmdbId: 1 })], 0, new Date(2024, 5, 15))).toEqual([]);
  });
});

// ----------- topRated -----------

describe('topRated', () => {
  test('returns DESC by rating', () => {
    const result = topRated(
      [
        entry({ tmdbId: 1, rating: 3 }),
        entry({ tmdbId: 2, rating: 5 }),
        entry({ tmdbId: 3, rating: 4 }),
      ],
      5,
    );
    expect(result.map((e) => e.tmdbId)).toEqual([2, 3, 1]);
  });

  test('breaks ties by watchedDate DESC', () => {
    const result = topRated(
      [
        entry({ tmdbId: 1, rating: 5, watchedDate: '2024-01-01' }),
        entry({ tmdbId: 2, rating: 5, watchedDate: '2024-06-15' }),
        entry({ tmdbId: 3, rating: 5, watchedDate: '2024-03-01' }),
      ],
      5,
    );
    expect(result.map((e) => e.tmdbId)).toEqual([2, 3, 1]);
  });

  test('respects limit and ignores rating-0', () => {
    const result = topRated(
      [
        entry({ tmdbId: 1, rating: 5 }),
        entry({ tmdbId: 2, rating: 4 }),
        entry({ tmdbId: 3, rating: 0 }),
        entry({ tmdbId: 4, rating: 3 }),
      ],
      2,
    );
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.tmdbId)).toEqual([1, 2]);
  });

  test('limit 0 returns empty', () => {
    expect(topRated([entry({ tmdbId: 1, rating: 5 })], 0)).toEqual([]);
  });
});

// ----------- genreDistribution -----------

describe('genreDistribution', () => {
  test('empty inputs → empty result', () => {
    expect(genreDistribution([], [], movieGenres, tvGenres, 5)).toEqual([]);
  });

  test('combines movie + tv genres deduped by name', () => {
    const result = genreDistribution(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 200, mediaType: 'tv_season' }),
      ],
      [
        cacheRow({ tmdbId: 100, mediaType: 'movie', genreIds: [18] }),
        cacheRow({ tmdbId: 200, mediaType: 'tv', genreIds: [18] }),
      ],
      movieGenres,
      tvGenres,
      5,
    );
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Drama');
    expect(result[0].count).toBe(2);
  });

  test('sorts by count DESC and respects limit', () => {
    const result = genreDistribution(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 101, mediaType: 'movie' }),
        entry({ tmdbId: 102, mediaType: 'movie' }),
        entry({ tmdbId: 103, mediaType: 'movie' }),
      ],
      [
        cacheRow({ tmdbId: 100, mediaType: 'movie', genreIds: [18, 28] }), // Drama + Action
        cacheRow({ tmdbId: 101, mediaType: 'movie', genreIds: [18] }), // Drama
        cacheRow({ tmdbId: 102, mediaType: 'movie', genreIds: [18, 12] }), // Drama + Adventure
        cacheRow({ tmdbId: 103, mediaType: 'movie', genreIds: [28] }), // Action
      ],
      movieGenres,
      tvGenres,
      2,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'Drama', count: 3 });
    expect(result[1]).toMatchObject({ label: 'Action', count: 2 });
  });

  test('skips entries with no cache row', () => {
    const result = genreDistribution(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 999, mediaType: 'movie' }), // no cache row
      ],
      [cacheRow({ tmdbId: 100, mediaType: 'movie', genreIds: [18] })],
      movieGenres,
      tvGenres,
      5,
    );
    expect(result).toEqual([
      { label: 'Drama', count: 1, dominantMediaType: 'movie', dominantGenreId: 18 },
    ]);
  });

  test('tv_season entries resolve to the show\'s tv cache row', () => {
    const result = genreDistribution(
      [
        entry({ tmdbId: 200, mediaType: 'tv_season' }), // S1
        entry({ tmdbId: 200, mediaType: 'tv_season' }), // S2 — same show
      ],
      [cacheRow({ tmdbId: 200, mediaType: 'tv', genreIds: [10765] })],
      movieGenres,
      tvGenres,
      5,
    );
    expect(result).toEqual([
      {
        label: 'Sci-Fi & Fantasy',
        count: 2,
        dominantMediaType: 'tv',
        dominantGenreId: 10765,
      },
    ]);
  });

  test('dominantMediaType picks the side with more contributions', () => {
    const result = genreDistribution(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 101, mediaType: 'movie' }),
        entry({ tmdbId: 200, mediaType: 'tv_season' }),
      ],
      [
        cacheRow({ tmdbId: 100, mediaType: 'movie', genreIds: [35] }),
        cacheRow({ tmdbId: 101, mediaType: 'movie', genreIds: [35] }),
        cacheRow({ tmdbId: 200, mediaType: 'tv', genreIds: [35] }),
      ],
      movieGenres,
      tvGenres,
      5,
    );
    expect(result).toEqual([
      { label: 'Comedy', count: 3, dominantMediaType: 'movie', dominantGenreId: 35 },
    ]);
  });

  test('limit 0 returns empty', () => {
    expect(
      genreDistribution(
        [entry({ tmdbId: 100, mediaType: 'movie' })],
        [cacheRow({ tmdbId: 100, mediaType: 'movie', genreIds: [18] })],
        movieGenres,
        tvGenres,
        0,
      ),
    ).toEqual([]);
  });
});

// ----------- filmHoursWatched -----------

describe('filmHoursWatched', () => {
  test('empty inputs → 0', () => {
    expect(filmHoursWatched([], [])).toBe(0);
  });

  test('sums runtime for movie entries only', () => {
    const hours = filmHoursWatched(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 200, mediaType: 'tv_season' }), // ignored
      ],
      [
        cacheRow({ tmdbId: 100, mediaType: 'movie', runtime: 120 }),
        cacheRow({ tmdbId: 200, mediaType: 'tv', runtime: 45 }), // ignored
      ],
    );
    expect(hours).toBe(2);
  });

  test('skips entries with missing cache rows', () => {
    const hours = filmHoursWatched(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 999, mediaType: 'movie' }), // no cache
      ],
      [cacheRow({ tmdbId: 100, mediaType: 'movie', runtime: 90 })],
    );
    expect(hours).toBe(1.5);
  });

  test('skips entries with null runtime in cache', () => {
    const hours = filmHoursWatched(
      [entry({ tmdbId: 100, mediaType: 'movie' })],
      [cacheRow({ tmdbId: 100, mediaType: 'movie', runtime: null })],
    );
    expect(hours).toBe(0);
  });
});

// ----------- tvSeasonHoursWatched -----------

describe('tvSeasonHoursWatched', () => {
  test('empty entries returns 0', () => {
    expect(tvSeasonHoursWatched([], [])).toBe(0);
  });

  test('single matched season → episodeCount × runtime / 60', () => {
    const hours = tvSeasonHoursWatched(
      [entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 })],
      [
        cacheRow({
          tmdbId: 500,
          mediaType: 'tv',
          runtime: 50,
          seasons: [{ seasonNumber: 1, episodeCount: 10 }],
        }),
      ],
    );
    // 10 episodes × 50 min = 500 min = 8.333... hours
    expect(hours).toBeCloseTo(500 / 60, 5);
  });

  test('skips when cache row is missing', () => {
    const hours = tvSeasonHoursWatched(
      [entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 })],
      [],
    );
    expect(hours).toBe(0);
  });

  test('skips when cache row has empty seasons (pre-migration)', () => {
    const hours = tvSeasonHoursWatched(
      [entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 })],
      [cacheRow({ tmdbId: 500, mediaType: 'tv', runtime: 50, seasons: [] })],
    );
    expect(hours).toBe(0);
  });

  test('skips when runtime is null', () => {
    const hours = tvSeasonHoursWatched(
      [entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 })],
      [
        cacheRow({
          tmdbId: 500,
          mediaType: 'tv',
          runtime: null,
          seasons: [{ seasonNumber: 1, episodeCount: 10 }],
        }),
      ],
    );
    expect(hours).toBe(0);
  });

  test('skips when matching season is not in cache', () => {
    const hours = tvSeasonHoursWatched(
      [entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 99 })],
      [
        cacheRow({
          tmdbId: 500,
          mediaType: 'tv',
          runtime: 50,
          seasons: [{ seasonNumber: 1, episodeCount: 10 }],
        }),
      ],
    );
    expect(hours).toBe(0);
  });

  test('sums multiple seasons of the same show', () => {
    const hours = tvSeasonHoursWatched(
      [
        entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 }),
        entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 2 }),
      ],
      [
        cacheRow({
          tmdbId: 500,
          mediaType: 'tv',
          runtime: 60,
          seasons: [
            { seasonNumber: 1, episodeCount: 8 },
            { seasonNumber: 2, episodeCount: 10 },
          ],
        }),
      ],
    );
    // (8 + 10) × 60 = 1080 min = 18 hours
    expect(hours).toBe(18);
  });

  test('ignores movie entries entirely', () => {
    const hours = tvSeasonHoursWatched(
      [
        entry({ tmdbId: 100, mediaType: 'movie' }),
        entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 }),
      ],
      [
        cacheRow({ tmdbId: 100, mediaType: 'movie', runtime: 120 }),
        cacheRow({
          tmdbId: 500,
          mediaType: 'tv',
          runtime: 30,
          seasons: [{ seasonNumber: 1, episodeCount: 12 }],
        }),
      ],
    );
    // 12 × 30 = 360 min = 6 hours (only TV)
    expect(hours).toBe(6);
  });
});

// ----------- topDirectors -----------

describe('topDirectors', () => {
  test('empty inputs return []', () => {
    expect(topDirectors([], [], 5)).toEqual([]);
  });

  test('limit <= 0 returns []', () => {
    expect(
      topDirectors(
        [entry({ tmdbId: 1, mediaType: 'movie' })],
        [cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'A' })],
        0,
      ),
    ).toEqual([]);
  });

  test('single director with single film → count 1', () => {
    const result = topDirectors(
      [entry({ tmdbId: 1, mediaType: 'movie' })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'Greta Gerwig' })],
      5,
    );
    expect(result).toEqual([{ label: 'Greta Gerwig', count: 1 }]);
  });

  test('pairs director names to ids positionally', () => {
    const result = topDirectors(
      [entry({ tmdbId: 1, mediaType: 'movie' })],
      [
        cacheRow({
          tmdbId: 1,
          mediaType: 'movie',
          director: 'Joel Coen & Ethan Coen',
          directorIds: [1054, 1223],
        }),
      ],
      5,
    );
    expect(result).toEqual([
      { label: 'Ethan Coen', count: 1, id: 1223 },
      { label: 'Joel Coen', count: 1, id: 1054 },
    ]);
  });

  test('name without an id surfaces a bucket with id undefined', () => {
    const result = topDirectors(
      [entry({ tmdbId: 1, mediaType: 'movie' })],
      [
        cacheRow({
          tmdbId: 1,
          mediaType: 'movie',
          director: 'Mystery Director',
          directorIds: [],
        }),
      ],
      5,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Mystery Director', count: 1 });
    expect(result[0].id).toBeUndefined();
  });

  test("' & '-joined director string produces two buckets", () => {
    const result = topDirectors(
      [entry({ tmdbId: 1, mediaType: 'movie' })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'Joel Coen & Ethan Coen' })],
      5,
    );
    expect(result).toEqual([
      { label: 'Ethan Coen', count: 1 },
      { label: 'Joel Coen', count: 1 },
    ]);
  });

  test('cross-entry dedup is case-insensitive, first-seen casing wins', () => {
    const result = topDirectors(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 2, mediaType: 'movie' }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'Greta Gerwig' }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', director: 'greta gerwig' }),
      ],
      5,
    );
    expect(result).toEqual([{ label: 'Greta Gerwig', count: 2 }]);
  });

  test('skips null / empty / whitespace director', () => {
    const result = topDirectors(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 2, mediaType: 'movie' }),
        entry({ tmdbId: 3, mediaType: 'movie' }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: null }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', director: '   ' }),
        cacheRow({ tmdbId: 3, mediaType: 'movie', director: 'Real Director' }),
      ],
      5,
    );
    expect(result).toEqual([{ label: 'Real Director', count: 1 }]);
  });

  test('sorts by count DESC, ties by name ASC', () => {
    const result = topDirectors(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 2, mediaType: 'movie' }),
        entry({ tmdbId: 3, mediaType: 'movie' }),
        entry({ tmdbId: 4, mediaType: 'movie' }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'Zhang Yimou' }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', director: 'Akira Kurosawa' }),
        cacheRow({ tmdbId: 3, mediaType: 'movie', director: 'Akira Kurosawa' }),
        cacheRow({ tmdbId: 4, mediaType: 'movie', director: 'Bong Joon-ho' }),
      ],
      5,
    );
    expect(result).toEqual([
      { label: 'Akira Kurosawa', count: 2 },
      { label: 'Bong Joon-ho', count: 1 },
      { label: 'Zhang Yimou', count: 1 },
    ]);
  });

  test('honours the limit', () => {
    const result = topDirectors(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 2, mediaType: 'movie' }),
        entry({ tmdbId: 3, mediaType: 'movie' }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'A Director' }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', director: 'B Director' }),
        cacheRow({ tmdbId: 3, mediaType: 'movie', director: 'C Director' }),
      ],
      2,
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.label)).toEqual(['A Director', 'B Director']);
  });

  test('aggregates TV creators alongside movie directors', () => {
    const result = topDirectors(
      [
        entry({ tmdbId: 1, mediaType: 'movie' }),
        entry({ tmdbId: 500, mediaType: 'tv_season', seasonNumber: 1 }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'David Lynch' }),
        cacheRow({ tmdbId: 500, mediaType: 'tv', director: 'David Lynch & Mark Frost' }),
      ],
      5,
    );
    expect(result).toEqual([
      { label: 'David Lynch', count: 2 },
      { label: 'Mark Frost', count: 1 },
    ]);
  });
});
