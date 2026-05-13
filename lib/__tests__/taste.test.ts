import {
  tasteProfile,
  clustersForGenres,
  weightedMedian,
  MOOD_BY_TMDB_GENRE,
} from '@/lib/taste';
import type { StatsEntry, StatsCacheRow } from '@/lib/stats';

// ---------- fixtures ----------

function entry(over: Partial<StatsEntry> & Pick<StatsEntry, 'tmdbId'>): StatsEntry {
  return {
    mediaType: 'movie',
    seasonNumber: null,
    year: '2024',
    watchedDate: '2025-06-15',
    rating: 4,
    ...over,
  };
}

function cacheRow(
  over: Partial<StatsCacheRow> & Pick<StatsCacheRow, 'tmdbId' | 'mediaType'>,
): StatsCacheRow {
  return {
    genreIds: [],
    runtime: null,
    director: null,
    directorIds: [],
    seasons: [],
    popularity: null,
    ...over,
  };
}

// Genre IDs we'll reuse:
// 18 Drama → storyDriven
// 53 Thriller → intense
// 35 Comedy → feelGood
// 28 Action → escapist
// 99 Documentary → cerebral
// 10770 TV Movie → no cluster

// ---------- weightedMedian ----------

describe('weightedMedian', () => {
  test('returns null for empty input', () => {
    expect(weightedMedian([], [])).toBeNull();
  });

  test('picks the weighted-half value', () => {
    expect(weightedMedian([1, 2, 3], [1, 1, 1])).toBe(2);
    expect(weightedMedian([1, 10], [1, 100])).toBe(10);
  });

  test('ignores values whose weight is zero', () => {
    expect(weightedMedian([1, 2, 3], [0, 1, 0])).toBe(2);
  });
});

// ---------- clustersForGenres ----------

describe('clustersForGenres', () => {
  test('maps known genre IDs', () => {
    expect(clustersForGenres([18])).toEqual(['storyDriven']);
  });

  test('dedupes when multiple genres map to the same cluster', () => {
    // 27 Horror + 53 Thriller both → intense
    expect(clustersForGenres([27, 53])).toEqual(['intense']);
  });

  test('skips IDs not in MOOD_BY_TMDB_GENRE', () => {
    expect(clustersForGenres([10770, 18])).toEqual(['storyDriven']);
    expect(MOOD_BY_TMDB_GENRE.has(10770)).toBe(false);
  });
});

// ---------- tasteProfile: empty / sparse ----------

describe('tasteProfile — empty / sparse', () => {
  test('empty entries → confidence empty', () => {
    const p = tasteProfile([], []);
    expect(p.ratedCount).toBe(0);
    expect(p.confidence).toBe('empty');
    expect(p.genreLead.cluster).toBeNull();
    expect(p.era.readout).toBe('—');
    expect(p.popularity.bucket).toBe('unknown');
  });

  test('rating 0 entries are ignored (consumption, not taste)', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1, rating: 0 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', genreIds: [18] })],
    );
    expect(p.ratedCount).toBe(0);
    expect(p.confidence).toBe('empty');
  });

  test('confidence boundaries: 1 → low, 19 → low, 20 → full', () => {
    const oneRated = tasteProfile([entry({ tmdbId: 1, rating: 4 })], []);
    expect(oneRated.confidence).toBe('low');
    const nineteen: StatsEntry[] = Array.from({ length: 19 }, (_, i) =>
      entry({ tmdbId: i + 1, rating: 4 }),
    );
    expect(tasteProfile(nineteen, []).confidence).toBe('low');
    const twenty: StatsEntry[] = Array.from({ length: 20 }, (_, i) =>
      entry({ tmdbId: i + 1, rating: 4 }),
    );
    expect(tasteProfile(twenty, []).confidence).toBe('full');
  });
});

// ---------- tasteProfile: genre mix ----------

