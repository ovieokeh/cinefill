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
import { listEntries } from '@/db/diary';
import { listWatchlist } from '@/db/watchlist';

type FilmFlags = {
  watched: { movie: Set<number>; tv: Set<number> };
  watchlist: { movie: Set<number>; tv: Set<number> };
};

const EMPTY_FLAGS: FilmFlags = {
  watched: { movie: new Set(), tv: new Set() },
  watchlist: { movie: new Set(), tv: new Set() },
};

type FilmContextValue = FilmFlags & {
  refresh: () => Promise<void>;
};

const FilmContext = createContext<FilmContextValue>({
  ...EMPTY_FLAGS,
  refresh: async () => {},
});

async function loadFlags(): Promise<FilmFlags> {
  const entries = await listEntries();
  const watchlist = await listWatchlist();
  const flags: FilmFlags = {
    watched: { movie: new Set(), tv: new Set() },
    watchlist: { movie: new Set(), tv: new Set() },
  };
  for (const e of entries) {
    if (e.mediaType === 'movie') flags.watched.movie.add(e.tmdbId);
    else if (e.mediaType === 'tv_season') flags.watched.tv.add(e.tmdbId);
  }
  for (const w of watchlist) {
    if (w.mediaType === 'movie') flags.watchlist.movie.add(w.tmdbId);
    else if (w.mediaType === 'tv') flags.watchlist.tv.add(w.tmdbId);
  }
  return flags;
}

export function FilmContextProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FilmFlags>(EMPTY_FLAGS);
  // Coalesce rapid refresh() calls (e.g. bulk-import committing).
  const inflightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;
    const p = (async () => {
      try {
        const next = await loadFlags();
        setFlags(next);
      } catch (err) {
        console.warn('film-context refresh failed', err);
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<FilmContextValue>(
    () => ({ ...flags, refresh }),
    [flags, refresh],
  );

  return <FilmContext.Provider value={value}>{children}</FilmContext.Provider>;
}

export function useFilmContext(): FilmContextValue {
  return useContext(FilmContext);
}

export type FilmBadgeKind = 'watched' | 'watching' | 'watchlist' | null;

export function useFilmBadge(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
): FilmBadgeKind {
  const ctx = useContext(FilmContext);
  if (mediaType === 'movie') {
    if (ctx.watched.movie.has(tmdbId)) return 'watched';
    if (ctx.watchlist.movie.has(tmdbId)) return 'watchlist';
    return null;
  }
  if (ctx.watched.tv.has(tmdbId)) return 'watching';
  if (ctx.watchlist.tv.has(tmdbId)) return 'watchlist';
  return null;
}
