import * as SQLite from 'expo-sqlite';

import { ensureSchema } from './connection';
import { createDeviceId } from '@/lib/sync/protocol';

export type SyncMeta = {
  deviceId: string;
  serverUrl: string;
  enabled: boolean;
  lastCursor: string | null;
  lastSuccessAt: number | null;
  lastError: string | null;
};

const DEFAULT_META: Omit<SyncMeta, 'deviceId'> = {
  serverUrl: '',
  enabled: false,
  lastCursor: null,
  lastSuccessAt: null,
  lastError: null,
};

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('sync_meta', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  });
}

async function getValue(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

async function setValue(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  if (value == null) {
    await db.runAsync('DELETE FROM sync_meta WHERE key = ?', key);
    return;
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

export async function getDeviceId(): Promise<string> {
  const existing = await getValue('device_id');
  if (existing) return existing;
  const next = createDeviceId();
  await setValue('device_id', next);
  return next;
}

export async function getSyncMeta(): Promise<SyncMeta> {
  const deviceId = await getDeviceId();
  const [serverUrl, enabled, lastCursor, lastSuccessAt, lastError] = await Promise.all([
    getValue('server_url'),
    getValue('enabled'),
    getValue('last_cursor'),
    getValue('last_success_at'),
    getValue('last_error'),
  ]);
  return {
    ...DEFAULT_META,
    deviceId,
    serverUrl: serverUrl ?? DEFAULT_META.serverUrl,
    enabled: enabled === '1',
    lastCursor,
    lastSuccessAt: lastSuccessAt ? Number(lastSuccessAt) : null,
    lastError,
  };
}

export async function saveSyncConfig(input: {
  enabled: boolean;
  serverUrl: string;
}): Promise<void> {
  await Promise.all([
    setValue('enabled', input.enabled ? '1' : '0'),
    setValue('server_url', input.serverUrl.trim()),
  ]);
}

export async function setSyncCursor(cursor: string | null): Promise<void> {
  await setValue('last_cursor', cursor);
}

export async function setSyncSuccess(cursor: string): Promise<void> {
  await Promise.all([
    setValue('last_cursor', cursor),
    setValue('last_success_at', String(Date.now())),
    setValue('last_error', null),
  ]);
}

export async function setSyncError(message: string): Promise<void> {
  await setValue('last_error', message);
}

export async function isSyncEnabled(): Promise<boolean> {
  const enabled = await getValue('enabled');
  return enabled === '1';
}
