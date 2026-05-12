// Taste profile — derives a per-user "taste fingerprint" from rated entries.
// Pure functions, no I/O. Every dimension is both a comparable scalar/vector
// (future cinema-matching ready) AND a readout string (UI display).

import type { StatsEntry, StatsCacheRow } from './stats';

export type MoodCluster =
  | 'storyDriven'
  | 'intense'
  | 'feelGood'
  | 'escapist'
  | 'cerebral';

export const MOOD_CLUSTERS: readonly MoodCluster[] = [
  'storyDriven',
  'intense',
  'feelGood',
  'escapist',
  'cerebral',
];

// Hand-curated TMDB-genre-id → mood-cluster map. Single source of truth.
// Excluded (rare / non-narrative): 10770 TV Movie, 10763 News, 10764 Reality, 10767 Talk.
export const MOOD_BY_TMDB_GENRE: ReadonlyMap<number, MoodCluster> = new Map<number, MoodCluster>([
  // storyDriven
  [18, 'storyDriven'],
  [10766, 'storyDriven'],
  // intense
  [27, 'intense'],
  [53, 'intense'],
  [80, 'intense'],
  [10752, 'intense'],
  [10768, 'intense'],
  // feelGood
  [35, 'feelGood'],
  [10751, 'feelGood'],
  [10749, 'feelGood'],
  [10402, 'feelGood'],
  [10762, 'feelGood'],
  // escapist
  [28, 'escapist'],
  [12, 'escapist'],
  [16, 'escapist'],
  [14, 'escapist'],
  [878, 'escapist'],
  [37, 'escapist'],
  [10759, 'escapist'],
  [10765, 'escapist'],
  // cerebral
  [99, 'cerebral'],
  [36, 'cerebral'],
  [9648, 'cerebral'],
]);

export const MOOD_LABELS: Record<MoodCluster, string> = {
  storyDriven: 'story-driven',
  intense: 'intense',
  feelGood: 'feel-good',
  escapist: 'escapist',
  cerebral: 'cerebral',
};

// Canonical TMDB genre per cluster — used by the TasteCard's Genre-lean tap.
export const PRIMARY_GENRE_FOR_CLUSTER: Record<
  MoodCluster,
  { id: number; name: string }
> = {
  storyDriven: { id: 18, name: 'Drama' },
  intense: { id: 53, name: 'Thriller' },
  feelGood: { id: 35, name: 'Comedy' },
  escapist: { id: 28, name: 'Action' },
  cerebral: { id: 99, name: 'Documentary' },
};

export type Confidence = 'empty' | 'low' | 'full';

export type TasteProfile = {
  ratedCount: number;
  confidence: Confidence;
  genreMix: Record<MoodCluster, number>;
  genreLead: { cluster: MoodCluster | null; share: number; readout: string };
  era: { modalDecade: number | null; spread: number; readout: string };
  runtime: { meanMinutes: number | null; stdMinutes: number | null; readout: string };
  recencyVelocity: { medianLagYears: number | null; readout: string };
  popularity: {
    median: number | null;
    bucket: 'cult' | 'balanced' | 'mainstream' | 'unknown';
    readout: string;
  };
  loyalty: {
    topDirector: string | null;
    topDirectorId: number | null;
    topShare: number;
    readout: string;
  };
  ratingStyle: { median: number; spread: number; readout: string };
};

// ---------- shared helpers ----------

export function clustersForGenres(genreIds: number[]): MoodCluster[] {
  const out = new Set<MoodCluster>();
  for (const id of genreIds) {
    const c = MOOD_BY_TMDB_GENRE.get(id);
    if (c) out.add(c);
  }
  return [...out];
}

export function weightedMedian(
  values: number[],
  weights: number[],
): number | null {
  if (values.length === 0) return null;
  const pairs = values
    .map((v, i) => ({ v, w: weights[i] ?? 0 }))
    .filter((p) => Number.isFinite(p.v) && p.w > 0)
    .sort((a, b) => a.v - b.v);
  if (pairs.length === 0) return null;
  const totalW = pairs.reduce((s, p) => s + p.w, 0);
  if (totalW <= 0) return null;
  let cum = 0;
  for (const p of pairs) {
    cum += p.w;
    if (cum >= totalW / 2) return p.v;
  }
  return pairs[pairs.length - 1].v;
}

function plainMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function iqr(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return q(0.75) - q(0.25);
}

function parseYearString(year: string | null | undefined): number | null {
  if (!year) return null;
  const n = Number(year);
  return Number.isFinite(n) ? n : null;
}

