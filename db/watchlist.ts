import * as SQLite from 'expo-sqlite';

export type WatchlistItem = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: number;
};

export type NewWatchlistItem = Omit<WatchlistItem, 'addedAt'>;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('cinefill.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS watchlist (
          tmdb_id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          year TEXT,
          poster_path TEXT,
          added_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);
      `);
      return db;
    })();
  }
  return dbPromise;
}

type Row = {
  tmdb_id: number;
  title: string;
  year: string | null;
  poster_path: string | null;
  added_at: number;
};

function rowToItem(row: Row): WatchlistItem {
  return {
    tmdbId: row.tmdb_id,
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
    'INSERT OR REPLACE INTO watchlist (tmdb_id, title, year, poster_path, added_at) VALUES (?, ?, ?, ?, ?)',
    item.tmdbId,
    item.title,
    item.year,
    item.posterPath,
    addedAt,
  );
  return { ...item, addedAt };
}

export async function removeFromWatchlist(tmdbId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM watchlist WHERE tmdb_id = ?', tmdbId);
}

export async function isInWatchlist(tmdbId: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM watchlist WHERE tmdb_id = ?',
    tmdbId,
  );
  return (row?.c ?? 0) > 0;
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT tmdb_id, title, year, poster_path, added_at FROM watchlist ORDER BY added_at DESC',
  );
  return rows.map(rowToItem);
}
