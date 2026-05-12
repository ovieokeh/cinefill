import { useRef } from 'react';

import { Chip } from './Chip';
import { ActionSheet, type ActionItem, type ActionSheetHandle } from './ActionSheet';

export type SortOption<K extends string> = { key: K; label: string };

/**
 * Chip that displays the currently-selected sort key's label and opens an
 * ActionSheet of options on press. Each list tab supplies its own SortKey
 * union and matching options array.
 */
export function SortChip<K extends string>({
  value,
  options,
  onChange,
}: {
  value: K;
  options: SortOption<K>[];
  onChange: (next: K) => void;
}) {
  const sheetRef = useRef<ActionSheetHandle>(null);
  const current = options.find((o) => o.key === value);

  function openPicker() {
    const actions: ActionItem[] = options.map((o) => ({
      label: o.label,
      onPress: () => onChange(o.key),
    }));
    sheetRef.current?.present(actions);
  }

  return (
    <>
      <Chip
        label={current?.label ?? 'Sort'}
        iconName="swap-vertical"
        onPress={openPicker}
        accessibilityLabel={current ? `Sort by ${current.label}` : 'Sort'}
      />
      <ActionSheet ref={sheetRef} />
    </>
  );
}
