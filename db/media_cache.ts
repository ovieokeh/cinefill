import * as SQLite from 'expo-sqlite';

export type MediaCacheRow = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  genreIds: number[];
  runtime: number | null;
  director: string | null;
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
  fetched_at: number;
};

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
    fetchedAt: row.fetched_at,
  };
}

export async function upsertMediaCache(item: NewMediaCacheRow): Promise<MediaCacheRow> {
  const db = await getDb();
  const fetchedAt = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO media_cache (tmdb_id, media_type, genre_ids, runtime, director, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    item.tmdbId,
    item.mediaType,
    JSON.stringify(item.genreIds ?? []),
    item.runtime,
    item.director,
    fetchedAt,
  );
  return { ...item, fetchedAt };
}

export async function getMediaCache(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
): Promise<MediaCacheRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT tmdb_id, media_type, genre_ids, runtime, director, fetched_at FROM media_cache WHERE tmdb_id = ? AND media_type = ?',
    tmdbId,
    mediaType,
  );
  return row ? rowToCache(row) : null;
}

export async function listAllCache(): Promise<MediaCacheRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT tmdb_id, media_type, genre_ids, runtime, director, fetched_at FROM media_cache',
  );
  return rows.map(rowToCache);
}
