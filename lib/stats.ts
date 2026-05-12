// Pure, side-effect-free stat transforms used by the You tab.
// Every function takes plain inputs and returns plain outputs — no I/O.
// Functions that depend on "now" accept it as an optional argument so tests can pin time.

import type { DiaryEntry } from '@/db/diary';
import type { MediaCacheRow } from '@/db/media_cache';

export type StatsEntry = Pick<
  DiaryEntry,
  'tmdbId' | 'mediaType' | 'seasonNumber' | 'year' | 'watchedDate' | 'rating'
>;

export type StatsCacheRow = Pick<
  MediaCacheRow,
  'tmdbId' | 'mediaType' | 'genreIds' | 'runtime' | 'director' | 'seasons'
>;

export type GenreMap = Map<number, string>;

export type Summary = {
  totalMovies: number;
  totalSeasons: number;
  currentYearMovies: number;
  currentYearSeasons: number;
  avgRating: number;
};

export type Bucket = { label: string; count: number };

export type MonthCount = { year: number; month: number; count: number };

export type GenreBucket = {
  label: string;
  count: number;
  /** Whichever side contributed more counts; used by the UI to route to the search tab. */
  dominantMediaType: 'movie' | 'tv';
  /** The TMDB genre id in the dominant media type's namespace. */
  dominantGenreId: number;
};

const RATING_STEPS = 10; // 0.5 → 5.0

// ---------- summary ----------

export function summary(entries: StatsEntry[], now: Date = new Date()): Summary {
  const currentYear = now.getFullYear();
  let totalMovies = 0;
  let totalSeasons = 0;
  let currentYearMovies = 0;
  let currentYearSeasons = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  for (const e of entries) {
    if (e.mediaType === 'movie') totalMovies++;
    else if (e.mediaType === 'tv_season') totalSeasons++;
    const y = entryWatchedYear(e);
    if (y === currentYear) {
      if (e.mediaType === 'movie') currentYearMovies++;
      else if (e.mediaType === 'tv_season') currentYearSeasons++;
    }
    if (e.rating > 0) {
      ratingSum += e.rating;
      ratingCount++;
    }
  }
  const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
  return {
    totalMovies,
    totalSeasons,
    currentYearMovies,
    currentYearSeasons,
    avgRating,
  };
}

// ---------- ratingDistribution ----------

export function ratingDistribution(entries: StatsEntry[]): Bucket[] {
  const counts = new Array(RATING_STEPS).fill(0) as number[];
  for (const e of entries) {
    if (e.rating <= 0) continue;
    const idx = Math.round(e.rating * 2) - 1; // 0.5 → 0, 5.0 → 9
    if (idx < 0 || idx >= RATING_STEPS) continue;
    counts[idx]++;
  }
  return counts.map((count, i) => ({
    label: ((i + 1) / 2).toFixed(1),
    count,
  }));
}

// ---------- decadeDistribution ----------

const OLDER_DECADE_THRESHOLD = 1970;

export function decadeDistribution(entries: StatsEntry[]): Bucket[] {
  const byDecade = new Map<number | 'older', number>();
  for (const e of entries) {
    const yearNum = parseYear(e.year);
    if (yearNum == null) continue;
    const key = yearNum < OLDER_DECADE_THRESHOLD ? 'older' : Math.floor(yearNum / 10) * 10;
    byDecade.set(key, (byDecade.get(key) ?? 0) + 1);
  }
  // Numeric decades sorted descending, then "older" pinned at the end.
  const numeric = [...byDecade.entries()]
    .filter((kv): kv is [number, number] => typeof kv[0] === 'number')
    .sort((a, b) => b[0] - a[0])
    .map(([decade, count]) => ({ label: `${decade}s`, count }));
  const older = byDecade.get('older');
  if (older != null) numeric.push({ label: 'older', count: older });
  return numeric;
}

// ---------- monthlyActivity ----------

export function monthlyActivity(
  entries: StatsEntry[],
  months: number,
  now: Date = new Date(),
): MonthCount[] {
  if (months <= 0) return [];
  const buckets: MonthCount[] = [];
  // Build the window: oldest first → newest at the end (current month).
  const year0 = now.getFullYear();
  const month0 = now.getMonth(); // 0-indexed
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(year0, month0 - i, 1);
    buckets.push({ year: date.getFullYear(), month: date.getMonth(), count: 0 });
  }
  const start = new Date(buckets[0].year, buckets[0].month, 1).getTime();
  const end = new Date(year0, month0 + 1, 1).getTime(); // exclusive upper bound
  for (const e of entries) {
    const d = parseDate(e.watchedDate);
    if (!d) continue;
    const t = d.getTime();
    if (t < start || t >= end) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    const bucket = buckets.find((b) => b.year === y && b.month === m);
    if (bucket) bucket.count++;
  }
  return buckets;
}

// ---------- topRated ----------

export function topRated(entries: StatsEntry[], limit: number): StatsEntry[] {
  if (limit <= 0) return [];
  const rated = entries.filter((e) => e.rating > 0);
  rated.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return (b.watchedDate ?? '').localeCompare(a.watchedDate ?? '');
  });
  return rated.slice(0, limit);
}

// ---------- genreDistribution ----------

