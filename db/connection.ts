import * as SQLite from 'expo-sqlite';

// Single underlying SQLite connection for the whole app.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function openConnection(): Promise<SQLite.SQLiteDatabase> {
  return (async () => {
    const db = await SQLite.openDatabaseAsync('cinefill.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    return db;
  })();
}

export function getConnection(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openConnection();
  return dbPromise;
}

// Per-table schema-init promise cache. Each table-owning module passes a
// unique key plus an idempotent init function (CREATE TABLE IF NOT EXISTS).
// The init runs at most once per process.
const schemaPromises = new Map<string, Promise<SQLite.SQLiteDatabase>>();

export function ensureSchema(
  key: string,
  init: (db: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<SQLite.SQLiteDatabase> {
  const existing = schemaPromises.get(key);
  if (existing) return existing;
  const p = (async () => {
    const db = await getConnection();
    await init(db);
    return db;
  })();
  schemaPromises.set(key, p);
  return p;
}
