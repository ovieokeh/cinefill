import * as SQLite from 'expo-sqlite';
import { ensureColumns, ensureSchema } from './connection';
import { getDeviceId, isSyncEnabled } from './sync';
import { notifySyncNeeded } from '@/lib/sync/events';
import {
  createRandomSyncId,
  isIncomingNewer,
  type DiaryEntryRecord,
  type SyncBaseRecord,
} from '@/lib/sync/protocol';

export type EntryMediaType = 'movie' | 'tv_season';

export type DiaryEntry = {
  id: number;
  syncId: string;
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
  updatedAt: number;
  deletedAt: number | null;
  dirty: number;
  lastModifiedDeviceId: string;
};

export type NewDiaryEntry = Omit<
  DiaryEntry,
  'id' | 'syncId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'dirty' | 'lastModifiedDeviceId'
>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('diary', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_id TEXT,
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        deleted_at INTEGER,
        dirty INTEGER NOT NULL DEFAULT 1,
        last_modified_device_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_entries_watched_date ON entries(watched_date DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_tv_season_uniq
        ON entries(tmdb_id, season_number)
        WHERE media_type = 'tv_season';
    `);
    await ensureColumns(db, 'entries', {
      sync_id: 'TEXT',
      updated_at: 'INTEGER',
      deleted_at: 'INTEGER',
      dirty: 'INTEGER NOT NULL DEFAULT 1',
      last_modified_device_id: 'TEXT',
    });
    await db.execAsync(`
      DROP INDEX IF EXISTS idx_entries_tv_season_uniq;
      UPDATE entries
      SET sync_id = 'diary:' || id || ':' || lower(hex(randomblob(8)))
      WHERE sync_id IS NULL;
      UPDATE entries SET updated_at = created_at WHERE updated_at IS NULL;
      UPDATE entries SET last_modified_device_id = 'legacy' WHERE last_modified_device_id IS NULL;
      UPDATE entries SET dirty = 1 WHERE dirty IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_sync_id ON entries(sync_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_tv_season_uniq
        ON entries(tmdb_id, season_number)
        WHERE media_type = 'tv_season' AND deleted_at IS NULL;
    `);
  });
}

type Row = {
  id: number;
  sync_id: string;
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
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
  last_modified_device_id: string;
};

const SELECT_COLS =
  'id, sync_id, tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at, updated_at, deleted_at, dirty, last_modified_device_id';

function rowToEntry(row: Row): DiaryEntry {
  return {
    id: row.id,
    syncId: row.sync_id,
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
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: row.dirty,
    lastModifiedDeviceId: row.last_modified_device_id,
  };
}

function rowToSyncBase(row: Row): SyncBaseRecord {
  return {
    syncId: row.sync_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    lastModifiedDeviceId: row.last_modified_device_id,
  };
}

function rowToSyncRecord(row: Row): DiaryEntryRecord {
  return {
    ...rowToSyncBase(row),
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
    `SELECT ${SELECT_COLS} FROM entries WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
  return row ? rowToEntry(row) : null;
}

export async function getEntryByTmdbId(tmdbId: number): Promise<DiaryEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'movie' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
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
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' AND season_number = ? AND deleted_at IS NULL LIMIT 1`,
    tmdbId,
    seasonNumber,
  );
  return row ? rowToEntry(row) : null;
}

export async function listShowSeasonEntries(tmdbId: number): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' AND deleted_at IS NULL ORDER BY season_number ASC`,
    tmdbId,
  );
  return rows.map(rowToEntry);
}

export async function getShowSeasonStats(
  tmdbId: number,
): Promise<{ mean: number; count: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mean: number | null; count: number }>(
    `SELECT AVG(rating) AS mean, COUNT(*) AS count FROM entries WHERE tmdb_id = ? AND media_type = 'tv_season' AND rating > 0 AND deleted_at IS NULL`,
    tmdbId,
  );
  return { mean: row?.mean ?? 0, count: row?.count ?? 0 };
}

