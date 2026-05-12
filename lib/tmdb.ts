import { config, assertTmdbConfigured } from './config';

const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

export type TmdbMovie = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  popularity: number;
};

export type GenreRef = { id: number; name: string };

export type MovieDetails = {
  tmdbId: number;
  title: string;
  tagline: string;
  overview: string;
  runtime: number | null;
  genres: GenreRef[];
  backdropPath: string | null;
  posterPath: string | null;
  director: string | null;
  directorIds: number[];
  certification: string | null;
  popularity: number | null;
  cast: { id: number; name: string; character: string; profilePath: string | null }[];
  keyCrew: { role: string; members: { id: number; name: string }[] }[];
  trailerYoutubeKey: string | null;
  flatrateProviders: { id: number; name: string; logoPath: string | null }[];
  recommendations: { tmdbId: number; mediaType: 'movie'; title: string; year: string | null; posterPath: string | null }[];
};

type TmdbSearchResponse = {
  results: {
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
    overview: string;
    popularity?: number;
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
  popularity?: number;
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
    popularity: raw.popularity ?? 0,
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

export function personUrl(
  path: string | null,
  size: 'w185' | 'h632' | 'original' = 'h632',
): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export function stillUrl(
  path: string | null,
  size: 'w185' | 'w300' | 'original' = 'w300',
): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}

export type PersonCredit = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  role: string;
  department: string;
};

export type PersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  knownForDepartment: string;
  credits: PersonCredit[];
};

type RawPersonCastCredit = {
  id: number;
  media_type?: 'movie' | 'tv' | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  character?: string;
};

type RawPersonCrewCredit = {
  id: number;
  media_type?: 'movie' | 'tv' | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  job?: string;
  department?: string;
};

type RawPersonDetails = {
  id: number;
  name: string;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
  combined_credits?: {
    cast?: RawPersonCastCredit[];
    crew?: RawPersonCrewCredit[];
  };
};

function isSupportedMediaType(m?: string): m is 'movie' | 'tv' {
  return m === 'movie' || m === 'tv';
}

function creditTitle(c: RawPersonCastCredit | RawPersonCrewCredit, mt: 'movie' | 'tv'): string {
  if (mt === 'movie') return c.title || c.original_title || '';
  return c.name || c.original_name || '';
}

function creditYear(c: RawPersonCastCredit | RawPersonCrewCredit, mt: 'movie' | 'tv'): string | null {
  const raw = mt === 'movie' ? c.release_date : c.first_air_date;
  return raw && raw.length >= 4 ? raw.slice(0, 4) : null;
}

function normalizePersonCredits(raw: RawPersonDetails['combined_credits']): PersonCredit[] {
  if (!raw) return [];
  const out: PersonCredit[] = [];
  for (const c of raw.cast ?? []) {
    if (!isSupportedMediaType(c.media_type)) continue;
    const mt = c.media_type;
    out.push({
      tmdbId: c.id,
      mediaType: mt,
      title: creditTitle(c, mt),
      year: creditYear(c, mt),
      posterPath: c.poster_path,
      role: c.character ?? '',
      department: 'Acting',
    });
  }
  for (const c of raw.crew ?? []) {
    if (!isSupportedMediaType(c.media_type)) continue;
    const mt = c.media_type;
    out.push({
      tmdbId: c.id,
      mediaType: mt,
      title: creditTitle(c, mt),
      year: creditYear(c, mt),
      posterPath: c.poster_path,
      role: c.job ?? '',
      department: c.department ?? 'Crew',
    });
  }
  return out;
}

export type TvSeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
};

export type TvDetails = {
  tmdbId: number;
  name: string;
  tagline: string;
  overview: string;
  episodeRuntime: number | null;
  yearRange: string | null;
  genres: GenreRef[];
  backdropPath: string | null;
  posterPath: string | null;
  creators: string | null;
  creatorIds: number[];
  certification: string | null;
  popularity: number | null;
  status: string;
  numberOfSeasons: number | null;
  cast: { id: number; name: string; character: string; profilePath: string | null }[];
  keyCrew: { role: string; members: { id: number; name: string }[] }[];
  trailerYoutubeKey: string | null;
  flatrateProviders: { id: number; name: string; logoPath: string | null }[];
  recommendations: { tmdbId: number; mediaType: 'tv'; title: string; year: string | null; posterPath: string | null }[];
  seasons: TvSeasonSummary[];
};

