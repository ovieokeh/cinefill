import { Pressable, View, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { backdropUrl } from '@/lib/tmdb';

type Props = {
  youtubeKey: string;
  backdropPath: string | null;
};

const PLAY_ICON_SIZE = 64;

export function TrailerCard({ youtubeKey, backdropPath }: Props) {
  const t = useTheme();
  const url = backdropUrl(backdropPath, 'w780');

  async function onPress() {
    const target = `https://youtube.com/watch?v=${youtubeKey}`;
    try {
      await Linking.openURL(target);
    } catch {
      // silent — nothing to surface
    }
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Play trailer"
      style={({ pressed }) => [
        styles.frame,
        {
          marginHorizontal: t.spacing.lg,
          borderRadius: t.radii.md,
          backgroundColor: t.colors.bg.elevated,
          opacity: pressed ? t.opacity.pressed : 1,
        },
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          contentFit="cover"
          transition={t.durations.base}
        />
      ) : null}
      <View style={[styles.scrim, { backgroundColor: t.colors.overlay }]} />
      <View style={styles.playWrap}>
        <Ionicons name="play-circle" size={PLAY_ICON_SIZE} color={t.colors.text.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 'auto',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
