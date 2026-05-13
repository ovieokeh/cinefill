import { groupDiaryEntries, ratingLabel, type DiarySortKey } from '@/lib/diary-grouping';
import type { DiaryEntry } from '@/db/diary';

function entry(over: Partial<DiaryEntry> & Pick<DiaryEntry, 'id'>): DiaryEntry {
  return {
    syncId: `diary:${over.id}`,
    tmdbId: 100 + over.id,
    mediaType: 'movie',
    seasonNumber: null,
    seasonName: null,
    title: `Film ${over.id}`,
    year: '2020',
    posterPath: null,
    watchedDate: '2024-03-15',
    rating: 4,
    note: '',
    createdAt: Date.UTC(2024, 2, 15),
    updatedAt: Date.UTC(2024, 2, 15),
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'test',
    ...over,
  };
}

describe('ratingLabel', () => {
  test('unrated for 0', () => {
    expect(ratingLabel(0)).toBe('Unrated');
  });

  test('half-step labels', () => {
    expect(ratingLabel(0.5)).toBe('Half a star');
    expect(ratingLabel(1.5)).toBe('One & a half stars');
    expect(ratingLabel(4.5)).toBe('Four & a half stars');
  });

  test('whole-step labels', () => {
    expect(ratingLabel(1)).toBe('One star');
    expect(ratingLabel(4)).toBe('Four stars');
    expect(ratingLabel(5)).toBe('Five stars');
  });
});

describe('groupDiaryEntries', () => {
  test('recently-watched groups by watchedDate month, newest first', () => {
    const entries = [
      entry({ id: 1, watchedDate: '2024-03-15' }),
      entry({ id: 2, watchedDate: '2024-03-02' }),
      entry({ id: 3, watchedDate: '2024-02-20' }),
      entry({ id: 4, watchedDate: '2023-12-01' }),
    ];
    const sections = groupDiaryEntries('recently-watched', entries);
    expect(sections.map((s) => s.label)).toEqual([
      'March 2024',
      'February 2024',
      'December 2023',
    ]);
    expect(sections[0]?.items.map((e) => e.id)).toEqual([1, 2]);
  });

  test('recently-logged groups by createdAt month', () => {
    const entries = [
      entry({ id: 1, createdAt: Date.UTC(2024, 4, 10) }),
      entry({ id: 2, createdAt: Date.UTC(2024, 4, 1) }),
      entry({ id: 3, createdAt: Date.UTC(2024, 0, 15) }),
    ];
    const sections = groupDiaryEntries('recently-logged', entries);
    expect(sections.map((s) => s.label)).toEqual(['May 2024', 'January 2024']);
    expect(sections[0]?.items).toHaveLength(2);
  });

  test('highest-rated groups consecutive same-rating runs', () => {
    // Caller passes pre-sorted by rating desc.
    const entries = [
      entry({ id: 1, rating: 5 }),
      entry({ id: 2, rating: 5 }),
      entry({ id: 3, rating: 4.5 }),
      entry({ id: 4, rating: 3 }),
      entry({ id: 5, rating: 0 }),
    ];
    const sections = groupDiaryEntries('highest-rated', entries);
    expect(sections.map((s) => s.label)).toEqual([
      'Five stars',
      'Four & a half stars',
      'Three stars',
      'Unrated',
    ]);
    expect(sections[0]?.items.map((e) => e.id)).toEqual([1, 2]);
  });

  test('release-year groups consecutive same-decade runs', () => {
    const entries = [
      entry({ id: 1, year: '2024' }),
      entry({ id: 2, year: '2020' }),
      entry({ id: 3, year: '2019' }),
      entry({ id: 4, year: '2010' }),
      entry({ id: 5, year: '2009' }),
    ];
    const sections = groupDiaryEntries('release-year', entries);
    expect(sections.map((s) => s.label)).toEqual(['2020s', '2010s', '2000s']);
    expect(sections[0]?.items.map((e) => e.id)).toEqual([1, 2]);
    expect(sections[1]?.items.map((e) => e.id)).toEqual([3, 4]);
  });

  test('release-year buckets unknown years into a No year section', () => {
    const entries = [
      entry({ id: 1, year: '2024' }),
      entry({ id: 2, year: null }),
      entry({ id: 3, year: null }),
    ];
    const sections = groupDiaryEntries('release-year', entries);
    expect(sections.map((s) => s.label)).toEqual(['2020s', 'No year']);
    expect(sections[1]?.items.map((e) => e.id)).toEqual([2, 3]);
  });

  test('empty input yields no sections for every key', () => {
    const keys: DiarySortKey[] = [
      'recently-watched',
      'recently-logged',
      'highest-rated',
      'release-year',
    ];
    for (const k of keys) expect(groupDiaryEntries(k, [])).toEqual([]);
  });
});
