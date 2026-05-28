import * as SQLite from 'expo-sqlite';
import { ensureSchema } from './connection';
import { config } from '@/lib/config';
import { reviewMediaCacheRows } from '@/lib/review-fixtures';

export type CachedSeason = {
  seasonNumber: number;
  episodeCount: number;
};

export type MediaCacheRow = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  genreIds: number[];
  runtime: number | null;
  director: string | null;
  directorIds: number[];
  seasons: CachedSeason[];
  popularity: number | null;
  fetchedAt: number;
};

export type NewMediaCacheRow = Omit<MediaCacheRow, 'fetchedAt'>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('media_cache', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS media_cache (
        tmdb_id INTEGER NOT NULL,
        media_type TEXT NOT NULL,
        genre_ids TEXT NOT NULL,
        runtime INTEGER,
        director TEXT,
        director_ids TEXT,
        seasons_json TEXT,
        popularity REAL,
        fetched_at INTEGER NOT NULL,
        PRIMARY KEY (tmdb_id, media_type)
      );
    `);
  });
}

type Row = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  genre_ids: string;
  runtime: number | null;
  director: string | null;
  director_ids: string | null;
  seasons_json: string | null;
  popularity: number | null;
  fetched_at: number;
};

function parseNumberArray(json: string | null): number[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return [];
  }
}

function parseSeasons(json: string | null): CachedSeason[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s: unknown): s is CachedSeason =>
          !!s &&
          typeof s === 'object' &&
          typeof (s as CachedSeason).seasonNumber === 'number' &&
          typeof (s as CachedSeason).episodeCount === 'number',
      )
      .map((s) => ({ seasonNumber: s.seasonNumber, episodeCount: s.episodeCount }));
  } catch {
    return [];
  }
}

function rowToCache(row: Row): MediaCacheRow {
  let ids: number[] = [];
  try {
    const parsed = JSON.parse(row.genre_ids);
    if (Array.isArray(parsed)) {
      ids = parsed.filter((n): n is number => typeof n === 'number');
    }
  } catch {
    ids = [];
  }
  return {
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    genreIds: ids,
    runtime: row.runtime,
    director: row.director,
    directorIds: parseNumberArray(row.director_ids),
    seasons: parseSeasons(row.seasons_json),
    popularity: row.popularity,
    fetchedAt: row.fetched_at,
  };
}

export async function upsertMediaCache(item: NewMediaCacheRow): Promise<MediaCacheRow> {
  if (config.reviewMode) {
    return (
      (reviewMediaCacheRows.find(
        (row) => row.tmdbId === item.tmdbId && row.mediaType === item.mediaType,
      ) as MediaCacheRow | undefined) ?? {
        ...item,
        fetchedAt: Date.now(),
      }
    );
  }
  const db = await getDb();
  const fetchedAt = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO media_cache (tmdb_id, media_type, genre_ids, runtime, director, director_ids, seasons_json, popularity, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.tmdbId,
    item.mediaType,
    JSON.stringify(item.genreIds ?? []),
    item.runtime,
    item.director,
    JSON.stringify(item.directorIds ?? []),
    JSON.stringify(item.seasons ?? []),
    item.popularity,
    fetchedAt,
  );
  return { ...item, fetchedAt };
}

const SELECT_COLS =
  'tmdb_id, media_type, genre_ids, runtime, director, director_ids, seasons_json, popularity, fetched_at';

export async function getMediaCache(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
): Promise<MediaCacheRow | null> {
  if (config.reviewMode) {
    return (
      (reviewMediaCacheRows.find(
        (row) => row.tmdbId === tmdbId && row.mediaType === mediaType,
      ) as MediaCacheRow | undefined) ?? null
    );
  }
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM media_cache WHERE tmdb_id = ? AND media_type = ?`,
    tmdbId,
    mediaType,
  );
  return row ? rowToCache(row) : null;
}

export async function listAllCache(): Promise<MediaCacheRow[]> {
  if (config.reviewMode) return reviewMediaCacheRows as MediaCacheRow[];
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM media_cache`,
  );
  return rows.map(rowToCache);
}
