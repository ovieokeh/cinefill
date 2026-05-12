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

export type ParsedExport = {
  diary: DiaryRow[]; // diary + reviews merged + non-overlapping watched
  watchlist: WatchlistRow[];
};

export function matchKey(t: MatchTarget): string {
  return `${t.name}|${t.year ?? ''}`;
}

// ---------- buildParsedExport ----------

export function buildParsedExport(input: {
  diary: DiaryRow[];
  reviews: ReviewRow[];
  watched: WatchedRow[];
  watchlist: WatchlistRow[];
}): ParsedExport {
  const reviewsByUri = new Map<string, ReviewRow>();
  for (const r of input.reviews) {
    if (r.uri) reviewsByUri.set(r.uri, r);
  }

  // Diary rows first; attach review.note via URI when available.
  const diaryUris = new Set<string>();
  const merged: DiaryRow[] = input.diary.map((d) => {
    if (d.uri) diaryUris.add(d.uri);
    return d;
  });

  // Reviews-without-diary become standalone diary rows.
  for (const r of input.reviews) {
    if (!r.uri || diaryUris.has(r.uri)) continue;
    diaryUris.add(r.uri);
    merged.push(r);
  }

  // Watched rows that have no diary equivalent → fallback entry with date=Date, no rating.
  for (const w of input.watched) {
    if (!w.uri || diaryUris.has(w.uri)) continue;
    diaryUris.add(w.uri);
    merged.push({
      date: w.date,
      name: w.name,
      year: w.year,
      uri: w.uri,
      rating: 0,
      watchedDate: w.date,
    });
  }

  // Dedupe watchlist by URI in-place, preserving first occurrence.
  const wlSeen = new Set<string>();
  const watchlist = input.watchlist.filter((w) => {
    if (!w.uri || wlSeen.has(w.uri)) return false;
    wlSeen.add(w.uri);
    return true;
  });

  return { diary: merged, watchlist };
}

// Lookup helper for tests + the wizard's review-merge display.
export function reviewByUri(reviews: ReviewRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of reviews) {
    if (r.uri && r.review) out.set(r.uri, r.review);
  }
  return out;
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
  reviews: ReviewRow[],
): {
  diaryInserts: NewDiaryEntry[];
  watchlistInserts: NewWatchlistItem[];
  unmatchedTitles: string[];
} {
  const reviewNotes = reviewByUri(reviews);
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
      note: (reviewNotes.get(d.uri) ?? '').trim(),
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
