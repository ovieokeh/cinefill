import { Platform, TextStyle } from 'react-native';

export const colors = {
  bg: {
    app: '#0F1216',
    surface: '#171B21',
    elevated: '#1E232B',
    input: '#1A1F26',
  },
  text: {
    primary: '#ECEDEE',
    secondary: '#B8BEC7',
    muted: '#7C848F',
    inverted: '#0F1216',
  },
  border: {
    subtle: '#252B33',
    strong: '#3A424D',
  },
  accent: {
    base: '#E0B354',
    pressed: '#C99C42',
    on: '#0F1216',
  },
  star: '#FFB400',
  danger: '#E0654D',
  rating: {
    mild: '#5DBB63',         // G, PG, U
    cautionary: '#E8A33D',   // PG-13, 12, 12A
    restricted: '#D8493B',   // R, 15
    adult: '#A0291C',        // NC-17, 18
    unknown: '#3A424D',      // anything else
  },
  overlay: 'rgba(0,0,0,0.55)',
  transparent: 'transparent',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
}) as string;

export const typography: Record<
  'displayLg' | 'displayMd' | 'titleLg' | 'titleMd' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'mono',
  TextStyle
> = {
  displayLg: { fontFamily: fontFamilyMedium, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  displayMd: { fontFamily: fontFamilyMedium, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  titleLg: { fontFamily: fontFamilyMedium, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  titleMd: { fontFamily: fontFamilyMedium, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontFamily: fontFamilyMedium, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, lineHeight: 18 },
};

export const shadows = {
  none: {},
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export const durations = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const tracking = {
  normal: 0,
  label: 1,      // uppercase section/eyebrow labels
  badge: 0.5,    // tight-tracked badges
} as const;

export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  overlay: 0.55,
} as const;

export const tokens = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  durations,
  opacity,
  tracking,
} as const;

export type Tokens = typeof tokens;
