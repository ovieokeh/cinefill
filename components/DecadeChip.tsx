import { useRef } from 'react';

import { Chip } from './Chip';
import { ActionSheet, type ActionItem, type ActionSheetHandle } from './ActionSheet';

/**
 * Decade picker / clear chip. Three modes:
 *
 * - `decades` is non-empty → tap opens an ActionSheet to pick a decade or clear.
 *   The chip stays visible even when no decade is selected ("Any decade").
 * - `disabled` is set → chip renders disabled and a tap surfaces `disabledReason`
 *   via the FilterBar's hint banner (Diary/Watchlist when there are no years
 *   in the library yet).
 * - Otherwise (no decades, no disabled flag) → chip only renders when a value
 *   is already set; the trailing close button is the only interaction. Used
 *   by Search where the decade arrives via TasteCard navigation.
 */
export function DecadeChip({
  value,
  onChange,
  decades = [],
  disabled,
  disabledReason,
  placeholder = 'Any decade',
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  decades?: number[];
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
}) {
  const sheetRef = useRef<ActionSheetHandle>(null);
  const pickerMode = decades.length > 0;

  // Search's clear-only mode: nothing to pick and nothing set — render nothing.
  if (!pickerMode && value == null && !disabled) return null;

  function openPicker() {
    if (!pickerMode) return;
    const actions: ActionItem[] = [
      { label: placeholder, onPress: () => onChange(null) },
      ...decades.map((d) => ({ label: `${d}s`, onPress: () => onChange(d) })),
    ];
    sheetRef.current?.present(actions);
  }

  const label = value != null ? `${value}s` : placeholder;
  const canPick = pickerMode && !disabled;

  return (
    <>
      <Chip
        label={label}
        active={value != null}
        disabled={!!disabled}
        disabledReason={disabledReason}
        onPress={canPick ? openPicker : undefined}
        onClear={value != null && !disabled ? () => onChange(null) : undefined}
        accessibilityLabel={value != null ? `Decade: ${label}` : 'Select decade'}
      />
      <ActionSheet ref={sheetRef} />
    </>
  );
}
