import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'cinefill',
  slug: 'cinefill',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'cinefill',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "com.nerdylegs.cinefill",
    supportsTablet: true,
    config: {
      // ITSAppUsesNonExemptEncryption = false: cinefill only uses standard
      // exempt encryption (HTTPS, OS-level keystore). Declares once so App
      // Store Connect skips the export-compliance prompt on every upload.
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.nerdylegs.cinefill",
    adaptiveIcon: {
      backgroundColor: '#0F1216',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 240,
        resizeMode: 'contain',
        backgroundColor: '#0F1216',
        dark: { backgroundColor: '#0F1216' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    tmdbReadToken: process.env.TMDB_API_READ_ACCESS_TOKEN,
    tmdbApiKey: process.env.TMDB_API_KEY,
    eas: {
      "projectId": "ac6c7d5c-d2f2-45e2-ab34-2e826acd128d"
    }
  },
});
