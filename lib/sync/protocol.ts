export const SYNC_SCHEMA_VERSION = 1;

export type SyncCollectionKey =
  | 'diaryEntries'
  | 'watchlistItems'
  | 'episodeStandouts';

export type SyncBaseRecord = {
  syncId: string;
  updatedAt: number;
  deletedAt: number | null;
  lastModifiedDeviceId: string;
};

export type DiaryEntryRecord = SyncBaseRecord & {
  tmdbId: number;
  mediaType: 'movie' | 'tv_season';
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

export type WatchlistItemRecord = SyncBaseRecord & {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: number;
};

export type EpisodeStandoutRecord = SyncBaseRecord & {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  showTitle: string;
  posterPath: string | null;
  markedAt: number;
};

export type SyncRequest = {
  schemaVersion: 1;
  deviceId: string;
  cursor: string | null;
  changes: {
    diaryEntries: DiaryEntryRecord[];
    watchlistItems: WatchlistItemRecord[];
    episodeStandouts: EpisodeStandoutRecord[];
  };
};

export type SyncResponse = {
  schemaVersion: 1;
  serverTime: string;
  nextCursor: string;
  accepted: {
    diaryEntries: string[];
    watchlistItems: string[];
    episodeStandouts: string[];
  };
  changes: {
    diaryEntries: DiaryEntryRecord[];
    watchlistItems: WatchlistItemRecord[];
    episodeStandouts: EpisodeStandoutRecord[];
  };
};

export type LocalSyncState = SyncBaseRecord & {
  dirty: number;
};

export function createRandomSyncId(prefix: string): string {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${prefix}:${Date.now().toString(36)}:${a}${b}`;
}

export function watchlistSyncId(mediaType: 'movie' | 'tv', tmdbId: number): string {
  return `watchlist:${mediaType}:${tmdbId}`;
}

export function standoutSyncId(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
): string {
  return `standout:${tmdbId}:${seasonNumber}:${episodeNumber}`;
}

export function createDeviceId(): string {
  return createRandomSyncId('device');
}

export function isIncomingNewer(
  incoming: SyncBaseRecord,
  existing: SyncBaseRecord | null,
): boolean {
  if (!existing) return true;
  if (incoming.updatedAt !== existing.updatedAt) {
    return incoming.updatedAt > existing.updatedAt;
  }
  return incoming.lastModifiedDeviceId > existing.lastModifiedDeviceId;
}

export function acceptedMap(
  records: SyncBaseRecord[],
  acceptedIds: string[],
): Map<string, number> {
  const byId = new Map(records.map((record) => [record.syncId, record.updatedAt]));
  const out = new Map<string, number>();
  for (const id of acceptedIds) {
    const updatedAt = byId.get(id);
    if (updatedAt != null) out.set(id, updatedAt);
  }
  return out;
}
