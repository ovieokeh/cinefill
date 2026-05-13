import * as SQLite from 'expo-sqlite';
import { ensureColumns, ensureSchema } from './connection';
import { getDeviceId, isSyncEnabled } from './sync';
import { notifySyncNeeded } from '@/lib/sync/events';
import {
  isIncomingNewer,
  standoutSyncId,
  type EpisodeStandoutRecord,
  type SyncBaseRecord,
} from '@/lib/sync/protocol';

export type EpisodeStandout = {
  syncId: string;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  showTitle: string;
  posterPath: string | null;
  markedAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: number;
  lastModifiedDeviceId: string;
};

export type NewEpisodeStandout = Omit<
  EpisodeStandout,
  'syncId' | 'markedAt' | 'updatedAt' | 'deletedAt' | 'dirty' | 'lastModifiedDeviceId'
>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('standouts', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tv_episode_standouts (
        sync_id TEXT,
        tmdb_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        episode_name TEXT NOT NULL,
        show_title TEXT NOT NULL,
        poster_path TEXT,
        marked_at INTEGER NOT NULL,
        updated_at INTEGER,
        deleted_at INTEGER,
        dirty INTEGER NOT NULL DEFAULT 1,
        last_modified_device_id TEXT,
        PRIMARY KEY (tmdb_id, season_number, episode_number)
      );
      CREATE INDEX IF NOT EXISTS idx_standouts_show ON tv_episode_standouts(tmdb_id, season_number, episode_number);
    `);
    await ensureColumns(db, 'tv_episode_standouts', {
      sync_id: 'TEXT',
      updated_at: 'INTEGER',
      deleted_at: 'INTEGER',
      dirty: 'INTEGER NOT NULL DEFAULT 1',
      last_modified_device_id: 'TEXT',
    });
    await db.execAsync(`
      UPDATE tv_episode_standouts
      SET sync_id = 'standout:' || tmdb_id || ':' || season_number || ':' || episode_number
      WHERE sync_id IS NULL;
      UPDATE tv_episode_standouts SET updated_at = marked_at WHERE updated_at IS NULL;
      UPDATE tv_episode_standouts SET last_modified_device_id = 'legacy' WHERE last_modified_device_id IS NULL;
      UPDATE tv_episode_standouts SET dirty = 1 WHERE dirty IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_standouts_sync_id ON tv_episode_standouts(sync_id);
    `);
  });
}

type Row = {
  sync_id: string;
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  episode_name: string;
  show_title: string;
  poster_path: string | null;
  marked_at: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
  last_modified_device_id: string;
};

function rowToStandout(r: Row): EpisodeStandout {
  return {
    syncId: r.sync_id,
    tmdbId: r.tmdb_id,
    seasonNumber: r.season_number,
    episodeNumber: r.episode_number,
    episodeName: r.episode_name,
    showTitle: r.show_title,
    posterPath: r.poster_path,
    markedAt: r.marked_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    dirty: r.dirty,
    lastModifiedDeviceId: r.last_modified_device_id,
  };
}

const SELECT_COLS =
  'sync_id, tmdb_id, season_number, episode_number, episode_name, show_title, poster_path, marked_at, updated_at, deleted_at, dirty, last_modified_device_id';

function rowToSyncBase(row: Row): SyncBaseRecord {
  return {
    syncId: row.sync_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    lastModifiedDeviceId: row.last_modified_device_id,
  };
}

function rowToSyncRecord(row: Row): EpisodeStandoutRecord {
  return {
    ...rowToSyncBase(row),
    tmdbId: row.tmdb_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    episodeName: row.episode_name,
    showTitle: row.show_title,
    posterPath: row.poster_path,
    markedAt: row.marked_at,
  };
}

export async function markStandout(item: NewEpisodeStandout): Promise<EpisodeStandout> {
  const db = await getDb();
  const markedAt = Date.now();
  const deviceId = await getDeviceId();
  const syncId = standoutSyncId(item.tmdbId, item.seasonNumber, item.episodeNumber);
  await db.runAsync(
    `INSERT OR REPLACE INTO tv_episode_standouts
      (sync_id, tmdb_id, season_number, episode_number, episode_name, show_title,
       poster_path, marked_at, updated_at, deleted_at, dirty, last_modified_device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    syncId,
    item.tmdbId,
    item.seasonNumber,
    item.episodeNumber,
    item.episodeName,
    item.showTitle,
    item.posterPath,
    markedAt,
    markedAt,
    null,
    1,
    deviceId,
  );
  notifySyncNeeded();
  return {
    ...item,
    syncId,
    markedAt,
    updatedAt: markedAt,
    deletedAt: null,
    dirty: 1,
    lastModifiedDeviceId: deviceId,
  };
}

