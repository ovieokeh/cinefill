import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Text } from './Text';

const HINT_TIMEOUT_MS = 2500;

type HintContextValue = { show: (message: string) => void };

const FilterHintContext = createContext<HintContextValue>({
  show: () => {
    // No-op when a Chip with a disabledReason is rendered outside a FilterBar.
  },
});

/**
 * Hook used by Chip (and any other interactive that wants the same surface) to
 * surface a transient "why is this disabled" message. The context is provided
 * by FilterBar; calling outside one is a silent no-op.
 */
export function useFilterHint(): HintContextValue {
  return useContext(FilterHintContext);
}

/**
 * Vertically stacks a row of filter chips above a row of sort chips. Both rows
 * scroll horizontally so long chip sets stay single-line. Any descendant Chip
 * with a disabledReason can pop a brief explanation banner via useFilterHint().
 */
export function FilterBar({
  filters,
  sort,
}: {
  filters: ReactNode;
  sort: ReactNode;
}) {
  const t = useTheme();
  const [hint, setHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHint(message);
    timerRef.current = setTimeout(() => setHint(null), HINT_TIMEOUT_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <FilterHintContext.Provider value={{ show }}>
      <View
        style={{
          borderBottomColor: t.colors.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: t.spacing.xs,
            gap: t.spacing.sm,
            alignItems: 'center',
          }}
        >
          {filters}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.xs,
            paddingBottom: t.spacing.sm,
            gap: t.spacing.sm,
            alignItems: 'center',
          }}
        >
          {sort}
        </ScrollView>
        {hint ? (
          <View
            style={{
              paddingHorizontal: t.spacing.lg,
              paddingBottom: t.spacing.sm,
            }}
          >
            <View
              style={[
                styles.hint,
                {
                  backgroundColor: t.colors.bg.elevated,
                  borderRadius: t.radii.md,
                  paddingHorizontal: t.spacing.md,
                  paddingVertical: t.spacing.xs,
                  gap: t.spacing.xs,
                  borderColor: t.colors.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={t.spacing.lg}
                color={t.colors.text.muted}
              />
              <Text variant="caption" tone="secondary" style={styles.flex1}>
                {hint}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </FilterHintContext.Provider>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  flex1: { flex: 1 },
});
