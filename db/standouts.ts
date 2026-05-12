import * as SQLite from 'expo-sqlite';
import { ensureSchema } from './connection';

export type EpisodeStandout = {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  showTitle: string;
  posterPath: string | null;
  markedAt: number;
};

export type NewEpisodeStandout = Omit<EpisodeStandout, 'markedAt'>;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  return ensureSchema('standouts', async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tv_episode_standouts (
        tmdb_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        episode_name TEXT NOT NULL,
        show_title TEXT NOT NULL,
        poster_path TEXT,
        marked_at INTEGER NOT NULL,
        PRIMARY KEY (tmdb_id, season_number, episode_number)
      );
      CREATE INDEX IF NOT EXISTS idx_standouts_show ON tv_episode_standouts(tmdb_id, season_number, episode_number);
    `);
  });
}

type Row = {
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  episode_name: string;
  show_title: string;
  poster_path: string | null;
  marked_at: number;
};

function rowToStandout(r: Row): EpisodeStandout {
  return {
    tmdbId: r.tmdb_id,
    seasonNumber: r.season_number,
    episodeNumber: r.episode_number,
    episodeName: r.episode_name,
    showTitle: r.show_title,
    posterPath: r.poster_path,
    markedAt: r.marked_at,
  };
}

export async function markStandout(item: NewEpisodeStandout): Promise<EpisodeStandout> {
  const db = await getDb();
  const markedAt = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO tv_episode_standouts
      (tmdb_id, season_number, episode_number, episode_name, show_title, poster_path, marked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    item.tmdbId,
    item.seasonNumber,
    item.episodeNumber,
    item.episodeName,
    item.showTitle,
    item.posterPath,
    markedAt,
  );
  return { ...item, markedAt };
}

export async function unmarkStandout(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const db = await getDb();
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
    'SELECT COUNT(*) AS c FROM tv_episode_standouts WHERE tmdb_id = ? AND season_number = ? AND episode_number = ?',
    tmdbId,
    seasonNumber,
    episodeNumber,
  );
  return (row?.c ?? 0) > 0;
}

export async function countStandouts(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tv_episode_standouts',
  );
  return row?.c ?? 0;
}

export async function listStandoutsForShow(tmdbId: number): Promise<EpisodeStandout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT tmdb_id, season_number, episode_number, episode_name, show_title, poster_path, marked_at FROM tv_episode_standouts WHERE tmdb_id = ? ORDER BY season_number ASC, episode_number ASC',
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
    'SELECT tmdb_id, season_number, episode_number, episode_name, show_title, poster_path, marked_at FROM tv_episode_standouts WHERE tmdb_id = ? AND season_number = ? ORDER BY episode_number ASC',
    tmdbId,
    seasonNumber,
  );
  return rows.map(rowToStandout);
}
