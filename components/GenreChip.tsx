import { useEffect, useMemo, useRef, useState } from 'react';

import { Chip } from './Chip';
import { ActionSheet, type ActionItem, type ActionSheetHandle } from './ActionSheet';
import { getGenres, type GenreRef } from '@/lib/tmdb';

/**
 * Genre picker chip. Loads the TMDB genre catalogue for the given media type,
 * opens an ActionSheet on press, and reports the selected id up via onChange.
 *
 * Pass `mediaType: null` to keep the chip mounted but inert (no fetch); pair
 * with `disabled` + `disabledReason` so the FilterBar can explain why.
 */
export function GenreChip({
  mediaType,
  value,
  onChange,
  disabled,
  disabledReason,
  placeholder = 'Any genre',
}: {
  mediaType: 'movie' | 'tv' | null;
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
}) {
  const sheetRef = useRef<ActionSheetHandle>(null);
  const [genres, setGenres] = useState<GenreRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mediaType == null) {
      setGenres([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setGenres([]);
    (async () => {
      try {
        const list = await getGenres(mediaType);
        if (!cancelled) setGenres(list);
      } catch {
        // Silent: chip just won't open anything until reload.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaType]);

  const resolvedName = useMemo(() => {
    if (value == null) return null;
    return genres.find((g) => g.id === value)?.name ?? null;
  }, [genres, value]);

  function openPicker() {
    if (genres.length === 0) return;
    const actions: ActionItem[] = [
      { label: placeholder, onPress: () => onChange(null) },
      ...genres.map((g) => ({ label: g.name, onPress: () => onChange(g.id) })),
    ];
    sheetRef.current?.present(actions);
  }

  const externallyDisabled = !!disabled || mediaType == null;
  const catalogueReady = genres.length > 0;
  // External disabled wins for the hint; "still loading" is silent.
  const chipDisabled = externallyDisabled || (!loading && !catalogueReady);
  const reason = externallyDisabled ? disabledReason : undefined;

  const label = value != null ? (resolvedName ?? placeholder) : placeholder;

  return (
    <>
      <Chip
        label={label}
        active={value != null}
        loading={loading && value == null}
        disabled={chipDisabled}
        disabledReason={reason}
        onPress={catalogueReady && !externallyDisabled ? openPicker : undefined}
        onClear={value != null && !externallyDisabled ? () => onChange(null) : undefined}
        accessibilityLabel={resolvedName ? `Genre: ${resolvedName}` : 'Select genre'}
      />
      <ActionSheet ref={sheetRef} />
    </>
  );
}
