import { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { Screen, Text, EntryRow } from '@/components';
import { useTheme } from '@/theme';
import { listEntries, type DiaryEntry } from '@/db/diary';

type Section = { key: string; label: string; items: DiaryEntry[] };

function groupByMonth(entries: DiaryEntry[]): Section[] {
  const groups = new Map<string, Section>();
  for (const e of entries) {
    const d = parseISO(e.watchedDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: format(d, 'MMMM yyyy'), items: [] };
      groups.set(key, g);
    }
    g.items.push(e);
  }
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

type Row = { type: 'header'; key: string; label: string } | { type: 'entry'; entry: DiaryEntry };

function toRows(sections: Section[]): Row[] {
  const rows: Row[] = [];
  for (const s of sections) {
    rows.push({ type: 'header', key: s.key, label: s.label });
    for (const item of s.items) rows.push({ type: 'entry', entry: item });
  }
  return rows;
}

export default function DiaryScreen() {
  const t = useTheme();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await listEntries();
    setEntries(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const rows = entries ? toRows(groupByMonth(entries)) : [];

  return (
    <Screen padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.type === 'header' ? `h:${r.key}` : `e:${r.entry.id}`)}
        contentContainerStyle={{
          paddingBottom: t.spacing.xxxl * 2,
        }}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View
              style={{
                backgroundColor: t.colors.bg.surface,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.sm,
              }}
            >
              <Text
                variant="label"
                tone="muted"
                style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
              >
                {item.label}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                if (item.entry.mediaType === 'tv_season') {
                  router.push(`/tv/${item.entry.tmdbId}`);
                } else {
                  router.push(`/movie/${item.entry.tmdbId}`);
                }
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
              })}
            >
              <EntryRow entry={item.entry} />
            </Pressable>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.text.muted}
          />
        }
        ListEmptyComponent={
          entries == null ? null : (
            <View
              style={[
                styles.empty,
                { marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.xl },
              ]}
            >
              <Ionicons name="film-outline" size={t.spacing.xxxl} color={t.colors.text.muted} />
              <Text variant="titleLg" style={{ marginTop: t.spacing.md }}>
                No entries yet
              </Text>
              <Text variant="body" tone="muted" style={{ marginTop: t.spacing.xs, textAlign: 'center' }}>
                Log a film you watched recently.
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
  },
});
