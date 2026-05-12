import { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useTheme, genreColor } from '@/theme';
import { Text } from './Text';
import type { GenreBucket } from '@/lib/stats';

const DONUT_SIZE = 200;
const STROKE_WIDTH = 28;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const ANIM_DURATION = 500;
const ANIM_STAGGER = 40;
const easeOutCubic = Easing.out(Easing.cubic);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedSlice({
  progress,
  totalMs,
  index,
  arcLen,
  offset,
  color,
}: {
  progress: SharedValue<number>;
  totalMs: number;
  index: number;
  arcLen: number;
  offset: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const elapsed = progress.value * totalMs;
    const localMs = Math.max(
      0,
      Math.min(ANIM_DURATION, elapsed - index * ANIM_STAGGER),
    );
    const local = easeOutCubic(localMs / ANIM_DURATION);
    const currentArc = arcLen * local;
    return {
      strokeDasharray: [currentArc, CIRC - currentArc],
      strokeDashoffset: -offset,
    };
  });
  return (
    <AnimatedCircle
      cx={DONUT_SIZE / 2}
      cy={DONUT_SIZE / 2}
      r={RADIUS}
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

export function GenreDonut({
  buckets,
  onPress,
}: {
  buckets: GenreBucket[];
  onPress: (b: GenreBucket) => void;
}) {
  const t = useTheme();
  const progress = useSharedValue(0);
  const { total, slices, totalMs } = useMemo(() => {
    const sum = buckets.reduce((s, b) => s + b.count, 0);
    let cumulative = 0;
    const computed = buckets.map((b) => {
      const fraction = sum > 0 ? b.count / sum : 0;
      const arcLen = fraction * CIRC;
      const offset = cumulative;
      cumulative += arcLen;
      return { bucket: b, arcLen, offset };
    });
    return {
      total: sum,
      slices: computed,
      totalMs: ANIM_DURATION + Math.max(0, buckets.length - 1) * ANIM_STAGGER,
    };
  }, [buckets]);

  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withTiming(1, { duration: totalMs });
    }, [progress, totalMs]),
  );

  const a11yLabel = useMemo(() => {
    if (buckets.length === 0) return 'Top genres chart, no data';
    const lead = buckets[0];
    return `Top genres chart, ${total} watches across ${buckets.length} genres, ${lead.label} leading with ${lead.count}`;
  }, [buckets, total]);

  return (
    <View>
      <View
        style={[styles.donutWrap, { marginBottom: t.spacing.lg }]}
        accessible
        accessibilityLabel={a11yLabel}
      >
        <View style={styles.donutFrame}>
          <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
            <G rotation={-90} originX={DONUT_SIZE / 2} originY={DONUT_SIZE / 2}>
              <Circle
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={RADIUS}
                stroke={t.colors.bg.elevated}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {slices.map((s, i) => (
                <AnimatedSlice
                  key={s.bucket.label}
                  progress={progress}
                  totalMs={totalMs}
                  index={i}
                  arcLen={s.arcLen}
                  offset={s.offset}
                  color={genreColor(s.bucket.dominantGenreId)}
                />
              ))}
            </G>
          </Svg>
          <View
            style={[StyleSheet.absoluteFillObject, styles.centerLabel]}
            pointerEvents="none"
          >
            <Text variant="displayMd">{total}</Text>
            <Text variant="caption" tone="muted">
              watched
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
        {slices.map((s) => (
          <Pressable
            key={`${s.bucket.dominantMediaType}-${s.bucket.dominantGenreId}-${s.bucket.label}`}
            onPress={() => onPress(s.bucket)}
            style={({ pressed }) => [
              styles.legendRow,
              { gap: t.spacing.sm, opacity: pressed ? t.opacity.pressed : 1 },
            ]}
          >
            <View
              style={{
                width: t.spacing.md,
                height: t.spacing.md,
                borderRadius: t.radii.pill,
                backgroundColor: genreColor(s.bucket.dominantGenreId),
              }}
            />
            <Text variant="caption" style={styles.legendLabel} numberOfLines={1}>
              {s.bucket.label}
            </Text>
            <Text variant="caption" tone="muted">
              {s.bucket.count}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { alignItems: 'center' },
  donutFrame: { width: DONUT_SIZE, height: DONUT_SIZE },
  centerLabel: { alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendLabel: { flex: 1, minWidth: 0 },
});
