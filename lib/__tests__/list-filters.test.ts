import {
  applyFilters,
  applySort,
  countActiveFilters,
  EMPTY_FILTERS,
  isEmptyFilters,
  matchesFilters,
  type FilterAccessors,
  type ListFilters,
} from '@/lib/list-filters';

type Row = {
  id: number;
  mediaType: 'movie' | 'tv';
  year: string | null;
  genreIds: number[] | null;
  title: string;
};

const accessors: FilterAccessors<Row> = {
  getMediaType: (r) => r.mediaType,
  getYear: (r) => r.year,
  getGenreIds: (r) => r.genreIds,
};

function row(over: Partial<Row> & Pick<Row, 'id'>): Row {
  return {
    mediaType: 'movie',
    year: '2020',
    genreIds: [18],
    title: `Film ${over.id}`,
    ...over,
  };
}

const drama = 18;
const thriller = 53;

describe('isEmptyFilters / countActiveFilters', () => {
  test('EMPTY_FILTERS is empty', () => {
    expect(isEmptyFilters(EMPTY_FILTERS)).toBe(true);
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  test('non-default mediaType counts', () => {
    const f: ListFilters = { ...EMPTY_FILTERS, mediaType: 'movie' };
    expect(isEmptyFilters(f)).toBe(false);
    expect(countActiveFilters(f)).toBe(1);
  });

  test('all three filters active', () => {
    const f: ListFilters = { mediaType: 'tv', genreId: 18, decade: 1990 };
    expect(countActiveFilters(f)).toBe(3);
  });
});

describe('matchesFilters', () => {
  test('empty filters → everything passes', () => {
    expect(matchesFilters(row({ id: 1 }), EMPTY_FILTERS, accessors)).toBe(true);
  });

  test('mediaType "movie" excludes tv rows', () => {
    const f = { ...EMPTY_FILTERS, mediaType: 'movie' as const };
    expect(matchesFilters(row({ id: 1, mediaType: 'movie' }), f, accessors)).toBe(true);
    expect(matchesFilters(row({ id: 2, mediaType: 'tv' }), f, accessors)).toBe(false);
  });

  test('genreId filter passes when item has the genre', () => {
    const f = { ...EMPTY_FILTERS, genreId: drama };
    expect(matchesFilters(row({ id: 1, genreIds: [drama, thriller] }), f, accessors)).toBe(true);
    expect(matchesFilters(row({ id: 2, genreIds: [thriller] }), f, accessors)).toBe(false);
  });

  test('genreId filter is inclusive when item has no cache (genreIds === null)', () => {
    const f = { ...EMPTY_FILTERS, genreId: drama };
    expect(matchesFilters(row({ id: 1, genreIds: null }), f, accessors)).toBe(true);
  });

  test('genreId filter excludes when item has empty genreIds []', () => {
    // [] means we know the genres and they're empty — different from null.
    const f = { ...EMPTY_FILTERS, genreId: drama };
    expect(matchesFilters(row({ id: 1, genreIds: [] }), f, accessors)).toBe(false);
  });

  test('decade filter matches start year + 9 inclusive', () => {
    const f = { ...EMPTY_FILTERS, decade: 1990 };
    expect(matchesFilters(row({ id: 1, year: '1990' }), f, accessors)).toBe(true);
    expect(matchesFilters(row({ id: 2, year: '1999' }), f, accessors)).toBe(true);
    expect(matchesFilters(row({ id: 3, year: '2000' }), f, accessors)).toBe(false);
    expect(matchesFilters(row({ id: 4, year: '1989' }), f, accessors)).toBe(false);
  });

  test('decade filter excludes rows with no year', () => {
    const f = { ...EMPTY_FILTERS, decade: 1990 };
    expect(matchesFilters(row({ id: 1, year: null }), f, accessors)).toBe(false);
  });

  test('multiple filters AND together', () => {
    const f: ListFilters = { mediaType: 'movie', genreId: drama, decade: 1990 };
    expect(
      matchesFilters(
        row({ id: 1, mediaType: 'movie', genreIds: [drama], year: '1994' }),
        f,
        accessors,
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        row({ id: 2, mediaType: 'tv', genreIds: [drama], year: '1994' }),
        f,
        accessors,
      ),
    ).toBe(false);
  });
});

describe('applyFilters', () => {
  test('passes through input when filters empty', () => {
    const rows = [row({ id: 1 }), row({ id: 2 })];
    expect(applyFilters(rows, EMPTY_FILTERS, accessors)).toBe(rows);
  });

  test('filters by genre across a list', () => {
    const rows = [
      row({ id: 1, genreIds: [drama] }),
      row({ id: 2, genreIds: [thriller] }),
      row({ id: 3, genreIds: [drama, thriller] }),
    ];
    const out = applyFilters(rows, { ...EMPTY_FILTERS, genreId: drama }, accessors);
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });
});

describe('applySort', () => {
  type Sort = 'year-desc' | 'title-asc';
  const cmp: Record<Sort, (a: Row, b: Row) => number> = {
    'year-desc': (a, b) => Number(b.year ?? 0) - Number(a.year ?? 0),
    'title-asc': (a, b) => a.title.localeCompare(b.title),
  };

  test('sorts by year desc', () => {
    const rows = [row({ id: 1, year: '1995' }), row({ id: 2, year: '2020' })];
    expect(applySort(rows, 'year-desc', cmp).map((r) => r.id)).toEqual([2, 1]);
  });

  test('does not mutate the input', () => {
    const rows = [row({ id: 1, year: '1995' }), row({ id: 2, year: '2020' })];
    applySort(rows, 'year-desc', cmp);
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });
});
