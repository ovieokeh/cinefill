import {
  acceptedMap,
  isIncomingNewer,
  standoutSyncId,
  watchlistSyncId,
  type SyncBaseRecord,
} from '@/lib/sync/protocol';

const base = (patch: Partial<SyncBaseRecord> = {}): SyncBaseRecord => ({
  syncId: 'x',
  updatedAt: 100,
  deletedAt: null,
  lastModifiedDeviceId: 'device-a',
  ...patch,
});

describe('sync protocol', () => {
  it('uses last-write-wins by updatedAt', () => {
    expect(isIncomingNewer(base({ updatedAt: 101 }), base())).toBe(true);
    expect(isIncomingNewer(base({ updatedAt: 99 }), base())).toBe(false);
  });

  it('breaks equal-time ties by device id', () => {
    expect(
      isIncomingNewer(
        base({ lastModifiedDeviceId: 'device-z' }),
        base({ lastModifiedDeviceId: 'device-a' }),
      ),
    ).toBe(true);
    expect(
      isIncomingNewer(
        base({ lastModifiedDeviceId: 'device-a' }),
        base({ lastModifiedDeviceId: 'device-z' }),
      ),
    ).toBe(false);
  });

  it('keeps deterministic ids stable for composite records', () => {
    expect(watchlistSyncId('movie', 42)).toBe('watchlist:movie:42');
    expect(standoutSyncId(10, 2, 7)).toBe('standout:10:2:7');
  });

  it('maps accepted ids back to the exact sent updatedAt', () => {
    expect(
      acceptedMap(
        [
          base({ syncId: 'a', updatedAt: 1 }),
          base({ syncId: 'b', updatedAt: 2 }),
        ],
        ['b', 'missing'],
      ),
    ).toEqual(new Map([['b', 2]]));
  });
});
