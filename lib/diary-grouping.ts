// Per-sort section grouping for the Diary screen. Pure functions, no I/O.
// Co-located tests in lib/__tests__/diary-grouping.test.ts.

import { format, parseISO } from 'date-fns';
import type { DiaryEntry } from '@/db/diary';

export type DiarySortKey =
  | 'recently-watched'
  | 'highest-rated'
  | 'recently-logged'
  | 'release-year';

export type DiarySection = {
  key: string;
  label: string;
  items: DiaryEntry[];
};

function groupByDate(
  entries: DiaryEntry[],
  getDate: (e: DiaryEntry) => Date,
): DiarySection[] {
  const groups = new Map<string, DiarySection>();
  for (const e of entries) {
    const d = getDate(e);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: format(d, 'MMMM yyyy'), items: [] };
      groups.set(key, g);
    }
    g.items.push(e);
  }
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

const NUMBER_WORD: Record<number, string> = {
  0: 'Zero',
  1: 'One',
  2: 'Two',
  3: 'Three',
  4: 'Four',
  5: 'Five',
};

export function ratingLabel(rating: number): string {
  if (rating <= 0) return 'Unrated';
  const whole = Math.floor(rating);
  const hasHalf = rating - whole >= 0.5;
  if (hasHalf) {
    if (whole === 0) return 'Half a star';
    return `${NUMBER_WORD[whole]} & a half stars`;
  }
  if (whole === 1) return 'One star';
  return `${NUMBER_WORD[whole] ?? whole} stars`;
}

/**
 * Walks a pre-sorted list and starts a new section whenever the key changes.
 * Callers must sort the input first; relying on sequential same-key runs lets
 * us group by derived keys (release year, rating tier) without re-sorting.
 */
function groupSequential(
  entries: DiaryEntry[],
  toKey: (e: DiaryEntry) => string,
  toLabel: (e: DiaryEntry) => string,
): DiarySection[] {
  const sections: DiarySection[] = [];
  let current: DiarySection | null = null;
  for (const e of entries) {
    const key = toKey(e);
    if (!current || current.key !== key) {
      current = { key, label: toLabel(e), items: [] };
      sections.push(current);
    }
    current.items.push(e);
  }
  return sections;
}

function releaseYearFor(year: string | null): number | null {
  if (!year) return null;
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  return y;
}

export function groupDiaryEntries(
  sortKey: DiarySortKey,
  entries: DiaryEntry[],
): DiarySection[] {
  switch (sortKey) {
    case 'recently-watched':
      return groupByDate(entries, (e) => parseISO(e.watchedDate));
    case 'recently-logged':
      return groupByDate(entries, (e) => new Date(e.createdAt));
    case 'highest-rated':
      return groupSequential(
        entries,
        (e) => String(e.rating),
        (e) => ratingLabel(e.rating),
      );
    case 'release-year':
      return groupSequential(
        entries,
        (e) => {
          const year = releaseYearFor(e.year);
          return year != null ? String(year) : 'unknown';
        },
        (e) => {
          const year = releaseYearFor(e.year);
          return year != null ? String(year) : 'No year';
        },
      );
  }
}