type RawAggregateCast = {
  id: number;
  name: string;
  profile_path: string | null;
  order: number;
  roles: { character: string; episode_count: number }[];
};

type RawAggregateCrew = {
  id: number;
  name: string;
  department: string;
  profile_path: string | null;
  jobs: { job: string; episode_count: number }[];
};

type RawTvContentRatings = {
  results: { iso_3166_1: string; rating: string }[];
};

type RawTvRecommendation = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
};

type RawSeasonSummary = {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
};

type RawTvDetails = {
  id: number;
  name: string;
  tagline: string;
  overview: string;
  popularity?: number;
  episode_run_time: number[];
  first_air_date: string | null;
  last_air_date: string | null;
  status: string;
  number_of_seasons: number | null;
  genres: { id: number; name: string }[];
  backdrop_path: string | null;
  poster_path: string | null;
  created_by: { id: number; name: string }[];
  seasons?: RawSeasonSummary[];
  aggregate_credits?: { cast: RawAggregateCast[]; crew: RawAggregateCrew[] };
  videos?: { results: RawVideo[] };
  content_ratings?: RawTvContentRatings;
  'watch/providers'?: {
    results: Record<string, { flatrate?: RawProvider[]; link?: string }>;
  };
  recommendations?: { results: RawTvRecommendation[] };
};

function pickTvYearRange(first: string | null, last: string | null, status: string): string | null {
  const fy = first && first.length >= 4 ? first.slice(0, 4) : null;
  const ly = last && last.length >= 4 ? last.slice(0, 4) : null;
  if (!fy) return null;
  const stillRunning =
    status === 'Returning Series' || status === 'In Production' || status === 'Planned';
  if (stillRunning && (!ly || ly === fy)) return `${fy}–`;
  if (!ly || ly === fy) return fy;
  return `${fy}–${ly}`;
}

function pickTvUsCertification(cr: RawTvContentRatings | undefined): string | null {
  if (!cr?.results) return null;
  const us = cr.results.find((r) => r.iso_3166_1 === 'US');
  return us && us.rating.trim() !== '' ? us.rating : null;
}

function pickTvKeyCrew(
  createdBy: RawTvDetails['created_by'],
  crew: RawAggregateCrew[] | undefined,
): TvDetails['keyCrew'] {
  const out: TvDetails['keyCrew'] = [];
  if (createdBy && createdBy.length > 0) {
    const seen = new Set<number>();
    const members: { id: number; name: string }[] = [];
    for (const c of createdBy) {
      if (!seen.has(c.id)) {
        members.push({ id: c.id, name: c.name });
        seen.add(c.id);
      }
    }
    if (members.length > 0) out.push({ role: 'Created by', members });
  }
  if (crew) {
    const composerSeen = new Set<number>();
    const composers: { id: number; name: string }[] = [];
    for (const c of crew) {
      const hasMusicJob = c.jobs.some((j) => j.job === 'Original Music Composer');
      if (hasMusicJob && !composerSeen.has(c.id)) {
        composers.push({ id: c.id, name: c.name });
        composerSeen.add(c.id);
      }
    }
    if (composers.length > 0) out.push({ role: 'Music', members: composers });
  }
  return out;
}

function pickTvCast(cast: RawAggregateCast[] | undefined): TvDetails['cast'] {
  if (!cast) return [];
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.roles[0]?.character ?? '',
      profilePath: c.profile_path,
    }));
}

