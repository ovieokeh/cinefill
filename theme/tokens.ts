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
  tmdb: {
    green: '#90cea1',
    blue: '#3cbec9',
    cyan: '#00b3e5',
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
  shimmer: {
    highlight: '#FFFFFF14',
    highlightTransparent: '#FFFFFF00',
  },
  chart: {
    // Donut-slice / legend-swatch palette. Ordered from accent-anchored warm to
    // muted-neutral cool so the dominant slice always reads as the brand colour.
    series: [
      '#E0B354', // accent.base
      '#D49E47',
      '#C99C42', // accent.pressed
      '#B58836',
      '#9C7129',
      '#7C5A24',
      '#5D636C',
      '#3A424D',
    ],
  },
  reviewImage: {
    lanterns: { bg: '#19324A', fg: '#F3E7D3', accent: '#E9B949' },
    cedar: { bg: '#1D3B34', fg: '#F1F7EC', accent: '#8CCB7E' },
    vellum: { bg: '#523047', fg: '#F8EBDD', accent: '#D79AAF' },
    rain: { bg: '#23304F', fg: '#F1F4FF', accent: '#7AA4F6' },
    blueHour: { bg: '#27364A', fg: '#F9F1D4', accent: '#F0C35B' },
    paperSun: { bg: '#5A3742', fg: '#FFF0E8', accent: '#F2A65A' },
    harborNine: { bg: '#123845', fg: '#EAF8F8', accent: '#5CC2BA' },
    quietSignal: { bg: '#2F2949', fg: '#F2EEFF', accent: '#A58AF0' },
    juniperTrace: { bg: '#2E4632', fg: '#F2F7E8', accent: '#A6CF72' },
  },
  // TMDB genre IDs → curated dark-bg-friendly accent colour. Movie and TV
  // catalogues are unioned: ids that exist in both (e.g. Drama 18) only appear
  // once; TV-only ids (10759, 10762, ...) are listed below the movie set.
  // Unknown ids fall back to `genreFallback`.
  //
  // Each colour is tuned to clear WCAG AA (≥4.5:1) for caption-size text on
  // bg.elevated (#1E232B), the lightest of the three dark surfaces. Several
  // moodier hues had to be lifted out of their original "blood / rust / deep
  // grey" zone to pass — the trade-off is identity vs readability on the
  // darkest text-on-card cases (WatchlistRow, genre chips in detail pages).
  genre: {
    28: '#DE6559',     // Action            (was #D8493B — 3.71:1 on bg.elevated)
    12: '#E08E47',     // Adventure
    16: '#5DBED1',     // Animation
    35: '#E0B354',     // Comedy
    80: '#838A9C',     // Crime             (was #6C7280)
    99: '#7A8FA8',     // Documentary
    18: '#BF7686',     // Drama             (was #B25A6E)
    10751: '#88C97A',  // Family
    14: '#A57ACC',     // Fantasy           (was #A073C9)
    36: '#B58836',     // History
    27: '#D76A63',     // Horror            (was #8C2A24 — 1.86:1, worst case)
    10402: '#E8729F',  // Music
    9648: '#7E89C6',   // Mystery           (was #5E6CB8)
    10749: '#E8889B',  // Romance
    878: '#4D9CC8',    // Science Fiction
    10770: '#7F8B9B',  // TV Movie          (was #5D636C)
    53: '#B78240',     // Thriller          (was #A07238)
    10752: '#859159',  // War               (was #6B7548)
    37: '#C39657',     // Western
    10759: '#DE6559',  // TV: Action & Adventure  (was #D8493B)
    10762: '#88C5D8',  // TV: Kids
    10763: '#7A8FA8',  // TV: News
    10764: '#E08E47',  // TV: Reality
    10765: '#7587CC',  // TV: Sci-Fi & Fantasy   (was #6A7DC8)
    10766: '#E8729F',  // TV: Soap
    10767: '#838A9C',  // TV: Talk          (was #6C7280)
    10768: '#859159',  // TV: War & Politics  (was #6B7548)
  } as Record<number, string>,
  genreFallback: '#9CA3AF',
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

// Font family names match the @expo-google-fonts imports registered in app/_layout.tsx
// via useFonts(). Adding a new weight: install the per-family subpackage, register the
// weight import in app/_layout.tsx, then reference its name here.
const fontDisplayBold = 'Fraunces_700Bold';
const fontDisplayBoldItalic = 'Fraunces_700Bold_Italic';
const fontDisplaySemi = 'Fraunces_600SemiBold';
const fontBody = 'Inter_400Regular';
const fontBodySemi = 'Inter_600SemiBold';

export const typography: Record<
  | 'displayLg'
  | 'displayMd'
  | 'displayItalicLg'
  | 'titleLg'
  | 'titleMd'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'mono',
  TextStyle
> = {
  displayLg: { fontFamily: fontDisplayBold, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  displayMd: { fontFamily: fontDisplayBold, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  displayItalicLg: {
    fontFamily: fontDisplayBoldItalic,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  titleLg: { fontFamily: fontDisplaySemi, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  titleMd: { fontFamily: fontDisplaySemi, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: fontBody, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontFamily: fontBodySemi, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontFamily: fontBodySemi, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontFamily: fontBody, fontSize: 12, lineHeight: 16, fontWeight: '400' },
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
