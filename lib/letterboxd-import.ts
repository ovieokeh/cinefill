// Pure orchestration on top of lib/letterboxd-csv.
// Merge / dedupe / TMDB match / inserts-assembly. Async match step takes a
// search function as a dependency so the matcher can be tested with a fake.

import type {
  DiaryRow,
  ReviewRow,
  WatchedRow,
  WatchlistRow,
} from './letterboxd-csv';
import type { NewDiaryEntry } from '@/db/diary';
import type { NewWatchlistItem } from '@/db/watchlist';
import type { TmdbMovie } from './tmdb';

export type MatchTarget = { name: string; year: string | null };

export type MatchResult =
  | {
      status: 'matched';
      tmdbId: number;
      title: string;
      year: string | null;
      posterPath: string | null;
    }
  | { status: 'unmatched'; reason: 'no-results' | 'aborted' };

// A diary row with the review text from reviews.csv attached (empty string if none).
export type MergedDiaryRow = DiaryRow & { review: string };

export type ParsedExport = {
  diary: MergedDiaryRow[]; // diary ∪ standalone-reviews ∪ non-overlapping-watched
  watchlist: WatchlistRow[];
};

export function matchKey(t: MatchTarget): string {
  return `${t.name}|${t.year ?? ''}`;
}

// ---------- key helpers ----------
// Letterboxd's "Letterboxd URI" column is a per-row hash, NOT a per-film id —
// the same film has different URIs in diary.csv, reviews.csv, watched.csv, etc.
// We dedupe on (name, year, watchedDate) for entry-level identity (one diary
// entry can have a paired review row in reviews.csv), and on (name, year) for
// film-level identity (watched.csv vs diary, watchlist).

function normName(name: string): string {
  return name.trim().toLowerCase();
}

function filmKey(row: { name: string; year: string | null }): string {
  return `${normName(row.name)}|${row.year ?? ''}`;
}

function dayDistance(a: string, b: string): number {
  // ISO date string distance in days; falls back to Infinity for unparseable.
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity;
  return Math.abs(ta - tb) / (1000 * 60 * 60 * 24);
}

// ---------- buildParsedExport ----------

export function buildParsedExport(input: {
  diary: DiaryRow[];
  reviews: ReviewRow[];
  watched: WatchedRow[];
  watchlist: WatchlistRow[];
}): ParsedExport {
  // Group diary rows by film (name + year). A film can legitimately have
  // multiple diary rows (rewatches); we preserve them all.
  const diaryByFilm = new Map<string, MergedDiaryRow[]>();
  for (const d of input.diary) {
    if (!d.name) continue;
    const fk = filmKey(d);
    const list = diaryByFilm.get(fk);
    const row: MergedDiaryRow = { ...d, review: '' };
    if (list) list.push(row);
    else diaryByFilm.set(fk, [row]);
  }

  // Group reviews by film too. Letterboxd's `Watched Date` for the review
  // row often diverges from the diary row's `Watched Date` (the user filled
  // in a different date when posting the review later). So we pair each
  // review to its closest-date unpaired diary row within the same film.
  const reviewsByFilm = new Map<string, ReviewRow[]>();
  for (const r of input.reviews) {
    if (!r.name || !r.review) continue;
    const fk = filmKey(r);
    const list = reviewsByFilm.get(fk);
    if (list) list.push(r);
    else reviewsByFilm.set(fk, [r]);
  }

  const consumedReviewIdx = new Set<string>(); // `${fk}|${arrayIndex}`
  for (const [fk, diaryRows] of diaryByFilm) {
    const reviews = reviewsByFilm.get(fk);
    if (!reviews || reviews.length === 0) continue;
    for (let ri = 0; ri < reviews.length; ri++) {
      const r = reviews[ri];
      let best: MergedDiaryRow | null = null;
      let bestDiff = Infinity;
      for (const d of diaryRows) {
        if (d.review) continue; // one review per diary row
        const diff = dayDistance(d.watchedDate, r.watchedDate);
        if (diff < bestDiff) {
          best = d;
          bestDiff = diff;
        }
      }
      if (best) {
        best.review = r.review;
        consumedReviewIdx.add(`${fk}|${ri}`);
      }
    }
  }

  // Emit merged diary rows.
  const merged: MergedDiaryRow[] = [];
  for (const list of diaryByFilm.values()) {
    for (const row of list) merged.push(row);
  }

  // Reviews that didn't pair (more reviews than diary rows, or film had no
  // diary entry at all) become standalone diary rows.
  for (const [fk, reviews] of reviewsByFilm) {
    for (let ri = 0; ri < reviews.length; ri++) {
      if (consumedReviewIdx.has(`${fk}|${ri}`)) continue;
      const r = reviews[ri];
      merged.push({ ...r });
    }
  }

  // watched.csv is a superset of diary by film. Drop any watched row whose
  // film is already represented; add the rest as bare diary entries.
  const filmsCovered = new Set<string>();
  for (const row of merged) filmsCovered.add(filmKey(row));
  for (const w of input.watched) {
    if (!w.name) continue;
    const fk = filmKey(w);
    if (filmsCovered.has(fk)) continue;
    filmsCovered.add(fk);
    merged.push({
      date: w.date,
      name: w.name,
      year: w.year,
      uri: w.uri,
      rating: 0,
      watchedDate: w.date,
      review: '',
    });
  }

  // Watchlist dedup by film (URI varies row-to-row).
  const wlSeen = new Set<string>();
  const watchlist = input.watchlist.filter((w) => {
    if (!w.name) return false;
    const fk = filmKey(w);
    if (wlSeen.has(fk)) return false;
    wlSeen.add(fk);
    return true;
  });

  return { diary: merged, watchlist };
}

