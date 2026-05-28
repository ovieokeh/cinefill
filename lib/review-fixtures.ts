import { colors } from '@/theme/tokens';

const REVIEW_TS = Date.UTC(2026, 4, 22, 9, 0, 0);

export const REVIEW_IMAGE_PREFIX = 'review:';

export type ReviewImageMeta = {
  title: string;
  eyebrow: string;
  bg: string;
  fg: string;
  accent: string;
};

type ReviewMovie = {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string;
  backdropPath: string;
  tagline: string;
  overview: string;
  runtime: number;
  certification: string;
  genres: { id: number; name: string }[];
  director: string;
  directorIds: number[];
  popularity: number;
};

type ReviewTv = {
  tmdbId: number;
  name: string;
  yearRange: string;
  posterPath: string;
  backdropPath: string;
  tagline: string;
  overview: string;
  episodeRuntime: number;
  certification: string;
  status: string;
  numberOfSeasons: number;
  genres: { id: number; name: string }[];
  creators: string;
  creatorIds: number[];
  popularity: number;
};

export const reviewMovies: ReviewMovie[] = [
  {
    tmdbId: 91001,
    title: 'Lanterns at Low Tide',
    year: '2026',
    posterPath: 'review:poster:lanterns',
    backdropPath: 'review:backdrop:lanterns',
    tagline: 'A small harbor keeps one impossible light burning.',
    overview:
      'After a coastal town loses power for a week, an archivist starts mapping the strange signals flickering across the bay.',
    runtime: 104,
    certification: 'PG-13',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 9648, name: 'Mystery' },
    ],
    director: 'Mara Vale',
    directorIds: [93001],
    popularity: 42,
  },
  {
    tmdbId: 91002,
    title: 'The Cedar Protocol',
    year: '2025',
    posterPath: 'review:poster:cedar',
    backdropPath: 'review:backdrop:cedar',
    tagline: 'Some secrets were planted on purpose.',
    overview:
      'A botanist and a field engineer uncover a dormant research network hidden beneath an old mountain preserve.',
    runtime: 137,
    certification: 'PG',
    genres: [
      { id: 878, name: 'Science Fiction' },
      { id: 12, name: 'Adventure' },
    ],
    director: 'Ivo Kline',
    directorIds: [93002],
    popularity: 36,
  },
  {
    tmdbId: 91003,
    title: 'Vellum Current',
    year: '2024',
    posterPath: 'review:poster:vellum',
    backdropPath: 'review:backdrop:vellum',
    tagline: 'Every page remembers the weather.',
    overview:
      'Two sisters restore a flooded bookshop and find marginal notes that seem to predict the next storm.',
    runtime: 96,
    certification: 'PG-13',
    genres: [
      { id: 18, name: 'Drama' },
      { id: 14, name: 'Fantasy' },
    ],
    director: 'Nessa Hart',
    directorIds: [93003],
    popularity: 29,
  },
  {
    tmdbId: 91004,
    title: 'A Map of Rain',
    year: '2026',
    posterPath: 'review:poster:rain',
    backdropPath: 'review:backdrop:rain',
    tagline: 'The shortest route home is never dry.',
    overview:
      'A courier in a sleepless city races to deliver a package that changes destination each time the rain starts.',
    runtime: 118,
    certification: 'R',
    genres: [
      { id: 53, name: 'Thriller' },
      { id: 80, name: 'Crime' },
    ],
    director: 'Theo Rusk',
    directorIds: [93004],
    popularity: 33,
  },
  {
    tmdbId: 91005,
    title: 'Blue Hour Bureau',
    year: '2023',
    posterPath: 'review:poster:blue-hour',
    backdropPath: 'review:backdrop:blue-hour',
    tagline: 'They file reports on impossible evenings.',
    overview:
      'A night-shift clerk joins a municipal office dedicated to solving the city problems that only appear after sunset.',
    runtime: 101,
    certification: 'PG',
    genres: [
      { id: 35, name: 'Comedy' },
      { id: 14, name: 'Fantasy' },
    ],
    director: 'Anika Rowe',
    directorIds: [93005],
    popularity: 24,
  },
  {
    tmdbId: 91006,
    title: 'Paper Sun Hotel',
    year: '2022',
    posterPath: 'review:poster:paper-sun',
    backdropPath: 'review:backdrop:paper-sun',
    tagline: 'Checkout is at dawn, if dawn arrives.',
    overview:
      'Guests at a roadside hotel realize each room opens onto a different version of the same summer morning.',
    runtime: 109,
    certification: 'PG-13',
    genres: [
      { id: 10749, name: 'Romance' },
      { id: 18, name: 'Drama' },
    ],
    director: 'Lena Moss',
    directorIds: [93006],
    popularity: 22,
  },
];