describe('tasteProfile — genreMix', () => {
  test('single-genre film puts 100% in its cluster', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1, rating: 4 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', genreIds: [18] })],
    );
    expect(p.genreMix.storyDriven).toBe(1);
    expect(p.genreLead.cluster).toBe('storyDriven');
  });

  test('multi-genre film distributes fractionally across mood clusters', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1, rating: 4 })],
      // 18 Drama (storyDriven) + 53 Thriller (intense) → 2 distinct clusters → 0.5 each
      [cacheRow({ tmdbId: 1, mediaType: 'movie', genreIds: [18, 53] })],
    );
    expect(p.genreMix.storyDriven).toBeCloseTo(0.5, 5);
    expect(p.genreMix.intense).toBeCloseTo(0.5, 5);
  });

  test('rating weight: a 5-star single-genre beats four 1-star films of another genre', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, rating: 5 }),
        entry({ tmdbId: 2, rating: 1 }),
        entry({ tmdbId: 3, rating: 1 }),
        entry({ tmdbId: 4, rating: 1 }),
        entry({ tmdbId: 5, rating: 1 }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', genreIds: [99] }), // cerebral, 5★
        cacheRow({ tmdbId: 2, mediaType: 'movie', genreIds: [35] }), // feelGood, 1★
        cacheRow({ tmdbId: 3, mediaType: 'movie', genreIds: [35] }),
        cacheRow({ tmdbId: 4, mediaType: 'movie', genreIds: [35] }),
        cacheRow({ tmdbId: 5, mediaType: 'movie', genreIds: [35] }),
      ],
    );
    // cerebral weight: 5; feelGood weight: 4 → cerebral leads.
    expect(p.genreLead.cluster).toBe('cerebral');
  });

  test('films with only non-mappable genres do not crash and contribute 0', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, rating: 4 }), // 10770 TV Movie → no cluster
        entry({ tmdbId: 2, rating: 4 }), // 18 Drama → storyDriven
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', genreIds: [10770] }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', genreIds: [18] }),
      ],
    );
    expect(p.genreMix.storyDriven).toBe(1);
  });
});

// ---------- tasteProfile: era ----------

describe('tasteProfile — era', () => {
  test('single decade → anchored', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, year: '1994' }),
        entry({ tmdbId: 2, year: '1997' }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie' }),
        cacheRow({ tmdbId: 2, mediaType: 'movie' }),
      ],
    );
    expect(p.era.modalDecade).toBe(1990);
    expect(p.era.readout).toBe('Anchored in the 1990s');
  });

  test('breadth across ≥4 decades → spread readout', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, year: '1974' }),
        entry({ tmdbId: 2, year: '1984' }),
        entry({ tmdbId: 3, year: '1994' }),
        entry({ tmdbId: 4, year: '2004' }),
        entry({ tmdbId: 5, year: '2014' }),
      ],
      [],
    );
    expect(p.era.spread).toBeGreaterThanOrEqual(4);
    expect(p.era.readout).toBe('Spread across decades');
  });
});

// ---------- tasteProfile: runtime ----------

describe('tasteProfile — runtime', () => {
  const cases: { runtime: number; label: string }[] = [
    { runtime: 80, label: 'Prefers tight pieces' },
    { runtime: 89, label: 'Prefers tight pieces' },
    { runtime: 90, label: 'Standard runtimes' },
    { runtime: 119, label: 'Standard runtimes' },
    { runtime: 120, label: 'Long-form viewer' },
    { runtime: 149, label: 'Long-form viewer' },
    { runtime: 150, label: 'Loves epics' },
    { runtime: 200, label: 'Loves epics' },
  ];
  test.each(cases)('runtime $runtime → "$label"', ({ runtime, label }) => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', runtime })],
    );
    expect(p.runtime.readout.startsWith(label)).toBe(true);
  });

  test('high spread appends spread suffix', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, rating: 5 }),
        entry({ tmdbId: 2, rating: 5 }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', runtime: 60 }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', runtime: 200 }),
      ],
    );
    expect(p.runtime.readout).toMatch(/spread$/);
  });

  test('TV-only catalogue → no runtime data', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1, mediaType: 'tv_season', seasonNumber: 1 })],
      [cacheRow({ tmdbId: 1, mediaType: 'tv', runtime: 50 })],
    );
    expect(p.runtime.meanMinutes).toBeNull();
    expect(p.runtime.readout).toBe('—');
  });
});

// ---------- tasteProfile: recencyVelocity ----------

