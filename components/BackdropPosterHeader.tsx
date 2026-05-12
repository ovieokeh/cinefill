import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { backdropUrl } from '@/lib/tmdb';
import { tintTowardsDark, withAlpha } from '@/lib/poster-accent';
import { PosterImage } from './PosterImage';
import { Text } from './Text';
import { CertificationBadge } from './CertificationBadge';

type Props = {
  backdropPath: string | null;
  posterPath: string | null;
  title: string;
  year: string | null;
  runtime: number | null;
  genres: string[];
  /** Free-form attribution line, e.g. "Directed by …" or "Created by …" */
  byline: string | null;
  certification: string | null;
  scrollY?: SharedValue<number>;
  /** Optional hex accent extracted from the poster for the bottom fade. */
  accent?: string;
};

function formatRuntime(runtime: number | null): string | null {
  if (!runtime) return null;
  const h = Math.floor(runtime / 60);
  const m = runtime % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function BackdropPosterHeader({
  backdropPath,
  posterPath,
  title,
  year,
  runtime,
  genres,
  byline,
  certification,
  scrollY,
  accent,
}: Props) {
  const t = useTheme();
  const backdrop = backdropUrl(backdropPath, 'w1280');
  const textMetaPieces = [year, formatRuntime(runtime)].filter(
    (x): x is string => !!x,
  );

  const fallback = useSharedValue(0);
  const sv = scrollY ?? fallback;

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const y = sv.value;
    if (y <= 0) return { transform: [{ scale: 1 }, { translateY: 0 }] };
    const scale = 1 + y / 400;
    const translateY = y * 0.5;
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Build a gradient fading from the (transparent) backdrop through an
  // accent-tinted band into the app background. Anchored to the bottom of
  // the backdrop frame so the metadata block below sits on a clean field.
  const accentDark = accent ? tintTowardsDark(accent, 0.6) : t.colors.bg.app;
  const gradientColors: [string, string, string, string] = [
    withAlpha(t.colors.bg.app, 0),
    accent ? withAlpha(accent, 0.18) : withAlpha(t.colors.bg.app, 0.4),
    withAlpha(accentDark, 0.85),
    t.colors.bg.app,
  ];

  return (
    <View>
      <View style={[styles.backdropFrame, { backgroundColor: t.colors.bg.surface }]}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
          {backdrop ? (
            <Image
              source={{ uri: backdrop }}
              style={styles.backdropImage}
              contentFit="cover"
              transition={t.durations.base}
            />
          ) : null}
        </Animated.View>
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.55, 0.85, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <View
        style={[
          styles.row,
          {
            paddingHorizontal: t.spacing.lg,
            marginTop: -t.spacing.xxxl,
          },
        ]}
      >
        <PosterImage posterPath={posterPath} size="lg" />
        <View style={[styles.meta, { marginLeft: t.spacing.md, paddingTop: t.spacing.xxxl }]}>
          <Text variant="displayMd" numberOfLines={3}>
            {title}
          </Text>
          {textMetaPieces.length > 0 || certification ? (
            <View style={[styles.metaRow, { marginTop: t.spacing.xs, gap: t.spacing.sm }]}>
              {textMetaPieces.length > 0 ? (
                <Text variant="caption" tone="muted">
                  {textMetaPieces.join('  ·  ')}
                </Text>
              ) : null}
              <CertificationBadge certification={certification} />
            </View>
          ) : null}
          {genres.length > 0 ? (
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
              {genres.join(', ')}
            </Text>
          ) : null}
          {byline ? (
            <Text variant="caption" tone="secondary" style={{ marginTop: t.spacing.xs }}>
              {byline}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdropFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