export async function listEntries(): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE deleted_at IS NULL ORDER BY watched_date DESC, created_at DESC`,
  );
  return rows.map(rowToEntry);
}

export async function updateEntry(
  id: number,
  patch: Pick<DiaryEntry, 'watchedDate' | 'rating' | 'note'>,
): Promise<void> {
  const db = await getDb();
  const updatedAt = Date.now();
  const deviceId = await getDeviceId();
  await db.runAsync(
    'UPDATE entries SET watched_date = ?, rating = ?, note = ?, updated_at = ?, dirty = 1, last_modified_device_id = ? WHERE id = ? AND deleted_at IS NULL',
    patch.watchedDate,
    patch.rating,
    patch.note,
    updatedAt,
    deviceId,
    id,
  );
  notifySyncNeeded();
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    await db.runAsync(
      'UPDATE entries SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ? WHERE id = ? AND deleted_at IS NULL',
      updatedAt,
      updatedAt,
      deviceId,
      id,
    );
    notifySyncNeeded();
    return;
  }
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export async function addEntry(entry: NewDiaryEntry): Promise<DiaryEntry> {
  const db = await getDb();
  const createdAt = Date.now();
  const deviceId = await getDeviceId();
  const syncId = createRandomSyncId('diary');
  const result = await db.runAsync(
    `INSERT INTO entries
      (sync_id, tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at, updated_at, deleted_at, dirty, last_modified_device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    syncId,
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
    createdAt,
    null,
    1,
    deviceId,
  );
  const saved = {
    ...entry,
    id: result.lastInsertRowId,
    syncId,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    dirty: 1,
    lastModifiedDeviceId: deviceId,
  };
  notifySyncNeeded();
  return saved;
}

export async function addEntries(entries: NewDiaryEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  const createdAt = Date.now();
  const deviceId = await getDeviceId();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      const syncId = createRandomSyncId('diary');
      await db.runAsync(
        `INSERT INTO entries
          (sync_id, tmdb_id, media_type, season_number, season_name, title, year, poster_path, watched_date, rating, note, created_at, updated_at, deleted_at, dirty, last_modified_device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        syncId,
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
        createdAt,
        null,
        1,
        deviceId,
      );
    }
  });
  notifySyncNeeded();
}

/** Destructive: removes every diary entry. Returns the number deleted. */
export async function deleteAllEntries(): Promise<number> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    const result = await db.runAsync(
      `UPDATE entries
       SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ?
       WHERE deleted_at IS NULL`,
      updatedAt,
      updatedAt,
      deviceId,
    );
    notifySyncNeeded();
    return result.changes ?? 0;
  }
  const result = await db.runAsync(`DELETE FROM entries`);
  return result.changes ?? 0;
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
     WHERE media_type = 'movie' AND deleted_at IS NULL AND tmdb_id IN (${placeholders})`,
    ...unique,
  );
  for (const r of rows) {
    out.add(`${r.tmdb_id}|${r.watched_date}`);
  }
  return out;
}

export async function listDirtyDiaryEntryRecords(): Promise<DiaryEntryRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM entries WHERE dirty = 1`,
  );
  return rows.map(rowToSyncRecord);
}

export async function clearSyncedDiaryEntries(
  accepted: Map<string, number>,
): Promise<void> {
  if (accepted.size === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [syncId, updatedAt] of accepted) {
      await db.runAsync(
        'UPDATE entries SET dirty = 0 WHERE sync_id = ? AND updated_at = ?',
        syncId,
        updatedAt,
      );
    }
  });
}

export async function applyRemoteDiaryEntries(
  records: DiaryEntryRecord[],
): Promise<void> {
  if (records.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const record of records) {
      const existing = await db.getFirstAsync<Row>(
        `SELECT ${SELECT_COLS} FROM entries WHERE sync_id = ?`,
        record.syncId,
      );
      if (existing && !isIncomingNewer(record, rowToSyncBase(existing))) continue;
      if (existing) {
        await db.runAsync(
          `UPDATE entries
           SET tmdb_id = ?, media_type = ?, season_number = ?, season_name = ?, title = ?,
               year = ?, poster_path = ?, watched_date = ?, rating = ?, note = ?,
               created_at = ?, updated_at = ?, deleted_at = ?, dirty = 0,
               last_modified_device_id = ?
           WHERE sync_id = ?`,
          record.tmdbId,
          record.mediaType,
          record.seasonNumber,
          record.seasonName,
          record.title,
          record.year,
          record.posterPath,
          record.watchedDate,
          record.rating,
          record.note,
          record.createdAt,
          record.updatedAt,
          record.deletedAt,
          record.lastModifiedDeviceId,
          record.syncId,
        );
      } else {
        await db.runAsync(
          `INSERT INTO entries
            (sync_id, tmdb_id, media_type, season_number, season_name, title, year,
             poster_path, watched_date, rating, note, created_at, updated_at,
             deleted_at, dirty, last_modified_device_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          record.syncId,
          record.tmdbId,
          record.mediaType,
          record.seasonNumber,
          record.seasonName,
          record.title,
          record.year,
          record.posterPath,
          record.watchedDate,
          record.rating,
          record.note,
          record.createdAt,
          record.updatedAt,
          record.deletedAt,
          record.lastModifiedDeviceId,
        );
      }
    }
  });
}