describe('tasteProfile — recencyVelocity', () => {
  test('zero-lag films → "Chases new releases"', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, year: '2024', watchedDate: '2024-08-01' }),
        entry({ tmdbId: 2, year: '2025', watchedDate: '2025-02-01' }),
      ],
      [],
    );
    expect(p.recencyVelocity.medianLagYears).toBe(0);
    expect(p.recencyVelocity.readout).toBe('Chases new releases');
  });

  test('30-year lag → "Deep catalog viewer"', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, year: '1990', watchedDate: '2024-01-01' }),
        entry({ tmdbId: 2, year: '1985', watchedDate: '2024-06-01' }),
      ],
      [],
    );
    expect(p.recencyVelocity.medianLagYears).toBeGreaterThan(15);
    expect(p.recencyVelocity.readout).toBe('Deep catalog viewer');
  });
});

// ---------- tasteProfile: popularity ----------

describe('tasteProfile — popularity', () => {
  test('null popularity column → unknown', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', popularity: null })],
    );
    expect(p.popularity.bucket).toBe('unknown');
    expect(p.popularity.readout).toBe('—');
  });

  test('low median → cult', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 }), entry({ tmdbId: 2 })],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', popularity: 3 }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', popularity: 5 }),
      ],
    );
    expect(p.popularity.bucket).toBe('cult');
  });

  test('mid median → balanced', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', popularity: 15 })],
    );
    expect(p.popularity.bucket).toBe('balanced');
  });

  test('high median → mainstream', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 })],
      [cacheRow({ tmdbId: 1, mediaType: 'movie', popularity: 80 })],
    );
    expect(p.popularity.bucket).toBe('mainstream');
  });
});

// ---------- tasteProfile: loyalty ----------

describe('tasteProfile — loyalty', () => {
  test('dominant director (≥30% share) → "Follows directors"', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1 }),
        entry({ tmdbId: 2 }),
        entry({ tmdbId: 3 }),
      ],
      [
        cacheRow({ tmdbId: 1, mediaType: 'movie', director: 'Greta Gerwig' }),
        cacheRow({ tmdbId: 2, mediaType: 'movie', director: 'Greta Gerwig' }),
        cacheRow({ tmdbId: 3, mediaType: 'movie', director: 'Other Filmmaker' }),
      ],
    );
    expect(p.loyalty.topDirector).toBe('Greta Gerwig');
    expect(p.loyalty.topShare).toBeCloseTo(2 / 3, 5);
    expect(p.loyalty.readout).toBe('Follows Greta Gerwig');
  });

  test('breadth viewer (<10%)', () => {
    const films = Array.from({ length: 12 }, (_, i) => ({
      tmdbId: i + 1,
      director: `Director ${i + 1}`,
    }));
    const p = tasteProfile(
      films.map((f) => entry({ tmdbId: f.tmdbId })),
      films.map((f) =>
        cacheRow({ tmdbId: f.tmdbId, mediaType: 'movie', director: f.director }),
      ),
    );
    expect(p.loyalty.readout).toBe('Breadth viewer');
  });

  test('topDirectorId is carried through from cache.directorIds', () => {
    const p = tasteProfile(
      [entry({ tmdbId: 1 }), entry({ tmdbId: 2 })],
      [
        cacheRow({
          tmdbId: 1,
          mediaType: 'movie',
          director: 'Greta Gerwig',
          directorIds: [12345],
        }),
        cacheRow({
          tmdbId: 2,
          mediaType: 'movie',
          director: 'Greta Gerwig',
          directorIds: [12345],
        }),
      ],
    );
    expect(p.loyalty.topDirector).toBe('Greta Gerwig');
    expect(p.loyalty.topDirectorId).toBe(12345);
  });
});

// ---------- tasteProfile: ratingStyle ----------

describe('tasteProfile — ratingStyle', () => {
  test('generous rater + low IQR → "even-handed"', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, rating: 4 }),
        entry({ tmdbId: 2, rating: 4.5 }),
        entry({ tmdbId: 3, rating: 4 }),
      ],
      [],
    );
    expect(p.ratingStyle.readout).toBe('Generous rater · even-handed');
  });

  test('hard grader + high IQR → "strong opinions"', () => {
    const p = tasteProfile(
      [
        entry({ tmdbId: 1, rating: 1 }),
        entry({ tmdbId: 2, rating: 2 }),
        entry({ tmdbId: 3, rating: 4.5 }),
      ],
      [],
    );
    expect(p.ratingStyle.readout).toMatch(/^Hard grader|^Balanced/);
    expect(p.ratingStyle.readout).toContain('strong opinions');
  });
});