// ---------- collectMatchTargets ----------

export function collectMatchTargets(parsed: ParsedExport): MatchTarget[] {
  const seen = new Set<string>();
  const out: MatchTarget[] = [];
  const add = (name: string, year: string | null) => {
    if (!name) return;
    const t = { name, year };
    const k = matchKey(t);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const d of parsed.diary) add(d.name, d.year);
  for (const w of parsed.watchlist) add(w.name, w.year);
  return out;
}

// ---------- matchTargets ----------

export type MatchOptions = {
  concurrency: number;
  signal: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export async function matchTargets(
  targets: MatchTarget[],
  searchMovies: (
    query: string,
    signal?: AbortSignal,
  ) => Promise<TmdbMovie[]>,
  options: MatchOptions,
): Promise<Map<string, MatchResult>> {
  const out = new Map<string, MatchResult>();
  if (targets.length === 0) return out;

  let idx = 0;
  let done = 0;
  const inFlight: Promise<void>[] = [];

  const matchOne = async (target: MatchTarget) => {
    const key = matchKey(target);
    if (options.signal.aborted) {
      out.set(key, { status: 'unmatched', reason: 'aborted' });
      return;
    }
    try {
      const results = await searchMovies(target.name, options.signal);
      if (options.signal.aborted) {
        out.set(key, { status: 'unmatched', reason: 'aborted' });
        return;
      }
      const picked = pickBestMatch(target, results);
      out.set(key, picked);
    } catch {
      // Network/parse failure: treat as no-result; the wizard reports it.
      out.set(key, { status: 'unmatched', reason: 'no-results' });
    } finally {
      done++;
      options.onProgress?.(done, targets.length);
    }
  };

  while (idx < targets.length && !options.signal.aborted) {
    while (
      inFlight.length < options.concurrency &&
      idx < targets.length &&
      !options.signal.aborted
    ) {
      const next = targets[idx++];
      const p = matchOne(next).finally(() => {
        const i = inFlight.indexOf(p);
        if (i >= 0) inFlight.splice(i, 1);
      });
      inFlight.push(p);
    }
    if (inFlight.length > 0) await Promise.race(inFlight);
  }

  // Drain any tasks still pending so out is complete on return.
  await Promise.all(inFlight);

  // Anything we never even scheduled (post-abort) → unmatched/aborted.
  for (const t of targets) {
    const k = matchKey(t);
    if (!out.has(k)) out.set(k, { status: 'unmatched', reason: 'aborted' });
  }

  return out;
}

export function pickBestMatch(
  target: MatchTarget,
  results: TmdbMovie[],
): MatchResult {
  if (results.length === 0) {
    return { status: 'unmatched', reason: 'no-results' };
  }
  const yearMatches = target.year
    ? results.filter((r) => r.year === target.year)
    : [];
  let picked: TmdbMovie;
  if (yearMatches.length === 1) {
    picked = yearMatches[0];
  } else if (yearMatches.length > 1) {
    picked = [...yearMatches].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    )[0];
  } else {
    picked = results[0];
  }
  return {
    status: 'matched',
    tmdbId: picked.tmdbId,
    title: picked.title,
    year: picked.year,
    posterPath: picked.posterPath,
  };
}

// ---------- assembleInserts ----------

export function assembleInserts(
  parsed: ParsedExport,
  matches: Map<string, MatchResult>,
): {
  diaryInserts: NewDiaryEntry[];
  watchlistInserts: NewWatchlistItem[];
  unmatchedTitles: string[];
} {
  const diaryInserts: NewDiaryEntry[] = [];
  const watchlistInserts: NewWatchlistItem[] = [];
  const unmatched = new Map<string, string>(); // key → display name

  for (const d of parsed.diary) {
    const key = matchKey({ name: d.name, year: d.year });
    const m = matches.get(key);
    if (!m || m.status !== 'matched') {
      if (d.name) unmatched.set(key, d.name);
      continue;
    }
    diaryInserts.push({
      tmdbId: m.tmdbId,
      mediaType: 'movie',
      seasonNumber: null,
      seasonName: null,
      title: m.title,
      year: m.year,
      posterPath: m.posterPath,
      watchedDate: d.watchedDate || d.date,
      rating: d.rating,
      note: d.review.trim(),
    });
  }

  for (const w of parsed.watchlist) {
    const key = matchKey({ name: w.name, year: w.year });
    const m = matches.get(key);
    if (!m || m.status !== 'matched') {
      if (w.name) unmatched.set(key, w.name);
      continue;
    }
    watchlistInserts.push({
      tmdbId: m.tmdbId,
      mediaType: 'movie',
      title: m.title,
      year: m.year,
      posterPath: m.posterPath,
    });
  }

  // De-duplicate diaryInserts by (tmdbId, watchedDate) within the batch.
  const seen = new Set<string>();
  const dedupedDiary: NewDiaryEntry[] = [];
  for (const e of diaryInserts) {
    const k = `${e.tmdbId}|${e.watchedDate}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedupedDiary.push(e);
  }

  return {
    diaryInserts: dedupedDiary,
    watchlistInserts,
    unmatchedTitles: [...unmatched.values()],
  };
}