export const reviewTvShows: ReviewTv[] = [
  {
    tmdbId: 92001,
    name: 'Harbor Nine',
    yearRange: '2025-',
    posterPath: 'review:poster:harbor-nine',
    backdropPath: 'review:backdrop:harbor-nine',
    tagline: 'Nine docks. One signal.',
    overview:
      'A group of repair crews keeps a floating city alive while investigating messages arriving from an abandoned pier.',
    episodeRuntime: 44,
    certification: 'TV-14',
    status: 'Returning Series',
    numberOfSeasons: 3,
    genres: [
      { id: 18, name: 'Drama' },
      { id: 10765, name: 'Sci-Fi & Fantasy' },
    ],
    creators: 'Nora Saye & Bram Quill',
    creatorIds: [93101, 93102],
    popularity: 38,
  },
  {
    tmdbId: 92002,
    name: 'The Quiet Signal',
    yearRange: '2024-2026',
    posterPath: 'review:poster:quiet-signal',
    backdropPath: 'review:backdrop:quiet-signal',
    tagline: 'Silence has a schedule.',
    overview:
      'A rural radio collective discovers that its overnight broadcast is being answered by listeners decades apart.',
    episodeRuntime: 52,
    certification: 'TV-PG',
    status: 'Ended',
    numberOfSeasons: 2,
    genres: [
      { id: 9648, name: 'Mystery' },
      { id: 18, name: 'Drama' },
    ],
    creators: 'Remy Hale',
    creatorIds: [93103],
    popularity: 31,
  },
  {
    tmdbId: 92003,
    name: 'Juniper Trace',
    yearRange: '2026-',
    posterPath: 'review:poster:juniper-trace',
    backdropPath: 'review:backdrop:juniper-trace',
    tagline: 'Every trail keeps receipts.',
    overview:
      'An overprepared hiking club solves small mountain mysteries using maps, snacks, and suspiciously accurate notebooks.',
    episodeRuntime: 28,
    certification: 'TV-G',
    status: 'Returning Series',
    numberOfSeasons: 1,
    genres: [
      { id: 35, name: 'Comedy' },
      { id: 9648, name: 'Mystery' },
    ],
    creators: 'Sima Alder',
    creatorIds: [93104],
    popularity: 27,
  },
];

export const reviewPeople = [
  { tmdbId: 93001, mediaType: 'person' as const, name: 'Mara Vale', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93002, mediaType: 'person' as const, name: 'Ivo Kline', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93003, mediaType: 'person' as const, name: 'Nessa Hart', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93004, mediaType: 'person' as const, name: 'Theo Rusk', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93005, mediaType: 'person' as const, name: 'Anika Rowe', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93006, mediaType: 'person' as const, name: 'Lena Moss', profilePath: null, knownFor: 'Directing' },
  { tmdbId: 93101, mediaType: 'person' as const, name: 'Nora Saye', profilePath: null, knownFor: 'Writing' },
  { tmdbId: 93102, mediaType: 'person' as const, name: 'Bram Quill', profilePath: null, knownFor: 'Writing' },
];

export const reviewCast = [
  { id: 94001, name: 'Rina Bell', character: 'June', profilePath: null },
  { id: 94002, name: 'Owen Calder', character: 'Milo', profilePath: null },
  { id: 94003, name: 'Sasha Reed', character: 'Lena', profilePath: null },
  { id: 94004, name: 'Felix Noor', character: 'Arlen', profilePath: null },
  { id: 94005, name: 'Dara Wells', character: 'Mae', profilePath: null },
  { id: 94006, name: 'Jonas Pike', character: 'Orin', profilePath: null },
  { id: 94007, name: 'Mina Sol', character: 'Tess', profilePath: null },
  { id: 94008, name: 'Cal Wynn', character: 'Rowan', profilePath: null },
];

