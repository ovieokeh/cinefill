import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tokens.colors.accent.base,
        tabBarInactiveTintColor: tokens.colors.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.colors.bg.surface,
          borderTopColor: tokens.colors.border.subtle,
        },
        // Tab screens are headerless — they reclaim the top space and own
        // their own status-bar safe-area via `<Screen edges={['top']} />`.
        // Header styling defaults are kept for any future Tabs.Screen that
        // opts back into a header with `headerShown: true`.
        headerShown: false,
        headerStyle: { backgroundColor: tokens.colors.bg.app },
        headerTitleStyle: {
          color: tokens.colors.text.primary,
          fontFamily: tokens.typography.titleMd.fontFamily,
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
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
