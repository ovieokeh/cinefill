// Extracts a usable UI-accent color from a TMDB poster image, normalising the
// cross-platform return shapes of react-native-image-colors into a single hex
// string. Falls back to the design-system accent when the extracted color
// would be too dark/desaturated to read.

import { Platform } from 'react-native';
import ImageColors from 'react-native-image-colors';
import { tokens } from '@/theme';

const DEFAULT_ACCENT = tokens.colors.accent.base;
// Accept extracted colors only inside a band where white text reads well over
// them as a button background. Outside this band we fall back to the design
// accent (which uses its own paired icon color).
const MIN_LUMINANCE = 0.18;
const MAX_LUMINANCE = 0.62;

const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

export async function extractAccent(uri: string | null | undefined): Promise<string> {
  if (!uri) return DEFAULT_ACCENT;
  const cached = cache.get(uri);
  if (cached) return cached;
  const existing = inFlight.get(uri);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const result = await ImageColors.getColors(uri, {
        fallback: DEFAULT_ACCENT,
        cache: true,
        key: uri,
      });
      const picked = pickFromResult(result);
      const final = passesLuminance(picked) ? picked : DEFAULT_ACCENT;
      cache.set(uri, final);
      return final;
    } catch {
      cache.set(uri, DEFAULT_ACCENT);
      return DEFAULT_ACCENT;
    } finally {
      inFlight.delete(uri);
    }
  })();
  inFlight.set(uri, promise);
  return promise;
}

type AnyColorsResult = Awaited<ReturnType<typeof ImageColors.getColors>>;

function pickFromResult(result: AnyColorsResult): string {
  if (result.platform === 'ios') {
    // primary is the most "interesting" color; detail is a fallback;
    // background is usually too washed out for an accent.
    return result.primary ?? result.detail ?? result.secondary ?? DEFAULT_ACCENT;
  }
  if (result.platform === 'android') {
    return (
      result.vibrant ??
      result.darkVibrant ??
      result.lightVibrant ??
      result.dominant ??
      result.muted ??
      DEFAULT_ACCENT
    );
  }
  // web fallback (we don't ship web yet, but harmless)
  return (
    ('vibrant' in result && (result as { vibrant?: string }).vibrant) ||
    ('dominant' in result && (result as { dominant?: string }).dominant) ||
    DEFAULT_ACCENT
  );
}

function passesLuminance(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Relative luminance (sRGB approx) — good enough for a contrast floor.
  const l = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return l >= MIN_LUMINANCE && l <= MAX_LUMINANCE;
}

function hexToRgb(input: string): { r: number; g: number; b: number } | null {
  // Strips '#' and handles #rgb / #rrggbb / #rrggbbaa.
  const cleaned = input.replace('#', '');
  let r: number;
  let g: number;
  let b: number;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6 || cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else {
    return null;
  }
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b };
}

// Tiny helpers consumers may want.

export function tintTowardsDark(hex: string, amount = 0.55): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const blend = (channel: number) => Math.round(channel * (1 - amount));
  return rgbToHex(blend(rgb.r), blend(rgb.g), blend(rgb.b));
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  // #RRGGBBAA — RN renders 8-digit hex natively across iOS and Android.
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}${toHex(Math.round(a * 255))}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Platform export so callers can branch on web if we ever ship it.
export const _platform = Platform.OS;