function parseWatchedYear(date: string | null | undefined): number | null {
  if (!date) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

// ---------- the engine ----------

export function tasteProfile(
  entries: StatsEntry[],
  cache: StatsCacheRow[],
  _now: Date = new Date(),
): TasteProfile {
  const cacheByKey = new Map<string, StatsCacheRow>();
  for (const c of cache) {
    cacheByKey.set(`${c.mediaType}:${c.tmdbId}`, c);
  }
  const lookup = (e: StatsEntry): StatsCacheRow | undefined => {
    const mt: 'movie' | 'tv' = e.mediaType === 'movie' ? 'movie' : 'tv';
    return cacheByKey.get(`${mt}:${e.tmdbId}`);
  };

  const rated = entries.filter((e) => e.rating > 0);
  const ratedCount = rated.length;
  const confidence: Confidence = ratedCount === 0 ? 'empty' : ratedCount < 20 ? 'low' : 'full';

  const emptyMix: Record<MoodCluster, number> = {
    storyDriven: 0,
    intense: 0,
    feelGood: 0,
    escapist: 0,
    cerebral: 0,
  };

  if (ratedCount === 0) {
    return {
      ratedCount: 0,
      confidence: 'empty',
      genreMix: emptyMix,
      genreLead: { cluster: null, share: 0, readout: 'No taste data yet' },
      era: { modalDecade: null, spread: 0, readout: '—' },
      runtime: { meanMinutes: null, stdMinutes: null, readout: '—' },
      recencyVelocity: { medianLagYears: null, readout: '—' },
      popularity: { median: null, bucket: 'unknown', readout: '—' },
      loyalty: { topDirector: null, topDirectorId: null, topShare: 0, readout: '—' },
      ratingStyle: { median: 0, spread: 0, readout: '—' },
    };
  }

  // ----- genreMix -----
  const mixRaw: Record<MoodCluster, number> = { ...emptyMix };
  for (const e of rated) {
    const row = lookup(e);
    if (!row) continue;
    const clusters = clustersForGenres(row.genreIds);
    if (clusters.length === 0) continue;
    const perCluster = e.rating / clusters.length;
    for (const c of clusters) {
      mixRaw[c] += perCluster;
    }
  }
  const mixSum = MOOD_CLUSTERS.reduce((s, c) => s + mixRaw[c], 0);
  const genreMix: Record<MoodCluster, number> = { ...emptyMix };
  if (mixSum > 0) {
    for (const c of MOOD_CLUSTERS) genreMix[c] = mixRaw[c] / mixSum;
  }
  let leadCluster: MoodCluster | null = null;
  let leadShare = 0;
  for (const c of MOOD_CLUSTERS) {
    if (genreMix[c] > leadShare) {
      leadShare = genreMix[c];
      leadCluster = c;
    }
  }
  const genreLead = {
    cluster: leadCluster,
    share: leadShare,
    readout: leadCluster
      ? `Leans ${MOOD_LABELS[leadCluster]} (${Math.round(leadShare * 100)}%)`
      : 'No genre data yet',
  };

  // ----- era -----
  const decadeWeights = new Map<number, number>();
  for (const e of rated) {
    const y = parseYearString(e.year);
    if (y == null) continue;
    const decade = Math.floor(y / 10) * 10;
    decadeWeights.set(decade, (decadeWeights.get(decade) ?? 0) + e.rating);
  }
  let modalDecade: number | null = null;
  let topW = 0;
  let totalW = 0;
  for (const [decade, w] of decadeWeights) {
    totalW += w;
    if (w > topW) {
      topW = w;
      modalDecade = decade;
    }
  }
  const spread = decadeWeights.size;
  const topShare = totalW > 0 ? topW / totalW : 0;
  let eraReadout = '—';
  if (modalDecade != null) {
    if (topShare >= 0.4) {
      eraReadout = `Anchored in the ${decadeLabel(modalDecade)}`;
    } else if (spread >= 4) {
      eraReadout = 'Spread across decades';
    } else {
      eraReadout = `Leans ${decadeLabel(modalDecade)}`;
    }
  }
  const era = { modalDecade, spread, readout: eraReadout };

  // ----- runtime -----
  const runtimeValues: number[] = [];
  const runtimeWeights: number[] = [];
  for (const e of rated) {
    if (e.mediaType !== 'movie') continue;
    const row = lookup(e);
    if (!row || row.runtime == null) continue;
    runtimeValues.push(row.runtime);
    runtimeWeights.push(e.rating);
  }
  let meanMinutes: number | null = null;
  let stdMinutes: number | null = null;
  let runtimeReadout = '—';
  if (runtimeValues.length > 0) {
    const wSum = runtimeWeights.reduce((s, w) => s + w, 0);
    meanMinutes = runtimeValues.reduce((s, v, i) => s + v * runtimeWeights[i], 0) / wSum;
    const variance =
      runtimeValues.reduce((s, v, i) => s + runtimeWeights[i] * (v - (meanMinutes as number)) ** 2, 0) /
      wSum;
    stdMinutes = Math.sqrt(variance);
    const m = meanMinutes;
    runtimeReadout =
      m < 90
        ? 'Prefers tight pieces'
        : m < 120
          ? 'Standard runtimes'
          : m < 150
            ? 'Long-form viewer'
            : 'Loves epics';
    if (stdMinutes > 25) {
      runtimeReadout += ` · ±${Math.round(stdMinutes)}m spread`;
    }
  }
  const runtime = { meanMinutes, stdMinutes, readout: runtimeReadout };

  // ----- recencyVelocity -----
  const lags: number[] = [];
  for (const e of rated) {
    const filmYear = parseYearString(e.year);
    const watchedYear = parseWatchedYear(e.watchedDate);
    if (filmYear == null || watchedYear == null) continue;
    lags.push(watchedYear - filmYear);
  }
  const medianLag = plainMedian(lags);
  let recencyReadout = '—';
  if (medianLag != null) {
    recencyReadout =
      medianLag <= 1
        ? 'Chases new releases'
        : medianLag <= 5
          ? 'Mostly current films'
          : medianLag <= 15
            ? 'Mixed across eras'
            : 'Deep catalog viewer';
  }
  const recencyVelocity = { medianLagYears: medianLag, readout: recencyReadout };

  // ----- popularity (mainstream-cult) -----
  const popValues: number[] = [];
  for (const e of rated) {
    const row = lookup(e);
    if (!row || row.popularity == null) continue;
    popValues.push(row.popularity);
  }
  const popMedian = plainMedian(popValues);
  let popBucket: 'cult' | 'balanced' | 'mainstream' | 'unknown' = 'unknown';
  let popReadout = '—';
  if (popMedian != null) {
    if (popMedian < 8) {
      popBucket = 'cult';
      popReadout = 'Festival-circuit leaning';
    } else if (popMedian <= 30) {
      popBucket = 'balanced';
      popReadout = 'Mix of mainstream and indie';
    } else {
      popBucket = 'mainstream';
      popReadout = 'Mainstream-leaning';
    }
  }
  const popularity = { median: popMedian, bucket: popBucket, readout: popReadout };

  // ----- loyalty -----
  const directorCounts = new Map<
    string,
    { display: string; count: number; id?: number }
  >();
  let ratedWithDirector = 0;
  for (const e of rated) {
    const row = lookup(e);
    if (!row || !row.director) continue;
    const trimmed = row.director.trim();
    if (trimmed.length === 0) continue;
    ratedWithDirector++;
    const pieces = trimmed.split(' & ');
    pieces.forEach((piece, i) => {
      const name = piece.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const id = row.directorIds[i];
      const cur = directorCounts.get(key);
      if (cur) {
        cur.count++;
        if (cur.id == null && id != null) cur.id = id;
      } else {
        directorCounts.set(key, { display: name, count: 1, id: id ?? undefined });
      }
    });
  }
  let topDirector: string | null = null;
  let topDirectorId: number | null = null;
  let topDirectorCount = 0;
  for (const { display, count, id } of directorCounts.values()) {
    if (count > topDirectorCount) {
      topDirectorCount = count;
      topDirector = display;
      topDirectorId = id ?? null;
    }
  }
  const loyaltyShare = ratedWithDirector > 0 ? topDirectorCount / ratedWithDirector : 0;
  let loyaltyReadout = '—';
  if (topDirector && loyaltyShare >= 0.3) {
    loyaltyReadout = `Follows directors — ${topDirector} is ${Math.round(loyaltyShare * 100)}% of your highly-rated watches`;
  } else if (topDirector && loyaltyShare >= 0.1) {
    loyaltyReadout = 'Some directors stand out';
  } else if (ratedWithDirector > 0) {
    loyaltyReadout = 'Breadth viewer';
  }
  const loyalty = {
    topDirector,
    topDirectorId,
    topShare: loyaltyShare,
    readout: loyaltyReadout,
  };

  // ----- ratingStyle -----
  const ratings = rated.map((e) => e.rating);
  const ratingMedian = plainMedian(ratings) ?? 0;
  const ratingSpread = iqr(ratings);
  let ratingReadout = ratingMedian >= 4 ? 'Generous rater' : ratingMedian >= 3 ? 'Balanced' : 'Hard grader';
  ratingReadout += ratingSpread >= 1 ? ' · strong opinions' : ' · even-handed';
  const ratingStyle = { median: ratingMedian, spread: ratingSpread, readout: ratingReadout };

  return {
    ratedCount,
    confidence,
    genreMix,
    genreLead,
    era,
    runtime,
    recencyVelocity,
    popularity,
    loyalty,
    ratingStyle,
  };
}

function decadeLabel(decade: number): string {
  return `${decade}s`;
}
