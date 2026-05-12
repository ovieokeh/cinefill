import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import 'react-native-reanimated';

import { ThemeProvider, tokens } from '@/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.colors.bg.app }}>
      <KeyboardProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: tokens.colors.bg.app },
                headerTitleStyle: {
                  color: tokens.colors.text.primary,
                  fontSize: tokens.typography.titleMd.fontSize,
                  fontWeight: tokens.typography.titleMd.fontWeight,
                },
                headerTintColor: tokens.colors.accent.base,
                contentStyle: { backgroundColor: tokens.colors.bg.app },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="search"
                options={{ presentation: 'modal', title: 'Search films' }}
              />
              <Stack.Screen
                name="new-entry"
                options={{
                  presentation: 'modal',
                  title: 'Log a watch',
                }}
              />
              <Stack.Screen
                name="movie/[tmdbId]"
                options={{ title: '', headerBackTitle: 'Back' }}
              />
              <Stack.Screen
                name="tv/[id]"
                options={{ title: '', headerBackTitle: 'Back' }}
              />
              <Stack.Screen
                name="tv/[id]/season/[n]"
                options={{ title: '', headerBackTitle: 'Back' }}
              />
              <Stack.Screen
                name="person/[id]"
                options={{ title: '', headerBackTitle: 'Back' }}
              />
              <Stack.Screen
                name="edit-entry/[id]"
                options={{ presentation: 'modal', title: 'Edit entry' }}
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
