import * as SQLite from 'expo-sqlite';

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
  seasons: CachedSeason[];
  fetchedAt: number;
};

export type NewMediaCacheRow = Omit<MediaCacheRow, 'fetchedAt'>;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('cinefill.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS media_cache (
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL,
          genre_ids TEXT NOT NULL,
          runtime INTEGER,
          director TEXT,
          fetched_at INTEGER NOT NULL,
          PRIMARY KEY (tmdb_id, media_type)
        );
      `);
      const cols = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(media_cache)`,
      );
      if (!cols.some((c) => c.name === 'seasons_json')) {
        await db.execAsync(`ALTER TABLE media_cache ADD COLUMN seasons_json TEXT`);
      }
      return db;
    })();
  }
  return dbPromise;
}

type Row = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  genre_ids: string;
  runtime: number | null;
  director: string | null;
  seasons_json: string | null;
  fetched_at: number;
};

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
    seasons: parseSeasons(row.seasons_json),
    fetchedAt: row.fetched_at,
  };
}

export async function upsertMediaCache(item: NewMediaCacheRow): Promise<MediaCacheRow> {
  const db = await getDb();
  const fetchedAt = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO media_cache (tmdb_id, media_type, genre_ids, runtime, director, seasons_json, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    item.tmdbId,
    item.mediaType,
    JSON.stringify(item.genreIds ?? []),
    item.runtime,
    item.director,
    JSON.stringify(item.seasons ?? []),
    fetchedAt,
  );
  return { ...item, fetchedAt };
}

const SELECT_COLS =
  'tmdb_id, media_type, genre_ids, runtime, director, seasons_json, fetched_at';

export async function getMediaCache(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
): Promise<MediaCacheRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM media_cache WHERE tmdb_id = ? AND media_type = ?`,
    tmdbId,
    mediaType,
  );
  return row ? rowToCache(row) : null;
}

export async function listAllCache(): Promise<MediaCacheRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM media_cache`,
  );
  return rows.map(rowToCache);
}
