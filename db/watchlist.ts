import * as SQLite from 'expo-sqlite';
import { ensureColumns, ensureSchema } from './connection';
import { getDeviceId, isSyncEnabled } from './sync';
import { notifySyncNeeded } from '@/lib/sync/events';
import {
  isIncomingNewer,
  watchlistSyncId,
  type SyncBaseRecord,
  type WatchlistItemRecord,
} from '@/lib/sync/protocol';

export type WatchlistMediaType = 'movie' | 'tv';

export type WatchlistItem = {
  syncId: string;
  tmdbId: number;
  mediaType: WatchlistMediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: number;
  lastModifiedDeviceId: string;
};

export type NewWatchlistItem = Omit<
  WatchlistItem,
  'syncId' | 'addedAt' | 'updatedAt' | 'deletedAt' | 'dirty' | 'lastModifiedDeviceId'
>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('watchlist', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS watchlist (
        sync_id TEXT,
        tmdb_id INTEGER NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'movie',
        title TEXT NOT NULL,
        year TEXT,
        poster_path TEXT,
        added_at INTEGER NOT NULL,
        updated_at INTEGER,
        deleted_at INTEGER,
        dirty INTEGER NOT NULL DEFAULT 1,
        last_modified_device_id TEXT,
        PRIMARY KEY (tmdb_id, media_type)
      );
      CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);
    `);
    await ensureColumns(db, 'watchlist', {
      sync_id: 'TEXT',
      updated_at: 'INTEGER',
      deleted_at: 'INTEGER',
      dirty: 'INTEGER NOT NULL DEFAULT 1',
      last_modified_device_id: 'TEXT',
    });
    await db.execAsync(`
      UPDATE watchlist
      SET sync_id = 'watchlist:' || media_type || ':' || tmdb_id
      WHERE sync_id IS NULL;
      UPDATE watchlist SET updated_at = added_at WHERE updated_at IS NULL;
      UPDATE watchlist SET last_modified_device_id = 'legacy' WHERE last_modified_device_id IS NULL;
      UPDATE watchlist SET dirty = 1 WHERE dirty IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_sync_id ON watchlist(sync_id);
    `);
  });
}

type Row = {
  sync_id: string;
  tmdb_id: number;
  media_type: WatchlistMediaType;
  title: string;
  year: string | null;
  poster_path: string | null;
  added_at: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
  last_modified_device_id: string;
};

function rowToItem(row: Row): WatchlistItem {
  return {
    syncId: row.sync_id,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    year: row.year,
    posterPath: row.poster_path,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: row.dirty,
    lastModifiedDeviceId: row.last_modified_device_id,
  };
}

const SELECT_COLS =
  'sync_id, tmdb_id, media_type, title, year, poster_path, added_at, updated_at, deleted_at, dirty, last_modified_device_id';

function rowToSyncBase(row: Row): SyncBaseRecord {
  return {
    syncId: row.sync_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    lastModifiedDeviceId: row.last_modified_device_id,
  };
}

function rowToSyncRecord(row: Row): WatchlistItemRecord {
  return {
    ...rowToSyncBase(row),
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
  const deviceId = await getDeviceId();
  const syncId = watchlistSyncId(item.mediaType, item.tmdbId);
  await db.runAsync(
    `INSERT OR REPLACE INTO watchlist
      (sync_id, tmdb_id, media_type, title, year, poster_path, added_at, updated_at, deleted_at, dirty, last_modified_device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    syncId,
    item.tmdbId,
    item.mediaType,
    item.title,
    item.year,
    item.posterPath,
    addedAt,
    addedAt,
    null,
    1,
    deviceId,
  );
  notifySyncNeeded();
  return {
    ...item,
    syncId,
    addedAt,
    updatedAt: addedAt,
    deletedAt: null,
    dirty: 1,
    lastModifiedDeviceId: deviceId,
  };
}

