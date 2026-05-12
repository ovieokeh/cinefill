import * as SQLite from 'expo-sqlite';

export type DiaryEntry = {
  id: number;
  tmdbId: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  watchedDate: string;
  rating: number;
  note: string;
  createdAt: number;
};

export type NewDiaryEntry = Omit<DiaryEntry, 'id' | 'createdAt'>;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('cinefill.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tmdb_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          year TEXT,
          poster_path TEXT,
          watched_date TEXT NOT NULL,
          rating REAL NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_entries_watched_date ON entries(watched_date DESC);
      `);
      return db;
    })();
  }
  return dbPromise;
}

type Row = {
  id: number;
  tmdb_id: number;
  title: string;
  year: string | null;
  poster_path: string | null;
  watched_date: string;
  rating: number;
  note: string;
  created_at: number;
};

function rowToEntry(row: Row): DiaryEntry {
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    title: row.title,
    year: row.year,
    posterPath: row.poster_path,
    watchedDate: row.watched_date,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listEntries(): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT id, tmdb_id, title, year, poster_path, watched_date, rating, note, created_at FROM entries ORDER BY watched_date DESC, created_at DESC',
  );
  return rows.map(rowToEntry);
}

export async function addEntry(entry: NewDiaryEntry): Promise<DiaryEntry> {
  const db = await getDb();
  const createdAt = Date.now();
  const result = await db.runAsync(
    'INSERT INTO entries (tmdb_id, title, year, poster_path, watched_date, rating, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    entry.tmdbId,
    entry.title,
    entry.year,
    entry.posterPath,
    entry.watchedDate,
    entry.rating,
    entry.note,
    createdAt,
  );
  return {
    ...entry,
    id: result.lastInsertRowId,
    createdAt,
  };
}