function pickTvSeasons(raw: RawTvDetails['seasons']): TvSeasonSummary[] {
  if (!raw) return [];
  return raw
    .filter((s) => s.season_number >= 1 && s.episode_count > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
      airDate: s.air_date,
      posterPath: s.poster_path,
      overview: s.overview,
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

function pickTvRecommendations(
  recs: RawTvDetails['recommendations'],
): TvDetails['recommendations'] {
  if (!recs?.results) return [];
  return recs.results.slice(0, 20).map((r) => ({
    tmdbId: r.id,
    mediaType: 'tv' as const,
    title: r.name,
    year: r.first_air_date && r.first_air_date.length >= 4 ? r.first_air_date.slice(0, 4) : null,
    posterPath: r.poster_path,
  }));
}

export async function getTvDetails(tvId: number, signal?: AbortSignal): Promise<TvDetails> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/tv/${tvId}?append_to_response=aggregate_credits,videos,watch/providers,content_ratings,recommendations&language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB tv failed: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as RawTvDetails;
  const createdByList = (raw.created_by ?? []).slice(0, 2);
  const creators =
    createdByList.length > 0
      ? createdByList.map((c) => c.name).join(' & ')
      : null;
  const creatorIds = createdByList
    .map((c) => Number(c.id))
    .filter((n) => Number.isFinite(n));

  return {
    tmdbId: raw.id,
    name: raw.name,
    tagline: raw.tagline ?? '',
    overview: raw.overview ?? '',
    episodeRuntime: raw.episode_run_time && raw.episode_run_time.length > 0 ? raw.episode_run_time[0] : null,
    yearRange: pickTvYearRange(raw.first_air_date, raw.last_air_date, raw.status),
    genres: raw.genres ?? [],
    backdropPath: raw.backdrop_path,
    posterPath: raw.poster_path,
    creators,
    creatorIds,
    certification: pickTvUsCertification(raw.content_ratings),
    popularity: raw.popularity ?? null,
    status: raw.status,
    numberOfSeasons: raw.number_of_seasons,
    cast: pickTvCast(raw.aggregate_credits?.cast),
    keyCrew: pickTvKeyCrew(raw.created_by, raw.aggregate_credits?.crew),
    trailerYoutubeKey: pickTrailer(raw.videos?.results),
    flatrateProviders: pickUsFlatrate(raw['watch/providers']),
    recommendations: pickTvRecommendations(raw.recommendations),
    seasons: pickTvSeasons(raw.seasons),
  };
}

export type TvEpisode = {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  stillPath: string | null;
};

export type SeasonDetails = {
  seasonNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  posterPath: string | null;
  episodes: TvEpisode[];
};

type RawSeasonDetails = {
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episodes: {
    episode_number: number;
    name: string;
    overview: string;
    air_date: string | null;
    still_path: string | null;
  }[];
};

export async function getSeasonDetails(
  tvId: number,
  seasonNumber: number,
  signal?: AbortSignal,
): Promise<SeasonDetails> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/tv/${tvId}/season/${seasonNumber}?language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB season failed: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as RawSeasonDetails;
  return {
    seasonNumber: raw.season_number,
    name: raw.name,
    overview: raw.overview,
    airDate: raw.air_date,
    posterPath: raw.poster_path,
    episodes: (raw.episodes ?? []).map((e) => ({
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview,
      airDate: e.air_date,
      stillPath: e.still_path,
    })),
  };
}

export async function getPersonDetails(
  personId: number,
  signal?: AbortSignal,
): Promise<PersonDetails> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/person/${personId}?append_to_response=combined_credits&language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB person failed: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as RawPersonDetails;

  return {
    id: raw.id,
    name: raw.name,
    biography: raw.biography ?? '',
    birthday: raw.birthday,
    deathday: raw.deathday,
    placeOfBirth: raw.place_of_birth,
    profilePath: raw.profile_path,
    knownForDepartment: raw.known_for_department ?? '',
    credits: normalizePersonCredits(raw.combined_credits),
  };
}

export type DiscoverItem = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
};

export type DiscoverPage = {
  page: number;
  totalPages: number;
  results: DiscoverItem[];
};

type RawDiscoverResult = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
};