export const reviewDiaryEntries = [
  {
    id: 1,
    syncId: 'review-diary-1',
    tmdbId: 91002,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'The Cedar Protocol',
    year: '2025',
    posterPath: 'review:poster:cedar',
    watchedDate: '2026-05-22',
    rating: 5,
    note: 'Neat, propulsive, and oddly cozy for something with so many locked doors.',
    isPublic: false,
    createdAt: REVIEW_TS + 1,
    updatedAt: REVIEW_TS + 1,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 2,
    syncId: 'review-diary-2',
    tmdbId: 91001,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'Lanterns at Low Tide',
    year: '2026',
    posterPath: 'review:poster:lanterns',
    watchedDate: '2026-05-09',
    rating: 4.5,
    note: 'Gentle mystery, beautiful ending.',
    isPublic: false,
    createdAt: REVIEW_TS + 2,
    updatedAt: REVIEW_TS + 2,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 3,
    syncId: 'review-diary-3',
    tmdbId: 92001,
    mediaType: 'tv_season' as const,
    seasonNumber: 1,
    seasonName: 'Season 1',
    title: 'Harbor Nine',
    year: '2025',
    posterPath: 'review:poster:harbor-nine',
    watchedDate: '2026-04-27',
    rating: 4,
    note: 'The season finale makes the whole map click.',
    isPublic: false,
    createdAt: REVIEW_TS + 3,
    updatedAt: REVIEW_TS + 3,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 4,
    syncId: 'review-diary-4',
    tmdbId: 91003,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'Vellum Current',
    year: '2024',
    posterPath: 'review:poster:vellum',
    watchedDate: '2026-04-13',
    rating: 3.5,
    note: '',
    isPublic: false,
    createdAt: REVIEW_TS + 4,
    updatedAt: REVIEW_TS + 4,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 5,
    syncId: 'review-diary-5',
    tmdbId: 91004,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'A Map of Rain',
    year: '2026',
    posterPath: 'review:poster:rain',
    watchedDate: '2026-03-25',
    rating: 4,
    note: '',
    isPublic: false,
    createdAt: REVIEW_TS + 5,
    updatedAt: REVIEW_TS + 5,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 6,
    syncId: 'review-diary-6',
    tmdbId: 92002,
    mediaType: 'tv_season' as const,
    seasonNumber: 1,
    seasonName: 'Season 1',
    title: 'The Quiet Signal',
    year: '2024',
    posterPath: 'review:poster:quiet-signal',
    watchedDate: '2026-03-05',
    rating: 4.5,
    note: '',
    isPublic: false,
    createdAt: REVIEW_TS + 6,
    updatedAt: REVIEW_TS + 6,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 7,
    syncId: 'review-diary-7',
    tmdbId: 91005,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'Blue Hour Bureau',
    year: '2023',
    posterPath: 'review:poster:blue-hour',
    watchedDate: '2026-02-12',
    rating: 3,
    note: '',
    isPublic: false,
    createdAt: REVIEW_TS + 7,
    updatedAt: REVIEW_TS + 7,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    id: 8,
    syncId: 'review-diary-8',
    tmdbId: 91006,
    mediaType: 'movie' as const,
    seasonNumber: null,
    seasonName: null,
    title: 'Paper Sun Hotel',
    year: '2022',
    posterPath: 'review:poster:paper-sun',
    watchedDate: '2026-01-18',
    rating: 4,
    note: '',
    isPublic: false,
    createdAt: REVIEW_TS + 8,
    updatedAt: REVIEW_TS + 8,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
];

export const reviewWatchlistItems = [
  {
    syncId: 'watchlist:movie:91004',
    tmdbId: 91004,
    mediaType: 'movie' as const,
    title: 'A Map of Rain',
    year: '2026',
    posterPath: 'review:poster:rain',
    isPublic: false,
    addedAt: REVIEW_TS + 101,
    updatedAt: REVIEW_TS + 101,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    syncId: 'watchlist:tv:92003',
    tmdbId: 92003,
    mediaType: 'tv' as const,
    title: 'Juniper Trace',
    year: '2026-',
    posterPath: 'review:poster:juniper-trace',
    isPublic: false,
    addedAt: REVIEW_TS + 102,
    updatedAt: REVIEW_TS + 102,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
  {
    syncId: 'watchlist:movie:91006',
    tmdbId: 91006,
    mediaType: 'movie' as const,
    title: 'Paper Sun Hotel',
    year: '2022',
    posterPath: 'review:poster:paper-sun',
    isPublic: false,
    addedAt: REVIEW_TS + 103,
    updatedAt: REVIEW_TS + 103,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
];

export const reviewMediaCacheRows = [
  ...reviewMovies.map((m) => ({
    tmdbId: m.tmdbId,
    mediaType: 'movie' as const,
    genreIds: m.genres.map((g) => g.id),
    runtime: m.runtime,
    director: m.director,
    directorIds: m.directorIds,
    seasons: [],
    popularity: m.popularity,
    fetchedAt: REVIEW_TS,
  })),
  ...reviewTvShows.map((s) => ({
    tmdbId: s.tmdbId,
    mediaType: 'tv' as const,
    genreIds: s.genres.map((g) => g.id),
    runtime: s.episodeRuntime,
    director: s.creators,
    directorIds: s.creatorIds,
    seasons: Array.from({ length: s.numberOfSeasons }).map((_, i) => ({
      seasonNumber: i + 1,
      episodeCount: i === 0 ? 8 : 10,
    })),
    popularity: s.popularity,
    fetchedAt: REVIEW_TS,
  })),
];

export const reviewStandouts = [
  {
    syncId: 'standout:92001:1:6',
    tmdbId: 92001,
    seasonNumber: 1,
    episodeNumber: 6,
    episodeName: 'The Ninth Bell',
    showTitle: 'Harbor Nine',
    posterPath: 'review:poster:harbor-nine',
    markedAt: REVIEW_TS + 201,
    updatedAt: REVIEW_TS + 201,
    deletedAt: null,
    dirty: 0,
    lastModifiedDeviceId: 'review',
  },
];

const imageMeta: Record<string, ReviewImageMeta> = {
  'review:poster:lanterns': {
    title: 'Lanterns at Low Tide',
    eyebrow: 'MYSTERY',
    ...colors.reviewImage.lanterns,
  },
  'review:poster:cedar': {
    title: 'The Cedar Protocol',
    eyebrow: 'SCI-FI',
    ...colors.reviewImage.cedar,
  },
  'review:poster:vellum': {
    title: 'Vellum Current',
    eyebrow: 'DRAMA',
    ...colors.reviewImage.vellum,
  },
  'review:poster:rain': {
    title: 'A Map of Rain',
    eyebrow: 'THRILLER',
    ...colors.reviewImage.rain,
  },
  'review:poster:blue-hour': {
    title: 'Blue Hour Bureau',
    eyebrow: 'COMEDY',
    ...colors.reviewImage.blueHour,
  },
  'review:poster:paper-sun': {
    title: 'Paper Sun Hotel',
    eyebrow: 'ROMANCE',
    ...colors.reviewImage.paperSun,
  },
  'review:poster:harbor-nine': {
    title: 'Harbor Nine',
    eyebrow: 'SERIES',
    ...colors.reviewImage.harborNine,
  },
  'review:poster:quiet-signal': {
    title: 'The Quiet Signal',
    eyebrow: 'SERIES',
    ...colors.reviewImage.quietSignal,
  },
  'review:poster:juniper-trace': {
    title: 'Juniper Trace',
    eyebrow: 'SERIES',
    ...colors.reviewImage.juniperTrace,
  },
};

export function isReviewImagePath(path: string | null | undefined): path is string {
  return typeof path === 'string' && path.startsWith(REVIEW_IMAGE_PREFIX);
}

export function getReviewImageMeta(path: string | null | undefined): ReviewImageMeta | null {
  if (!path) return null;
  if (imageMeta[path]) return imageMeta[path];
  const normalized = path.replace('review:backdrop:', 'review:poster:');
  return imageMeta[normalized] ?? null;
}

export function reviewDiscoverItems(mediaType: 'all' | 'movie' | 'tv') {
  const movies = reviewMovies.map((m) => ({
    tmdbId: m.tmdbId,
    mediaType: 'movie' as const,
    title: m.title,
    year: m.year,
    posterPath: m.posterPath,
  }));
  const tv = reviewTvShows.map((s) => ({
    tmdbId: s.tmdbId,
    mediaType: 'tv' as const,
    title: s.name,
    year: s.yearRange,
    posterPath: s.posterPath,
  }));
  if (mediaType === 'movie') return movies;
  if (mediaType === 'tv') return tv;
  return [movies[0], tv[0], movies[1], tv[1], movies[2], tv[2], ...movies.slice(3)];
}

export function reviewMovieDetails(tmdbId: number) {
  const movie = reviewMovies.find((m) => m.tmdbId === tmdbId) ?? reviewMovies[0];
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    tagline: movie.tagline,
    overview: movie.overview,
    runtime: movie.runtime,
    genres: movie.genres,
    backdropPath: movie.backdropPath,
    posterPath: movie.posterPath,
    director: movie.director,
    directorIds: movie.directorIds,
    certification: movie.certification,
    popularity: movie.popularity,
    cast: reviewCast,
    keyCrew: [
      { role: 'Director', members: [{ id: movie.directorIds[0], name: movie.director }] },
      { role: 'Screenplay', members: [{ id: 93201, name: 'Elian Rook' }] },
      { role: 'Music', members: [{ id: 93202, name: 'Cora Vale' }] },
    ],
    trailerYoutubeKey: null,
    flatrateProviders: [],
    recommendations: reviewDiscoverItems('movie')
      .filter((item) => item.tmdbId !== movie.tmdbId)
      .slice(0, 6),
  };
}

export function reviewTvDetails(tmdbId: number) {
  const show = reviewTvShows.find((s) => s.tmdbId === tmdbId) ?? reviewTvShows[0];
  return {
    tmdbId: show.tmdbId,
    name: show.name,
    tagline: show.tagline,
    overview: show.overview,
    episodeRuntime: show.episodeRuntime,
    yearRange: show.yearRange,
    genres: show.genres,
    backdropPath: show.backdropPath,
    posterPath: show.posterPath,
    creators: show.creators,
    creatorIds: show.creatorIds,
    certification: show.certification,
    popularity: show.popularity,
    status: show.status,
    numberOfSeasons: show.numberOfSeasons,
    cast: reviewCast,
    keyCrew: [
      {
        role: 'Created by',
        members: show.creators.split(' & ').map((name, i) => ({
          id: show.creatorIds[i] ?? 93100 + i,
          name,
        })),
      },
      { role: 'Music', members: [{ id: 93203, name: 'Nia Pike' }] },
    ],
    trailerYoutubeKey: null,
    flatrateProviders: [],
    recommendations: reviewDiscoverItems('tv')
      .filter((item) => item.tmdbId !== show.tmdbId)
      .slice(0, 6),
    seasons: Array.from({ length: show.numberOfSeasons }).map((_, i) => ({
      seasonNumber: i + 1,
      name: `Season ${i + 1}`,
      episodeCount: i === 0 ? 8 : 10,
      airDate: `${2025 + i}-03-14`,
      posterPath: show.posterPath,
      overview:
        i === 0
          ? 'The crew learns how the city listens, and what it has been trying to say.'
          : 'New routes open across the harbor, along with a few old debts.',
    })),
  };
}

export function reviewSeasonDetails(tvId: number, seasonNumber: number) {
  const show = reviewTvDetails(tvId);
  const season = show.seasons.find((s) => s.seasonNumber === seasonNumber) ?? show.seasons[0];
  return {
    seasonNumber: season.seasonNumber,
    name: season.name,
    overview: season.overview,
    airDate: season.airDate,
    posterPath: season.posterPath,
    episodes: Array.from({ length: season.episodeCount }).map((_, i) => ({
      episodeNumber: i + 1,
      name: [
        'Pilot Light',
        'The Second Dock',
        'False Bearings',
        'Night Inventory',
        'Weather Glass',
        'The Ninth Bell',
        'Low Water',
        'Signal Day',
        'Return Current',
        'Final Approach',
      ][i] ?? `Episode ${i + 1}`,
      overview: '',
      airDate: season.airDate,
      stillPath: null,
    })),
  };
}

export const reviewGenres = {
  movie: [
    { id: 12, name: 'Adventure' },
    { id: 14, name: 'Fantasy' },
    { id: 18, name: 'Drama' },
    { id: 35, name: 'Comedy' },
    { id: 53, name: 'Thriller' },
    { id: 80, name: 'Crime' },
    { id: 878, name: 'Science Fiction' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
  ],
  tv: [
    { id: 18, name: 'Drama' },
    { id: 35, name: 'Comedy' },
    { id: 9648, name: 'Mystery' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
  ],
};
