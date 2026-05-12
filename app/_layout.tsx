import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import 'react-native-reanimated';

import { ThemeProvider, tokens } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => {});
      if (fontsError) {
        console.warn('Font load failed; proceeding with system fallbacks', fontsError);
      }
    }
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

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
                  fontFamily: tokens.typography.titleMd.fontFamily,
                  fontSize: tokens.typography.titleMd.fontSize,
                  fontWeight: tokens.typography.titleMd.fontWeight,
                },
                headerTintColor: tokens.colors.accent.base,
                contentStyle: { backgroundColor: tokens.colors.bg.app },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
              <Stack.Screen
                name="import-letterboxd"
                options={{ presentation: 'modal', title: 'Import from Letterboxd' }}
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
