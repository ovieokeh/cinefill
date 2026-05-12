import * as SQLite from 'expo-sqlite';
import { ensureSchema } from './connection';

export type EntryMediaType = 'movie' | 'tv_season';

export type DiaryEntry = {
  id: number;
  tmdbId: number;
  mediaType: EntryMediaType;
  seasonNumber: number | null;
  seasonName: string | null;
  title: string;
  year: string | null;
  posterPath: string | null;
  watchedDate: string;
  rating: number;
  note: string;
  createdAt: number;
};

export type NewDiaryEntry = Omit<DiaryEntry, 'id' | 'createdAt'>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('diary', async (db) => {
    // Base table — created on a fresh install with the full schema.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id INTEGER NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'movie',
        season_number INTEGER,
        season_name TEXT,
        title TEXT NOT NULL,
        year TEXT,
        poster_path TEXT,
        watched_date TEXT NOT NULL,
        rating REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );
    `);

    // Migrate older databases that pre-date media_type / season columns.
    const cols = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(entries)',
    );
    const has = (n: string) => cols.some((c) => c.name === n);
    if (!has('media_type')) {
      await db.execAsync(
        "ALTER TABLE entries ADD COLUMN media_type TEXT NOT NULL DEFAULT 'movie';",
      );
    }
    if (!has('season_number')) {
      await db.execAsync('ALTER TABLE entries ADD COLUMN season_number INTEGER;');
    }
    if (!has('season_name')) {
      await db.execAsync('ALTER TABLE entries ADD COLUMN season_name TEXT;');
    }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_entries_watched_date ON entries(watched_date DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_tv_season_uniq
        ON entries(tmdb_id, season_number)
        WHERE media_type = 'tv_season';
    `);
  });
}

type Row = {
  id: number;
  tmdb_id: number;
  media_type: EntryMediaType;
  season_number: number | null;
  season_name: string | null;
  title: string;
  year: string | null;
  poster_path: string | null;
  watched_date: string;
  rating: number;
  note: string;
  created_at: number;
};

const SELECT_COLS =
  'id, tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at';

function rowToEntry(row: Row): DiaryEntry {
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    seasonNumber: row.season_number,
    seasonName: row.season_name,
    title: row.title,
    year: row.year,
    posterPath: row.poster_path,
    watchedDate: row.watched_date,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function getEntry(id: number): Promise<DiaryEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE id = ?`,
    id,
  );
  return row ? rowToEntry(row) : null;
}

export async function getEntryByTmdbId(tmdbId: number): Promise<DiaryEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'movie' ORDER BY created_at DESC LIMIT 1`,
    tmdbId,
  );
  return row ? rowToEntry(row) : null;
}

export async function getTvSeasonEntry(
  tmdbId: number,
  seasonNumber: number,
): Promise<DiaryEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' AND season_number = ? LIMIT 1`,
    tmdbId,
    seasonNumber,
  );
  return row ? rowToEntry(row) : null;
}

export async function listShowSeasonEntries(tmdbId: number): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' ORDER BY season_number ASC`,
    tmdbId,
  );
  return rows.map(rowToEntry);
}

export async function getShowSeasonStats(
  tmdbId: number,
): Promise<{ mean: number; count: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mean: number | null; count: number }>(
    `SELECT AVG(rating) AS mean, COUNT(*) AS count FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' AND rating > 0`,
    tmdbId,
  );
  return { mean: row?.mean ?? 0, count: row?.count ?? 0 };
}

export async function listEntries(): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries ORDER BY watched_date DESC, created_at DESC`,
  );
  return rows.map(rowToEntry);
}

export async function updateEntry(
  id: number,
  patch: Pick<DiaryEntry, 'watchedDate' | 'rating' | 'note'>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entries SET watched_date = ?, rating = ?, note = ? WHERE id = ?',
    patch.watchedDate,
    patch.rating,
    patch.note,
    id,
  );
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function addEntry(entry: NewDiaryEntry): Promise<DiaryEntry> {
  const db = await getDb();
  const createdAt = Date.now();
  const result = await db.runAsync(
    `INSERT INTO entries
      (tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.tmdbId,
    entry.mediaType,
    entry.seasonNumber,
    entry.seasonName,
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

export async function addEntries(entries: NewDiaryEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  const createdAt = Date.now();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO entries
          (tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.tmdbId,
        entry.mediaType,
        entry.seasonNumber,
        entry.seasonName,
        entry.title,
        entry.year,
        entry.posterPath,
        entry.watchedDate,
        entry.rating,
        entry.note,
        createdAt,
      );
    }
  });
}

export async function listExistingMovieWatchKeys(
  tmdbIds: number[],
): Promise<Set<string>> {
  const out = new Set<string>();
  if (tmdbIds.length === 0) return out;
  const db = await getDb();
  const unique = [...new Set(tmdbIds)];
  const placeholders = unique.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ tmdb_id: number; watched_date: string }>(
    `SELECT tmdb_id, watched_date FROM entries
     WHERE media_type = 'movie' AND tmdb_id IN (${placeholders})`,
    ...unique,
  );
  for (const r of rows) {
    out.add(`${r.tmdb_id}|${r.watched_date}`);
  }
  return out;
}