type RawDiscoverResponse = {
  page: number;
  total_pages: number;
  results: RawDiscoverResult[];
};

export type DiscoverFilters = {
  genreId?: number;
  /** Start year of a decade (e.g. 1990 → 1990-01-01..1999-12-31). */
  decade?: number;
};

function decadeQueryFragment(
  mediaType: 'movie' | 'tv',
  decade: number | undefined,
): string {
  if (decade == null || !Number.isFinite(decade)) return '';
  const start = `${decade}-01-01`;
  const end = `${decade + 9}-12-31`;
  if (mediaType === 'movie') {
    return `&primary_release_date.gte=${start}&primary_release_date.lte=${end}`;
  }
  return `&first_air_date.gte=${start}&first_air_date.lte=${end}`;
}

export async function discoverByGenre(
  mediaType: 'movie' | 'tv',
  filtersOrGenreId: number | DiscoverFilters,
  page: number,
  signal?: AbortSignal,
): Promise<DiscoverPage> {
  assertTmdbConfigured();
  const filters: DiscoverFilters =
    typeof filtersOrGenreId === 'number'
      ? { genreId: filtersOrGenreId }
      : filtersOrGenreId;
  const params = [
    filters.genreId != null
      ? `with_genres=${encodeURIComponent(String(filters.genreId))}`
      : null,
    `sort_by=popularity.desc`,
    `include_adult=false`,
    `language=en-US`,
    `page=${page}`,
  ]
    .filter((p): p is string => p !== null)
    .join('&');
  const url = `${TMDB_BASE}/discover/${mediaType}?${params}${decadeQueryFragment(
    mediaType,
    filters.decade,
  )}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB discover failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as RawDiscoverResponse;
  const results: DiscoverItem[] = json.results.map((r) => {
    const title =
      mediaType === 'movie'
        ? r.title ?? r.original_title ?? ''
        : r.name ?? r.original_name ?? '';
    const date = mediaType === 'movie' ? r.release_date : r.first_air_date;
    return {
      tmdbId: r.id,
      mediaType,
      title,
      year: date && date.length >= 4 ? date.slice(0, 4) : null,
      posterPath: r.poster_path,
    };
  });
  return {
    page: json.page,
    totalPages: Math.min(json.total_pages ?? 1, 500),
    results,
  };
}

export async function discoverByDecade(
  mediaType: 'movie' | 'tv',
  decade: number,
  page: number,
  signal?: AbortSignal,
): Promise<DiscoverPage> {
  return discoverByGenre(mediaType, { decade }, page, signal);
}

export type MovieSearchResult = {
  tmdbId: number;
  mediaType: 'movie';
  title: string;
  year: string | null;
  posterPath: string | null;
  genreIds: number[];
};

export type TvSearchResult = {
  tmdbId: number;
  mediaType: 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  genreIds: number[];
};

export type PersonSearchResult = {
  tmdbId: number;
  mediaType: 'person';
  name: string;
  profilePath: string | null;
  knownFor: string;
};

export type SearchResult = MovieSearchResult | TvSearchResult | PersonSearchResult;

type RawMultiResult = {
  id: number;
  media_type?: 'movie' | 'tv' | 'person' | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  profile_path?: string | null;
  known_for_department?: string | null;
  genre_ids?: number[];
};

type TmdbMultiResponse = {
  page: number;
  total_pages: number;
  results: RawMultiResult[];
};

export type SearchPage = {
  page: number;
  totalPages: number;
  results: SearchResult[];
};

function normalizeMovieSearch(r: RawMultiResult): MovieSearchResult {
  return {
    tmdbId: r.id,
    mediaType: 'movie',
    title: r.title ?? r.original_title ?? '',
    year: r.release_date && r.release_date.length >= 4 ? r.release_date.slice(0, 4) : null,
    posterPath: r.poster_path,
    genreIds: r.genre_ids ?? [],
  };
}

function normalizeTvSearch(r: RawMultiResult): TvSearchResult {
  return {
    tmdbId: r.id,
    mediaType: 'tv',
    title: r.name ?? r.original_name ?? '',
    year: r.first_air_date && r.first_air_date.length >= 4 ? r.first_air_date.slice(0, 4) : null,
    posterPath: r.poster_path,
    genreIds: r.genre_ids ?? [],
  };
}

function normalizePersonSearch(r: RawMultiResult): PersonSearchResult {
  return {
    tmdbId: r.id,
    mediaType: 'person',
    name: r.name ?? r.original_name ?? '',
    profilePath: r.profile_path ?? null,
    knownFor: r.known_for_department ?? '',
  };
}

export async function searchMulti(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  assertTmdbConfigured();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${TMDB_BASE}/search/multi?query=${encodeURIComponent(trimmed)}&include_adult=false&language=en-US&page=1`;
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

  const json = (await res.json()) as TmdbMultiResponse;
  const out: SearchResult[] = [];
  for (const r of json.results) {
    if (r.media_type === 'movie') out.push(normalizeMovieSearch(r));
    else if (r.media_type === 'tv') out.push(normalizeTvSearch(r));
    else if (r.media_type === 'person') out.push(normalizePersonSearch(r));
  }
  return out;
}