export function genreDistribution(
  entries: StatsEntry[],
  cache: StatsCacheRow[],
  movieGenres: GenreMap,
  tvGenres: GenreMap,
  limit: number,
): GenreBucket[] {
  if (limit <= 0) return [];

  const cacheByKey = new Map<string, StatsCacheRow>();
  for (const c of cache) {
    cacheByKey.set(`${c.mediaType}:${c.tmdbId}`, c);
  }

  // Per-name aggregation: { count, movieCount, tvCount, movieGenreId, tvGenreId }
  type AggValue = {
    count: number;
    movieCount: number;
    tvCount: number;
    movieGenreId?: number;
    tvGenreId?: number;
  };
  const byName = new Map<string, AggValue>();

  for (const e of entries) {
    const cacheMt: 'movie' | 'tv' = e.mediaType === 'movie' ? 'movie' : 'tv';
    const row = cacheByKey.get(`${cacheMt}:${e.tmdbId}`);
    if (!row) continue;
    const genreMap = cacheMt === 'movie' ? movieGenres : tvGenres;
    for (const gid of row.genreIds) {
      const name = genreMap.get(gid);
      if (!name) continue;
      const current = byName.get(name) ?? { count: 0, movieCount: 0, tvCount: 0 };
      current.count++;
      if (cacheMt === 'movie') {
        current.movieCount++;
        current.movieGenreId ??= gid;
      } else {
        current.tvCount++;
        current.tvGenreId ??= gid;
      }
      byName.set(name, current);
    }
  }

  const buckets: GenreBucket[] = [];
  for (const [name, agg] of byName) {
    const dominantMediaType: 'movie' | 'tv' = agg.movieCount >= agg.tvCount ? 'movie' : 'tv';
    const dominantGenreId =
      dominantMediaType === 'movie' ? agg.movieGenreId : agg.tvGenreId;
    if (dominantGenreId == null) continue;
    buckets.push({ label: name, count: agg.count, dominantMediaType, dominantGenreId });
  }
  buckets.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
  return buckets.slice(0, limit);
}

// ---------- filmHoursWatched ----------

export function filmHoursWatched(entries: StatsEntry[], cache: StatsCacheRow[]): number {
  const cacheByKey = new Map<string, StatsCacheRow>();
  for (const c of cache) {
    cacheByKey.set(`${c.mediaType}:${c.tmdbId}`, c);
  }
  let totalMinutes = 0;
  for (const e of entries) {
    if (e.mediaType !== 'movie') continue;
    const row = cacheByKey.get(`movie:${e.tmdbId}`);
    if (!row || row.runtime == null) continue;
    totalMinutes += row.runtime;
  }
  return totalMinutes / 60;
}

// ---------- tvSeasonHoursWatched ----------

export function tvSeasonHoursWatched(
  entries: StatsEntry[],
  cache: StatsCacheRow[],
): number {
  const cacheByKey = new Map<string, StatsCacheRow>();
  for (const c of cache) {
    cacheByKey.set(`${c.mediaType}:${c.tmdbId}`, c);
  }
  let totalMinutes = 0;
  for (const e of entries) {
    if (e.mediaType !== 'tv_season') continue;
    if (e.seasonNumber == null) continue;
    const row = cacheByKey.get(`tv:${e.tmdbId}`);
    if (!row || row.runtime == null) continue;
    const season = row.seasons.find((s) => s.seasonNumber === e.seasonNumber);
    if (!season) continue;
    totalMinutes += season.episodeCount * row.runtime;
  }
  return totalMinutes / 60;
}

// ---------- topDirectors ----------

export function topDirectors(
  entries: StatsEntry[],
  cache: StatsCacheRow[],
  limit: number,
): Bucket[] {
  if (limit <= 0) return [];

  const cacheByKey = new Map<string, StatsCacheRow>();
  for (const c of cache) {
    cacheByKey.set(`${c.mediaType}:${c.tmdbId}`, c);
  }

  // key (lowercased) → { display, count }
  const byKey = new Map<string, { display: string; count: number }>();
  for (const e of entries) {
    const cacheMt: 'movie' | 'tv' = e.mediaType === 'movie' ? 'movie' : 'tv';
    const row = cacheByKey.get(`${cacheMt}:${e.tmdbId}`);
    if (!row || !row.director) continue;
    const trimmedWhole = row.director.trim();
    if (trimmedWhole.length === 0) continue;
    for (const piece of trimmedWhole.split(' & ')) {
      const name = piece.trim();
      if (name.length === 0) continue;
      const key = name.toLowerCase();
      const current = byKey.get(key);
      if (current) {
        current.count++;
      } else {
        byKey.set(key, { display: name, count: 1 });
      }
    }
  }

  const buckets: Bucket[] = [...byKey.values()].map(({ display, count }) => ({
    label: display,
    count,
  }));
  buckets.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
  return buckets.slice(0, limit);
}

// ---------- helpers (not exported) ----------

function parseYear(year: string | null): number | null {
  if (!year) return null;
  const n = Number(year);
  if (!Number.isFinite(n)) return null;
  return n;
}

function entryWatchedYear(e: StatsEntry): number | null {
  const d = parseDate(e.watchedDate);
  return d ? d.getFullYear() : null;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // ISO yyyy-mm-dd → local Date; we ignore timezone subtleties since cinefill stores dates only.
  const [y, m, d] = iso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}
