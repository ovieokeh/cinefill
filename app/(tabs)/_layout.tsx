import { View, Pressable, Platform, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens, useTheme } from '@/theme';

const TAB_BAR_BASE_HEIGHT = Platform.OS === 'ios' ? 49 : 56;
const FAB_SIZE = 56;
const FAB_ICON_SIZE = 28;

export default function TabLayout() {
  return (
    <View style={styles.flex}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tokens.colors.accent.base,
          tabBarInactiveTintColor: tokens.colors.text.muted,
          tabBarStyle: {
            backgroundColor: tokens.colors.bg.surface,
            borderTopColor: tokens.colors.border.subtle,
          },
          headerStyle: { backgroundColor: tokens.colors.bg.app },
          headerTitleStyle: {
            color: tokens.colors.text.primary,
            fontSize: tokens.typography.titleMd.fontSize,
            fontWeight: tokens.typography.titleMd.fontWeight,
          },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Diary',
            tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="watchlist"
          options={{
            title: 'Watchlist',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <SearchFab />
    </View>
  );
}

function SearchFab() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottom = TAB_BAR_BASE_HEIGHT + insets.bottom + t.spacing.xl;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search films"
      onPress={() => router.push('/search')}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: fabBottom,
          right: t.spacing.xl,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: t.radii.pill,
          backgroundColor: pressed ? t.colors.accent.pressed : t.colors.accent.base,
          ...t.shadows.card,
        },
      ]}
    >
      <Ionicons name="search" size={FAB_ICON_SIZE} color={t.colors.accent.on} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
