import { Image, type ImageStyle } from 'expo-image';
import { type StyleProp } from 'react-native';

const WORDMARK_ASPECT = 945 / 207;

/**
 * The cinefill wordmark rendered against the app's dark surfaces. Source is
 * the dark wordmark PNG with all dark pixels recolored to `text.primary` so
 * it sits cleanly on `bg.app` / `bg.surface` / `bg.elevated`; the gold "i"
 * dots are preserved.
 */
export function Wordmark({
  width = 96,
  style,
}: {
  /** Display width in dp; height is derived from the wordmark's aspect ratio. */
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={require('@/assets/images/wordmark-light.png')}
      style={[{ width, height: width / WORDMARK_ASPECT }, style]}
      contentFit="contain"
      accessibilityLabel="cinefill"
    />
  );
}
