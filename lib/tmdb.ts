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

type TmdbSearchResponse = {
  results: Array<{
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
  }>;
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
