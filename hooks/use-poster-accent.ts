import { useEffect, useState } from 'react';
import { posterUrl } from '@/lib/tmdb';
import { extractAccent } from '@/lib/poster-accent';
import { tokens } from '@/theme';

/**
 * Returns a UI-accent color derived from the poster image at the given TMDB
 * posterPath. While the extraction is in flight (and as a permanent fallback
 * for null posters or extraction failures), this returns the design-system
 * accent so callers can use the result unconditionally.
 */
export function usePosterAccent(posterPath: string | null | undefined): string {
  const [color, setColor] = useState<string>(tokens.colors.accent.base);

  useEffect(() => {
    let cancelled = false;
    if (!posterPath) {
      setColor(tokens.colors.accent.base);
      return () => {
        cancelled = true;
      };
    }
    const url = posterUrl(posterPath, 'w154') ?? posterUrl(posterPath, 'w342');
    if (!url) {
      setColor(tokens.colors.accent.base);
      return () => {
        cancelled = true;
      };
    }
    extractAccent(url).then((c) => {
      if (!cancelled) setColor(c);
    });
    return () => {
      cancelled = true;
    };
  }, [posterPath]);

  return color;
}
