import * as SQLite from 'expo-sqlite';
import { ensureSchema } from './connection';

export type WatchlistMediaType = 'movie' | 'tv';

export type WatchlistItem = {
  tmdbId: number;
  mediaType: WatchlistMediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: number;
};

export type NewWatchlistItem = Omit<WatchlistItem, 'addedAt'>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('watchlist', async (db) => {
    const cols = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(watchlist)',
    );
    const tableExists = cols.length > 0;
    const hasMediaType = cols.some((c) => c.name === 'media_type');

    if (!tableExists) {
      await db.execAsync(`
        CREATE TABLE watchlist (
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL DEFAULT 'movie',
          title TEXT NOT NULL,
          year TEXT,
          poster_path TEXT,
          added_at INTEGER NOT NULL,
          PRIMARY KEY (tmdb_id, media_type)
        );
      `);
    } else if (!hasMediaType) {
      // Migrate v1 → v2: add media_type, change PK to composite.
      await db.execAsync(`
        ALTER TABLE watchlist RENAME TO watchlist_old;
        CREATE TABLE watchlist (
          tmdb_id INTEGER NOT NULL,
          media_type TEXT NOT NULL DEFAULT 'movie',
          title TEXT NOT NULL,
          year TEXT,
          poster_path TEXT,
          added_at INTEGER NOT NULL,
          PRIMARY KEY (tmdb_id, media_type)
        );
        INSERT INTO watchlist (tmdb_id, media_type, title, year, poster_path, added_at)
          SELECT tmdb_id, 'movie', title, year, poster_path, added_at FROM watchlist_old;
        DROP TABLE watchlist_old;
      `);
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);',
    );
  });
}

type Row = {
  tmdb_id: number;
  media_type: WatchlistMediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  added_at: number;
};

function rowToItem(row: Row): WatchlistItem {
  return {
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterPath: row.poster_path,
    addedAt: row.added_at,
  };
}

export async function addToWatchlist(item: NewWatchlistItem): Promise<WatchlistItem> {
  const db = await getDb();
  const addedAt = Date.now();
  await db.runAsync(
    'INSERT OR REPLACE INTO watchlist (tmdb_id, media_type, title, year, poster_path, added_at) VALUES (?, ?, ?, ?, ?, ?)',
    item.tmdbId,
    item.mediaType,
    item.title,
    item.year,
    item.posterPath,
    addedAt,
  );
  return { ...item, addedAt };
}

export async function addToWatchlistBatch(items: NewWatchlistItem[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  const addedAt = Date.now();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        'INSERT OR REPLACE INTO watchlist (tmdb_id, media_type, title, year, poster_path, added_at) VALUES (?, ?, ?, ?, ?, ?)',
        item.tmdbId,
        item.mediaType,
        item.title,
        item.year,
        item.posterPath,
        addedAt,
      );
    }
  });
}

export async function removeFromWatchlist(
  tmdbId: number,
  mediaType: WatchlistMediaType,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM watchlist WHERE tmdb_id = ? AND media_type = ?',
    tmdbId,
    mediaType,
  );
}

export async function isInWatchlist(
  tmdbId: number,
  mediaType: WatchlistMediaType,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM watchlist WHERE tmdb_id = ? AND media_type = ?',
    tmdbId,
    mediaType,
  );
  return (row?.c ?? 0) > 0;
}

export async function countWatchlist(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM watchlist');
  return row?.c ?? 0;
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT tmdb_id, media_type, title, year, poster_path, added_at FROM watchlist ORDER BY added_at DESC',
  );
  return rows.map(rowToItem);
}
