// Generic filter + sort engine for list tabs (Diary, Watchlist).
// Pure functions, no I/O. Co-located tests in lib/__tests__/list-filters.test.ts.

export type ListMediaType = 'all' | 'movie' | 'tv';

export type ListFilters = {
  mediaType: ListMediaType;
  genreId: number | null;
  /** Start year of a decade, e.g. 1990 → 1990–1999. */
  decade: number | null;
};

export const EMPTY_FILTERS: ListFilters = {
  mediaType: 'all',
  genreId: null,
  decade: null,
};

export function isEmptyFilters(f: ListFilters): boolean {
  return f.mediaType === 'all' && f.genreId == null && f.decade == null;
}

export function countActiveFilters(f: ListFilters): number {
  let n = 0;
  if (f.mediaType !== 'all') n++;
  if (f.genreId != null) n++;
  if (f.decade != null) n++;
  return n;
}

export type FilterAccessors<T> = {
  getMediaType: (item: T) => 'movie' | 'tv';
  getYear: (item: T) => string | null;
  /**
   * Genre IDs from the item's cached row, or `null` when no cache row exists.
   * `null` is treated inclusively — items without cache data stay visible when
   * a genre filter is active. (Otherwise post-import items vanish unexpectedly.)
   */
  getGenreIds: (item: T) => number[] | null;
};

export function matchesFilters<T>(
  item: T,
  filters: ListFilters,
  a: FilterAccessors<T>,
): boolean {
  if (filters.mediaType !== 'all' && a.getMediaType(item) !== filters.mediaType) {
    return false;
  }
  if (filters.genreId != null) {
    const ids = a.getGenreIds(item);
    if (ids != null && !ids.includes(filters.genreId)) return false;
  }
  if (filters.decade != null) {
    const yearStr = a.getYear(item);
    if (!yearStr) return false;
    const y = Number(yearStr);
    if (!Number.isFinite(y)) return false;
    if (y < filters.decade || y >= filters.decade + 10) return false;
  }
  return true;
}

export function applyFilters<T>(
  items: T[],
  filters: ListFilters,
  accessors: FilterAccessors<T>,
): T[] {
  if (isEmptyFilters(filters)) return items;
  return items.filter((it) => matchesFilters(it, filters, accessors));
}

// ---------- sort ----------
// Sort is per-tab because keys / comparators differ. Each tab defines its own
// SortKey enum + a comparator map; this helper just provides a stable wrapper.

export function applySort<T, K extends string>(
  items: T[],
  key: K,
  comparators: Record<K, (a: T, b: T) => number>,
): T[] {
  const cmp = comparators[key];
  if (!cmp) return items;
  // Copy first — never mutate the input array.
  return items.slice().sort(cmp);
}