/** Destructive: removes every watchlist row. Returns the number deleted. */
export async function deleteAllWatchlist(): Promise<number> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    const result = await db.runAsync(
      `UPDATE watchlist
       SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ?
       WHERE deleted_at IS NULL`,
      updatedAt,
      updatedAt,
      deviceId,
    );
    notifySyncNeeded();
    return result.changes ?? 0;
  }
  const result = await db.runAsync(`DELETE FROM watchlist`);
  return result.changes ?? 0;
}

export async function addToWatchlistBatch(items: NewWatchlistItem[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  const addedAt = Date.now();
  const deviceId = await getDeviceId();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const syncId = watchlistSyncId(item.mediaType, item.tmdbId);
      await db.runAsync(
        `INSERT OR REPLACE INTO watchlist
          (sync_id, tmdb_id, media_type, title, year, poster_path, added_at, updated_at, deleted_at, dirty, last_modified_device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        syncId,
        item.tmdbId,
        item.mediaType,
        item.title,
        item.year,
        item.posterPath,
        addedAt,
        addedAt,
        null,
        1,
        deviceId,
      );
    }
  });
  notifySyncNeeded();
}

export async function removeFromWatchlist(
  tmdbId: number,
  mediaType: WatchlistMediaType,
): Promise<void> {
  const db = await getDb();
  if (await isSyncEnabled()) {
    const updatedAt = Date.now();
    const deviceId = await getDeviceId();
    await db.runAsync(
      `UPDATE watchlist
       SET deleted_at = ?, updated_at = ?, dirty = 1, last_modified_device_id = ?
       WHERE tmdb_id = ? AND media_type = ? AND deleted_at IS NULL`,
      updatedAt,
      updatedAt,
      deviceId,
      tmdbId,
      mediaType,
    );
    notifySyncNeeded();
    return;
  }
  await db.runAsync('DELETE FROM watchlist WHERE tmdb_id = ? AND media_type = ?', tmdbId, mediaType);
}

export async function isInWatchlist(
  tmdbId: number,
  mediaType: WatchlistMediaType,
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM watchlist WHERE tmdb_id = ? AND media_type = ? AND deleted_at IS NULL',
    tmdbId,
    mediaType,
  );
  return (row?.c ?? 0) > 0;
}

export async function countWatchlist(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM watchlist WHERE deleted_at IS NULL',
  );
  return row?.c ?? 0;
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM watchlist WHERE deleted_at IS NULL ORDER BY added_at DESC`,
  );
  return rows.map(rowToItem);
}

export async function listDirtyWatchlistRecords(): Promise<WatchlistItemRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} FROM watchlist WHERE dirty = 1`,
  );
  return rows.map(rowToSyncRecord);
}

export async function clearSyncedWatchlistItems(
  accepted: Map<string, number>,
): Promise<void> {
  if (accepted.size === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [syncId, updatedAt] of accepted) {
      await db.runAsync(
        'UPDATE watchlist SET dirty = 0 WHERE sync_id = ? AND updated_at = ?',
        syncId,
        updatedAt,
      );
    }
  });
}

export async function applyRemoteWatchlistItems(
  records: WatchlistItemRecord[],
): Promise<void> {
  if (records.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const record of records) {
      const existing = await db.getFirstAsync<Row>(
        `SELECT ${SELECT_COLS} FROM watchlist WHERE sync_id = ?`,
        record.syncId,
      );
      if (existing && !isIncomingNewer(record, rowToSyncBase(existing))) continue;
      await db.runAsync(
        `INSERT OR REPLACE INTO watchlist
          (sync_id, tmdb_id, media_type, title, year, poster_path, added_at,
           updated_at, deleted_at, dirty, last_modified_device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        record.syncId,
        record.tmdbId,
        record.mediaType,
        record.title,
        record.year,
        record.posterPath,
        record.addedAt,
        record.updatedAt,
        record.deletedAt,
        record.lastModifiedDeviceId,
      );
    }
  });
}