export async function searchByType(
  query: string,
  mediaType: 'movie' | 'tv' | 'person',
  page = 1,
  signal?: AbortSignal,
): Promise<SearchPage> {
  assertTmdbConfigured();
  const trimmed = query.trim();
  if (!trimmed) return { page: 1, totalPages: 1, results: [] };

  const url = `${TMDB_BASE}/search/${mediaType}?query=${encodeURIComponent(trimmed)}&include_adult=false&language=en-US&page=${page}`;
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

  const json = (await res.json()) as TmdbMultiResponse;
  const results: SearchResult[] = json.results.map((r) => {
    if (mediaType === 'movie') return normalizeMovieSearch(r);
    if (mediaType === 'tv') return normalizeTvSearch(r);
    return normalizePersonSearch(r);
  });
  return {
    page: json.page,
    totalPages: Math.min(json.total_pages ?? 1, 500),
    results,
  };
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
  const { names } = pickDirectors(crew);
  if (names.length === 0) return null;
  return names.join(' & ');
}

function pickDirectors(
  crew: RawCrewMember[] | undefined,
): { names: string[]; ids: number[] } {
  if (!crew) return { names: [], ids: [] };
  const directors = crew.filter((c) => c.job === 'Director');
  if (directors.length === 0) return { names: [], ids: [] };
  return {
    names: directors.slice(0, 2).map((c) => c.name),
    ids: directors.slice(0, 2).map((c) => Number(c.id)).filter((n) => Number.isFinite(n)),
  };
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
    const members: { id: number; name: string }[] = [];
    const seenIds = new Set<number>();
    for (const c of crew) {
      if (jobs.includes(c.job) && !seenIds.has(c.id)) {
        members.push({ id: c.id, name: c.name });
        seenIds.add(c.id);
      }
    }
    if (members.length > 0) out.push({ role: label, members });
  }
  return out;
}