export async function unmarkStandout(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    await db.runAsync(
      `UPDATE tv_episode_standouts
       SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ?
       WHERE tmdb_id = ? AND season_number = ? AND episode_number = ? AND deleted_at IS NULL`,
      updatedAt,
      updatedAt,
      deviceId,
      tmdbId,
      seasonNumber,
      episodeNumber,
    );
    notifySyncNeeded();
    return;
  }
  await db.runAsync(
    'DELETE FROM tv_episode_standouts WHERE tmdb_id = ? AND season_number = ? AND episode_number = ?',
    tmdbId,
    seasonNumber,
    episodeNumber,
  );
}

export async function isStandout(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tv_episode_standouts WHERE tmdb_id = ? AND season_number = ? AND episode_number = ? AND deleted_at IS NULL',
    tmdbId,
    seasonNumber,
    episodeNumber,
  );
  return (row?.c ?? 0) > 0;
}

export async function countStandouts(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tv_episode_standouts WHERE deleted_at IS NULL',
  );
  return row?.c ?? 0;
}

export async function listStandoutsForShow(tmdbId: number): Promise<EpisodeStandout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM tv_episode_standouts WHERE tmdb_id = ? AND deleted_at IS NULL ORDER BY season_number ASC, episode_number ASC`,
    tmdbId,
  );
  return rows.map(rowToStandout);
}

export async function listStandoutsForSeason(
  tmdbId: number,
  seasonNumber: number,
): Promise<EpisodeStandout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM tv_episode_standouts WHERE tmdb_id = ? AND season_number = ? AND deleted_at IS NULL ORDER BY episode_number ASC`,
    tmdbId,
    seasonNumber,
  );
  return rows.map(rowToStandout);
}

export async function listStandouts(): Promise<EpisodeStandout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM tv_episode_standouts WHERE deleted_at IS NULL ORDER BY marked_at DESC`,
  );
  return rows.map(rowToStandout);
}

/** Destructive: removes every standout. Returns the number deleted. */
export async function deleteAllStandouts(): Promise<number> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    const result = await db.runAsync(
      `UPDATE tv_episode_standouts
       SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ?
       WHERE deleted_at IS NULL`,
      updatedAt,
      updatedAt,
      deviceId,
    );
    notifySyncNeeded();
    return result.changes ?? 0;
  }
  const result = await db.runAsync(`DELETE FROM tv_episode_standouts`);
  return result.changes ?? 0;
}

export async function listDirtyEpisodeStandoutRecords(): Promise<EpisodeStandoutRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM tv_episode_standouts WHERE dirty = 1`,
  );
  return rows.map(rowToSyncRecord);
}

export async function clearSyncedEpisodeStandouts(
  accepted: Map<string, number>,
): Promise<void> {
  if (accepted.size === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [syncId, updatedAt] of accepted) {
      await db.runAsync(
        'UPDATE tv_episode_standouts SET dirty = 0 WHERE sync_id = ? AND updated_at = ?',
        syncId,
        updatedAt,
      );
    }
  });
}

export async function applyRemoteEpisodeStandouts(
  records: EpisodeStandoutRecord[],
): Promise<void> {
  if (records.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const record of records) {
      const existing = await db.getFirstAsync<Row>(
        `SELECT ${SELECT_COLS} FROM tv_episode_standouts WHERE sync_id = ?`,
        record.syncId,
      );
      if (existing && !isIncomingNewer(record, rowToSyncBase(existing))) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO tv_episode_standouts
          (sync_id, tmdb_id, season_number, episode_number, episode_name, show_title,
           poster_path, marked_at, updated_at, deleted_at, dirty, last_modified_device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        record.syncId,
        record.tmdbId,
        record.seasonNumber,
        record.episodeNumber,
        record.episodeName,
        record.showTitle,
        record.posterPath,
        record.markedAt,
        record.updatedAt,
        record.deletedAt,
        record.lastModifiedDeviceId,
      );
    }
  });
}
