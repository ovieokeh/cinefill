import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/tokens';
import { backdropUrl } from '@/lib/tmdb';
import { getReviewImageMeta } from '@/lib/review-fixtures';
import { PosterImage } from './PosterImage';
import { Skeleton, SkeletonPoster, SkeletonText } from './Skeleton';
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
}: Props) {
  const t = useTheme();
  const backdrop = backdropUrl(backdropPath, 'w1280');
  const reviewBackdrop = getReviewImageMeta(backdropPath);
  const textMetaPieces = [year, formatRuntime(runtime)].filter(
    (x): x is string => !!x,
  );

  // Fallback shared value when scrollY isn't provided (component still usable in isolation)
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

  return (
    <View>
      <View style={[styles.backdropFrame, { backgroundColor: t.colors.bg.surface }]}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
          {reviewBackdrop ? (
            <View style={[styles.reviewBackdrop, { backgroundColor: reviewBackdrop.bg }]}>
              <View
                style={[
                  styles.reviewBackdropAccent,
                  { backgroundColor: reviewBackdrop.accent },
                ]}
              />
              <Text
                variant="label"
                style={[
                  styles.reviewBackdropEyebrow,
                  { color: reviewBackdrop.accent },
                ]}
              >
                CINEFILL DEMO
              </Text>
              <Text
                variant="displayMd"
                style={[styles.reviewBackdropTitle, { color: reviewBackdrop.fg }]}
                numberOfLines={2}
              >
                {reviewBackdrop.title}
              </Text>
            </View>
          ) : backdrop ? (
            <Image
              source={{ uri: backdrop }}
              style={styles.backdropImage}
              contentFit="cover"
              transition={t.durations.base}
            />
          ) : null}
        </Animated.View>
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

export function BackdropPosterHeaderSkeleton() {
  const t = useTheme();
  return (
    <View>
      <View style={styles.backdropFrame}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
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
        <SkeletonPoster size="lg" />
        <View style={[styles.meta, { marginLeft: t.spacing.md, paddingTop: t.spacing.xxxl }]}>
          <SkeletonText variant="displayMd" width="80%" />
          <View style={{ marginTop: t.spacing.xs }}>
            <SkeletonText variant="caption" width="55%" />
          </View>
          <View style={{ marginTop: t.spacing.xxs }}>
            <SkeletonText variant="caption" width="40%" />
          </View>
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
  reviewBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: spacing.xl,
  },
  reviewBackdropAccent: {
    position: 'absolute',
    bottom: -80,
    right: -60,
    width: '58%',
    height: '72%',
    opacity: 0.6,
    transform: [{ rotate: '-10deg' }],
  },
  reviewBackdropEyebrow: {
    textTransform: 'uppercase',
  },
  reviewBackdropTitle: {
    maxWidth: '64%',
    textTransform: 'uppercase',
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
