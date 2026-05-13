import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

/**
 * Tiny cinefill silhouette — antenna + cabinet + amber side panel + control dots.
 * Distilled from the hybridmark; used as a brand glyph in eyebrows and chips.
 */
export function CinefillMark({ size }: { size?: number }) {
  const t = useTheme();
  const dim = size ?? t.spacing.lg;
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24">
      {/* Antenna — V opening upward, apex meeting the cabinet top */}
      <Path
        d="M6 2 L12 7 L18 2"
        stroke={t.colors.accent.base}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cabinet */}
      <Rect
        x={3}
        y={7}
        width={18}
        height={15}
        rx={3}
        fill={t.colors.text.primary}
      />
      {/* Amber side panel */}
      <Rect x={15} y={7} width={6} height={15} fill={t.colors.accent.base} />
      {/* Control dots */}
      <Circle cx={18} cy={11} r={1} fill={t.colors.text.inverted} />
      <Circle cx={18} cy={17} r={1} fill={t.colors.text.inverted} />
    </Svg>
  );
}