function pickRecommendations(
  recs: RawMovieDetails['recommendations'],
): MovieDetails['recommendations'] {
  if (!recs?.results) return [];
  return recs.results.slice(0, 20).map((r) => ({
    tmdbId: r.id,
    mediaType: 'movie' as const,
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
    genres: raw.genres ?? [],
    backdropPath: raw.backdrop_path,
    posterPath: raw.poster_path,
    director: pickDirector(raw.credits?.crew),
    directorIds: pickDirectors(raw.credits?.crew).ids,
    certification: pickUsCertification(raw.release_dates),
    popularity: raw.popularity ?? null,
    cast,
    keyCrew: pickKeyCrew(raw.credits?.crew),
    trailerYoutubeKey: pickTrailer(raw.videos?.results),
    flatrateProviders: pickUsFlatrate(raw['watch/providers']),
    recommendations: pickRecommendations(raw.recommendations),
  };
}


// ------- Discovery: trending + popular + genre catalog -------

export async function getGenres(
  mediaType: 'movie' | 'tv',
  signal?: AbortSignal,
): Promise<GenreRef[]> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/genre/${mediaType}/list?language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`TMDB genres failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { genres: GenreRef[] };
  return json.genres ?? [];
}

type RawTrendingItem = {
  id: number;
  media_type?: 'movie' | 'tv' | 'person' | string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
};

type RawListResponse<T> = {
  page: number;
  results: T[];
};

function trendingItemToDiscoverItem(r: RawTrendingItem): DiscoverItem | null {
  const mt = r.media_type;
  if (mt !== 'movie' && mt !== 'tv') return null;
  const title =
    mt === 'movie' ? r.title ?? r.original_title ?? '' : r.name ?? r.original_name ?? '';
  const date = mt === 'movie' ? r.release_date : r.first_air_date;
  return {
    tmdbId: r.id,
    mediaType: mt,
    title,
    year: date && date.length >= 4 ? date.slice(0, 4) : null,
    posterPath: r.poster_path,
  };
}

export async function getTrending(
  mediaType: 'all' | 'movie' | 'tv',
  signal?: AbortSignal,
): Promise<DiscoverItem[]> {
  assertTmdbConfigured();
  const url = `${TMDB_BASE}/trending/${mediaType}/day?language=en-US`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`TMDB trending failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as RawListResponse<RawTrendingItem>;
  const out: DiscoverItem[] = [];
  const force: 'movie' | 'tv' | null = mediaType === 'all' ? null : mediaType;
  for (const r of json.results) {
    const effective = force ?? (r.media_type === 'movie' || r.media_type === 'tv' ? r.media_type : null);
    if (!effective) continue;
    const item = trendingItemToDiscoverItem({ ...r, media_type: effective });
    if (item) out.push(item);
  }
  return out;
}

type RawPopularMovie = {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  poster_path: string | null;
};

type RawPopularTv = {
  id: number;
  name?: string;
  original_name?: string;
  first_air_date?: string;
  poster_path: string | null;
};

type RawPopularPerson = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string | null;
};

export async function getPopularMovies(signal?: AbortSignal): Promise<DiscoverItem[]> {
  assertTmdbConfigured();
  const res = await fetch(`${TMDB_BASE}/movie/popular?language=en-US&page=1`, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`TMDB popular movies failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as RawListResponse<RawPopularMovie>;
  return json.results.map((r) => ({
    tmdbId: r.id,
    mediaType: 'movie' as const,
    title: r.title ?? r.original_title ?? '',
    year: r.release_date && r.release_date.length >= 4 ? r.release_date.slice(0, 4) : null,
    posterPath: r.poster_path,
  }));
}

export async function getPopularTv(signal?: AbortSignal): Promise<DiscoverItem[]> {
  assertTmdbConfigured();
  const res = await fetch(`${TMDB_BASE}/tv/popular?language=en-US&page=1`, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`TMDB popular tv failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as RawListResponse<RawPopularTv>;
  return json.results.map((r) => ({
    tmdbId: r.id,
    mediaType: 'tv' as const,
    title: r.name ?? r.original_name ?? '',
    year: r.first_air_date && r.first_air_date.length >= 4 ? r.first_air_date.slice(0, 4) : null,
    posterPath: r.poster_path,
  }));
}

export async function getPopularPeople(signal?: AbortSignal): Promise<PersonSearchResult[]> {
  assertTmdbConfigured();
  const res = await fetch(`${TMDB_BASE}/person/popular?language=en-US&page=1`, {
    headers: {
      Authorization: `Bearer ${config.tmdbReadToken}`,
      Accept: 'application/json',
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`TMDB popular people failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as RawListResponse<RawPopularPerson>;
  return json.results.map((r) => ({
    tmdbId: r.id,
    mediaType: 'person' as const,
    name: r.name,
    profilePath: r.profile_path,
    knownFor: r.known_for_department ?? '',
  }));
}
