import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { getSyncMeta, type SyncMeta } from '@/db/sync';
import { useFilmContext } from '@/lib/film-context';
import { runSync, type SyncRunResult } from './client';
import { subscribeSyncNeeded } from './events';

type SyncPhase = 'idle' | 'syncing' | 'error';

type SyncContextValue = {
  meta: SyncMeta | null;
  phase: SyncPhase;
  lastResult: SyncRunResult | null;
  reload: () => Promise<void>;
  syncNow: () => Promise<SyncRunResult | null>;
};

const SyncContext = createContext<SyncContextValue>({
  meta: null,
  phase: 'idle',
  lastResult: null,
  reload: async () => {},
  syncNow: async () => null,
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const { refresh } = useFilmContext();
  const [meta, setMeta] = useState<SyncMeta | null>(null);
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [lastResult, setLastResult] = useState<SyncRunResult | null>(null);
  const inflightRef = useRef<Promise<SyncRunResult | null> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setMeta(await getSyncMeta());
  }, []);

  const syncNow = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;
    const p = (async () => {
      setPhase('syncing');
      try {
        const result = await runSync();
        setLastResult(result);
        await refresh();
        await reload();
        setPhase('idle');
        return result;
      } catch (error) {
        console.warn('sync failed', error);
        await reload();
        setPhase('error');
        return null;
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    return p;
  }, [refresh, reload]);

  const scheduleSync = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      syncNow().catch(() => {});
    }, 500);
  }, [syncNow]);

  useEffect(() => {
    reload().catch(() => {});
    syncNow().catch(() => {});
  }, [reload, syncNow]);

  useEffect(() => subscribeSyncNeeded(scheduleSync), [scheduleSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow().catch(() => {});
    });
    return () => sub.remove();
  }, [syncNow]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({ meta, phase, lastResult, reload, syncNow }),
    [meta, phase, lastResult, reload, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
