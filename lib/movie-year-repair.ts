import { fillMissingMovieYear, listEntries } from '@/db/diary';
import {
  fillMissingWatchlistMovieYear,
  listWatchlist,
} from '@/db/watchlist';
import { getMovieDetails } from '@/lib/tmdb';

export async function repairMissingMovieYears(): Promise<number> {
  const [entries, watchlist] = await Promise.all([listEntries(), listWatchlist()]);
  const tmdbIds = new Set<number>();

  for (const entry of entries) {
    if (entry.mediaType === 'movie' && !entry.year) tmdbIds.add(entry.tmdbId);
  }
  for (const item of watchlist) {
    if (item.mediaType === 'movie' && !item.year) tmdbIds.add(item.tmdbId);
  }

  let repaired = 0;
  for (const tmdbId of tmdbIds) {
    try {
      const details = await getMovieDetails(tmdbId);
      if (!details.year) continue;
      const [diaryChanges, watchlistChanges] = await Promise.all([
        fillMissingMovieYear(tmdbId, details.year),
        fillMissingWatchlistMovieYear(tmdbId, details.year),
      ]);
      repaired += diaryChanges + watchlistChanges;
    } catch (error) {
      console.warn(`movie year repair failed for TMDB ${tmdbId}`, error);
    }
  }

  return repaired;
}
