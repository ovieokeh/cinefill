import {
  applyRemoteDiaryEntries,
  clearSyncedDiaryEntries,
  listDirtyDiaryEntryRecords,
} from '@/db/diary';
import {
  applyRemoteEpisodeStandouts,
  clearSyncedEpisodeStandouts,
  listDirtyEpisodeStandoutRecords,
} from '@/db/standouts';
import { setSyncError, setSyncSuccess } from '@/db/sync';
import {
  applyRemoteWatchlistItems,
  clearSyncedWatchlistItems,
  listDirtyWatchlistRecords,
} from '@/db/watchlist';
import {
  acceptedMap,
  SYNC_SCHEMA_VERSION,
  type SyncRequest,
  type SyncResponse,
} from './protocol';
import { getSyncSettings } from './settings';

export type SyncRunResult =
  | { status: 'skipped'; reason: 'disabled' | 'missing-config' }
  | { status: 'synced'; pulled: number; pushed: number };

function endpoint(serverUrl: string, path: string): string {
  return `${serverUrl.replace(/\/+$/, '')}${path}`;
}

function assertSyncResponse(value: unknown): SyncResponse {
  const response = value as SyncResponse;
  if (
    !response ||
    response.schemaVersion !== SYNC_SCHEMA_VERSION ||
    typeof response.nextCursor !== 'string' ||
    !response.accepted ||
    !response.changes
  ) {
    throw new Error('Server returned an invalid sync response.');
  }
  return response;
}

export async function runSync(): Promise<SyncRunResult> {
  const settings = await getSyncSettings();
  if (!settings.enabled) return { status: 'skipped', reason: 'disabled' };
  if (!settings.serverUrl || !settings.token) {
    return { status: 'skipped', reason: 'missing-config' };
  }

  const diaryEntries = await listDirtyDiaryEntryRecords();
  const watchlistItems = await listDirtyWatchlistRecords();
  const episodeStandouts = await listDirtyEpisodeStandoutRecords();
  const request: SyncRequest = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    deviceId: settings.deviceId,
    cursor: settings.lastCursor,
    changes: { diaryEntries, watchlistItems, episodeStandouts },
  };

  try {
    const res = await fetch(endpoint(settings.serverUrl, '/api/cinefill/v1/sync'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error(`Sync failed with HTTP ${res.status}.`);
    }
    const response = assertSyncResponse(await res.json());

    await applyRemoteDiaryEntries(response.changes.diaryEntries);
    await applyRemoteWatchlistItems(response.changes.watchlistItems);
    await applyRemoteEpisodeStandouts(response.changes.episodeStandouts);
    await clearSyncedDiaryEntries(acceptedMap(diaryEntries, response.accepted.diaryEntries));
    await clearSyncedWatchlistItems(
      acceptedMap(watchlistItems, response.accepted.watchlistItems),
    );
    await clearSyncedEpisodeStandouts(
      acceptedMap(episodeStandouts, response.accepted.episodeStandouts),
    );
    await setSyncSuccess(response.nextCursor);

    return {
      status: 'synced',
      pushed: diaryEntries.length + watchlistItems.length + episodeStandouts.length,
      pulled:
        response.changes.diaryEntries.length +
        response.changes.watchlistItems.length +
        response.changes.episodeStandouts.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed.';
    await setSyncError(message).catch(() => {});
    throw error;
  }
}

export async function checkSyncHealth(input: {
  serverUrl: string;
  token: string;
}): Promise<void> {
  const res = await fetch(endpoint(input.serverUrl, '/api/cinefill/v1/health'), {
    headers: { Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}.`);
}
