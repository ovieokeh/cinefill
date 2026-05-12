import { config, assertTmdbConfigured } from './config';

const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

export type TmdbMovie = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
};

export type MovieDetails = {
  tmdbId: number;
  title: string;
  tagline: string;
  overview: string;
  runtime: number | null;
  genres: string[];
  backdropPath: string | null;
  posterPath: string | null;
  director: string | null;
  certification: string | null;
  cast: { id: number; name: string; character: string; profilePath: string | null }[];
  keyCrew: { role: string; names: string[] }[];
  trailerYoutubeKey: string | null;
  flatrateProviders: { id: number; name: string; logoPath: string | null }[];
  recommendations: { tmdbId: number; title: string; year: string | null; posterPath: string | null }[];
};

type TmdbSearchResponse = {
  results: {
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
  }[];
};

type RawCastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

type RawCrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
};

type RawVideo = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
};

type RawProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
};

type RawReleaseDate = {
  certification: string;
  release_date: string;
  type: number;
};

type RawRecommendation = {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
};

type RawMovieDetails = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  backdrop_path: string | null;
  poster_path: string | null;
  credits?: { cast: RawCastMember[]; crew: RawCrewMember[] };
  videos?: { results: RawVideo[] };
  release_dates?: { results: { iso_3166_1: string; release_dates: RawReleaseDate[] }[] };
  'watch/providers'?: {
    results: Record<string, { flatrate?: RawProvider[]; link?: string }>;
  };
  recommendations?: { results: RawRecommendation[] };
};

function normalize(raw: TmdbSearchResponse['results'][number]): TmdbMovie {
  return {
    tmdbId: raw.id,
    title: raw.title,
    year: raw.release_date ? raw.release_date.slice(0, 4) : null,
    posterPath: raw.poster_path,
    overview: raw.overview,
  };
}

export function posterUrl(posterPath: string | null, size: 'w154' | 'w342' | 'w500' = 'w342'): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMG_BASE}/${size}${posterPath}`;
}

export function backdropUrl(
  path: string | null,
  size: 'w780' | 'w1280' | 'original' = 'w1280',
): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function profileUrl(path: string | null, size: 'w185' | 'h632' = 'w185'): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function logoUrl(path: string | null, size: 'w92' | 'w154' = 'w92'): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<TmdbMovie[]> {
  assertTmdbConfigured();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(trimmed)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as TmdbSearchResponse;
  return json.results.map(normalize);
}

function pickTrailer(videos: RawVideo[] | undefined): string | null {
  if (!videos || videos.length === 0) return null;
  const candidates = videos.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.official !== b.official) return a.official ? -1 : 1;
    return b.published_at.localeCompare(a.published_at);
  });
  return candidates[0].key;
}

function pickDirector(crew: RawCrewMember[] | undefined): string | null {
  if (!crew) return null;
  const directors = crew.filter((c) => c.job === 'Director').map((c) => c.name);
  if (directors.length === 0) return null;
  return directors.slice(0, 2).join(' & ');
}

const CREW_ROLE_MAP: { jobs: string[]; label: string }[] = [
  { jobs: ['Director'], label: 'Director' },
  { jobs: ['Screenplay', 'Writer', 'Story'], label: 'Screenplay' },
  { jobs: ['Director of Photography'], label: 'Cinematography' },
  { jobs: ['Original Music Composer'], label: 'Music' },
  { jobs: ['Editor'], label: 'Editor' },
];

function pickKeyCrew(crew: RawCrewMember[] | undefined): MovieDetails['keyCrew'] {
  if (!crew || crew.length === 0) return [];
  const out: MovieDetails['keyCrew'] = [];
  for (const { jobs, label } of CREW_ROLE_MAP) {
    const names: string[] = [];
    for (const c of crew) {
      if (jobs.includes(c.job) && !names.includes(c.name)) {
        names.push(c.name);
      }
    }
    if (names.length > 0) out.push({ role: label, names });
  }
  return out;
}

function pickRecommendations(
  recs: RawMovieDetails['recommendations'],
): MovieDetails['recommendations'] {
  if (!recs?.results) return [];
  return recs.results.slice(0, 20).map((r) => ({
    tmdbId: r.id,
    title: r.title,
    year: r.release_date ? r.release_date.slice(0, 4) : null,
    posterPath: r.poster_path,
  }));
}

function pickUsCertification(
  releaseDates: RawMovieDetails['release_dates'],
): string | null {
  const us = releaseDates?.results.find((r) => r.iso_3166_1 === 'US');
  const cert = us?.release_dates.find((d) => d.certification && d.certification.trim() !== '');
  return cert?.certification ?? null;
}

function pickUsFlatrate(
  providers: RawMovieDetails['watch/providers'],
): MovieDetails['flatrateProviders'] {
  const list = providers?.results?.US?.flatrate ?? [];
  return [...list]
    .sort((a, b) => a.display_priority - b.display_priority)
    .map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
}

export async function getMovieDetails(
  tmdbId: number,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits,videos,watch/providers,release_dates,recommendations&language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB details failed: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as RawMovieDetails;

  const cast = (raw.credits?.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    }));

  return {
    tmdbId: raw.id,
    title: raw.title,
    tagline: raw.tagline ?? '',
    overview: raw.overview ?? '',
    runtime: raw.runtime ?? null,
    genres: (raw.genres ?? []).map((g) => g.name),
    backdropPath: raw.backdrop_path,
    posterPath: raw.poster_path,
    director: pickDirector(raw.credits?.crew),
    certification: pickUsCertification(raw.release_dates),
    cast,
    keyCrew: pickKeyCrew(raw.credits?.crew),
    trailerYoutubeKey: pickTrailer(raw.videos?.results),
    flatrateProviders: pickUsFlatrate(raw['watch/providers']),
    recommendations: pickRecommendations(raw.recommendations),
  };
}
