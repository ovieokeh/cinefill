import { useCallback, useState } from 'react';
import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, ClipPath, G, Line, Path, Rect } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from './Text';
import type { MonthCount } from '@/lib/stats';

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const CHART_HEIGHT = 96;
const CHART_PADDING_TOP = 8;
const DRAW_DURATION_MS = 500;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function ActivityLineChart({ activity }: { activity: MonthCount[] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: DRAW_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    }, [progress]),
  );

  const revealProps = useAnimatedProps(() => ({
    width: Math.max(0, width * progress.value),
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const chartTotalHeight = CHART_HEIGHT + CHART_PADDING_TOP;
  let inner: React.ReactNode = null;
  if (width > 0 && activity.length > 0) {
    const counts = activity.map((a) => a.count);
    const max = Math.max(1, ...counts);
    const stepX = activity.length > 1 ? width / (activity.length - 1) : width;
    const points = activity.map((a, i) => ({
      x: i * stepX,
      y: CHART_PADDING_TOP + (1 - a.count / max) * CHART_HEIGHT,
    }));
    const linePath = catmullRomPath(points);
    const baseY = CHART_PADDING_TOP + CHART_HEIGHT;
    const last = points[points.length - 1];
    const first = points[0];
    const areaPath = `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;

    inner = (
      <Svg width={width} height={chartTotalHeight}>
        <Defs>
          <ClipPath id="activityReveal">
            <AnimatedRect
              x={0}
              y={0}
              height={chartTotalHeight}
              animatedProps={revealProps}
            />
          </ClipPath>
        </Defs>
        <Line
          x1={0}
          y1={baseY}
          x2={width}
          y2={baseY}
          stroke={t.colors.border.subtle}
          strokeWidth={StyleSheet.hairlineWidth}
        />
        <G clipPath="url(#activityReveal)">
          <Path
            d={areaPath}
            fill={t.colors.accent.base}
            fillOpacity={0.18}
          />
          <Path
            d={linePath}
            stroke={t.colors.accent.base}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    );
  }

  return (
    <View style={{ paddingHorizontal: t.spacing.lg }}>
      <View style={{ height: chartTotalHeight }} onLayout={onLayout}>
        {inner}
      </View>
      <View style={[styles.labelsRow, { marginTop: t.spacing.xxs }]}>
        {activity.map((a) => (
          <Text key={`${a.year}-${a.month}`} variant="caption" tone="muted">
            {MONTH_LETTERS[a.month]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
