import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Text';
import { TmdbLogo } from '@/components/TmdbLogo';
import { Wordmark } from '@/components/Wordmark';
import { useTheme } from '@/theme';

const TMDB_URL = 'https://www.themoviedb.org';

export default function CreditsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg.app }}
      contentContainerStyle={{
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.xl,
        paddingBottom: insets.bottom + t.spacing.xxxl,
      }}
    >
      <View style={styles.header}>
        <Wordmark width={144} />
        <Text variant="displayMd" style={{ marginTop: t.spacing.xl }}>
          Credits
        </Text>
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: t.spacing.sm, textAlign: 'center' }}
        >
          cinefill uses trusted film and TV metadata so your diary can stay
          focused on what you watched.
        </Text>
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: t.colors.bg.elevated,
            borderColor: t.colors.border.subtle,
            borderRadius: t.radii.md,
            marginTop: t.spacing.xxl,
            padding: t.spacing.lg,
          },
        ]}
      >
        <TmdbLogo width={128} height={17} />
        <Text variant="titleMd" style={{ marginTop: t.spacing.lg }}>
          The Movie Database
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: t.spacing.sm }}>
          Movie and TV metadata, imagery, cast, crew, and discovery results are
          provided through TMDB.
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.md }}>
          This product uses TMDB and the TMDB APIs but is not endorsed,
          certified, or otherwise approved by TMDB.
        </Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open The Movie Database"
          onPress={() => Linking.openURL(TMDB_URL)}
          style={({ pressed }) => [
            styles.linkRow,
            {
              gap: t.spacing.xs,
              marginTop: t.spacing.lg,
              opacity: pressed ? t.opacity.pressed : 1,
            },
          ]}
        >
          <Text variant="label" tone="accent">
            Open themoviedb.org
          </Text>
          <Ionicons name="open-outline" size={16} color={t.colors.accent.base} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
