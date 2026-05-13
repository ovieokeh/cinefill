import { useRef, type ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';
import { CinefillMark } from './CinefillMark';
import { LiveDot } from './LiveDot';
import { PositionScale } from './PositionScale';
import { BarFill } from './BarFill';
import { StarRow } from './StarRow';
import { TasteMetricSheet, type TasteMetricSheetHandle } from './TasteMetricSheet';
import {
  PRIMARY_GENRE_FOR_CLUSTER,
  type TasteProfile,
  type MoodCluster,
} from '@/lib/taste';

// ---------- copy ----------
// Headline noun + a personality blurb for each mood cluster. The blurb is
// meant to feel like a magazine sub-line — short, opinionated, screenshot-ready.

const CLUSTER_NOUN: Record<MoodCluster, string> = {
  storyDriven: 'Story-driven viewer',
  intense: 'Intensity-seeker',
  feelGood: 'Feel-good viewer',
  escapist: 'Escapist',
  cerebral: 'Cerebral viewer',
};

const CLUSTER_BLURB: Record<MoodCluster, string> = {
  storyDriven: 'Sees the wide shot. Sits through the credits.',
  intense: 'Reads the menace. Loves when the lights stay off.',
  feelGood: 'In for the laughs. Stays for the encore.',
  escapist: 'Goes long. Rewatches without flinching.',
  cerebral: 'Holds onto the questions. Argues after.',
};

// ---------- value helpers ----------

function headlineLeadParts(
  profile: TasteProfile,
  hasEra: boolean,
): { body: string; punct: string } {
  const noun = profile.genreLead.cluster
    ? CLUSTER_NOUN[profile.genreLead.cluster]
    : 'Your taste is taking shape';
  return { body: noun, punct: hasEra ? ',' : '.' };
}

function headlineEraParts(profile: TasteProfile): { body: string; punct: string } | null {
  const d = profile.era.modalDecade;
  return d != null ? { body: `${d}s-leaning`, punct: '.' } : null;
}

// Ordinal ratios for the slider-style PositionScale glyph.
// Returns null when the value is unknown so the glyph can hide its dot.
function decadeRatio(decade: number | null): number | null {
  if (decade == null) return null;
  // 5 buckets ending at 2010s+. Anything older lands on the leftmost stop.
  if (decade <= 1970) return 0;
  if (decade <= 1980) return 0.25;
  if (decade <= 1990) return 0.5;
  if (decade <= 2000) return 0.75;
  return 1;
}

function runtimeRatio(meanMinutes: number | null): number {
  if (meanMinutes == null) return 0;
  // Map 60–180min → 0–1 for the bar fill.
  return Math.max(0, Math.min(1, (meanMinutes - 60) / 120));
}

function recencyRatio(lag: number | null): number | null {
  if (lag == null) return null;
  // Left = chases the new; right = deep catalog.
  if (lag <= 1) return 0;
  if (lag <= 5) return 0.34;
  if (lag <= 15) return 0.67;
  return 1;
}

function reachRatio(bucket: TasteProfile['popularity']['bucket']): number | null {
  switch (bucket) {
    case 'cult':
      return 0;
    case 'balanced':
      return 0.5;
    case 'mainstream':
      return 1;
    default:
      return null;
  }
}

function formatRecencyValue(lag: number | null): string {
  if (lag == null) return '—';
  if (lag === 0) return 'now';
  const n = Math.round(lag);
  return `${n}y`;
}

function formatReachValue(bucket: TasteProfile['popularity']['bucket']): string {
  switch (bucket) {
    case 'cult':
      return 'Indie';
    case 'balanced':
      return 'Mixed';
    case 'mainstream':
      return 'Wide';
    default:
      return '—';
  }
}

// ---------- TasteCard ----------

export function TasteCard({
  profile,
  filmHours,
  tvHours,
  totalMovies,
  totalSeasons,
}: {
  profile: TasteProfile;
  filmHours: number;
  tvHours: number;
  totalMovies: number;
  totalSeasons: number;
}) {
  const t = useTheme();
  const router = useRouter();
  const metricSheetRef = useRef<TasteMetricSheetHandle>(null);

  // Edge-to-edge frame; bg.surface contrasts with bg.app to feel like a printed page.
  const frame = [
    styles.frame,
    {
      backgroundColor: t.colors.bg.surface,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.xl,
    },
  ];

  if (profile.confidence === 'empty') {
    return (
      <View style={frame}>
        <View style={[styles.eyebrowRow, { gap: t.spacing.sm }]}>
          <CinefillMark size={t.spacing.lg} />
          <Text
            variant="label"
            tone="muted"
            style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
          >
            Your taste
          </Text>
        </View>
        <Text variant="displayItalicLg" style={{ marginTop: t.spacing.md }}>
          Rate a few films
          <Text tone="accent">,</Text>
          {'\n'}cinefill listens
          <Text tone="accent">.</Text>
        </Text>
        <Text variant="body" tone="muted" style={{ marginTop: t.spacing.md }}>
          Each rating sharpens a fingerprint of what you actually like — your genres, your decades,
          the runtimes you reach for, the directors you keep coming back to.
        </Text>
        <Button
          title="Find films"
          variant="ghost"
          onPress={() => router.push('/(tabs)/search')}
          style={{ marginTop: t.spacing.lg }}
        />
      </View>
    );
  }

  const eraLine = headlineEraParts(profile);
  const leadLine = headlineLeadParts(profile, eraLine != null);
  const blurb = profile.genreLead.cluster
    ? CLUSTER_BLURB[profile.genreLead.cluster]
    : null;

  const confidenceNote =
    profile.confidence === 'low'
      ? `Sharpens as you rate more — currently ${profile.ratedCount} rated.`
      : undefined;

  // ----- per-metric sheet openers -----
  // Each opens the bottom sheet for its metric. The existing search/person
  // navigation is preserved as an explicit CTA inside the sheet so the
  // destination is no longer a surprise.

  const openGenreLead = () => {
    const cluster = profile.genreLead.cluster;
    const sharePct = Math.round(profile.genreLead.share * 100);
    metricSheetRef.current?.present({
      metric: 'genreLead',
      label: 'Genre lean',
      heroValue: cluster
        ? `${CLUSTER_NOUN[cluster]}${sharePct ? ` · ${sharePct}%` : ''}`
        : 'Taking shape',
      readout: profile.genreLead.readout,
      explainer:
        'Your dominant mood cluster across rated films. Counts are weighted by your star rating; a film that fits multiple clusters splits the credit.',
      scale: { kind: 'none' },
      confidenceNote,
      cta:
        cluster != null
          ? {
              label: `Find more ${PRIMARY_GENRE_FOR_CLUSTER[cluster].name} films`,
              onPress: () => {
                const g = PRIMARY_GENRE_FOR_CLUSTER[cluster];
                router.push({
                  pathname: '/(tabs)/search',
                  params: {
                    mediaType: 'movie',
                    genreId: String(g.id),
                    genreName: g.name,
                  },
                });
              },
            }
          : undefined,
    });
  };

  const openEra = () => {
    const decade = profile.era.modalDecade;
    metricSheetRef.current?.present({
      metric: 'era',
      label: 'Era',
      heroValue: decade != null ? `${decade}s` : '—',
      readout: profile.era.readout,
      explainer:
        profile.era.spread > 1
          ? `The decade your ratings cluster around, weighted by stars. ${profile.era.spread} decades touched overall.`
          : 'The decade your ratings cluster around, weighted by stars.',
      scale: {
        kind: 'position',
        ratio: decadeRatio(decade),
        leftLabel: '1970s',
        rightLabel: '2010s+',
      },
      confidenceNote,
      cta:
        decade != null
          ? {
              label: `Find more ${decade}s films`,
              onPress: () =>
                router.push({
                  pathname: '/(tabs)/search',
                  params: { decade: String(decade) },
                }),
            }
          : undefined,
    });
  };

  const openRuntime = () => {
    const mean = profile.runtime.meanMinutes;
    const std = profile.runtime.stdMinutes;
    const spreadSentence =
      std != null && std > 25 ? ` Typical spread is ±${Math.round(std)} minutes.` : '';
    metricSheetRef.current?.present({
      metric: 'runtime',
      label: 'Runtime',
      heroValue: mean != null ? `${Math.round(mean)}m` : '—',
      readout: profile.runtime.readout,
      explainer: `Mean runtime across the films you've rated — movies only, seasons aren't counted.${spreadSentence}`,
      scale: {
        kind: 'fill',
        ratio: runtimeRatio(mean),
        leftLabel: '60 min',
        rightLabel: '180 min',
      },
      confidenceNote,
    });
  };

  const openRecency = () => {
    metricSheetRef.current?.present({
      metric: 'recency',
      label: 'Recency',
      heroValue: formatRecencyValue(profile.recencyVelocity.medianLagYears),
      readout: profile.recencyVelocity.readout,
      explainer:
        "Median gap between a film's release year and the year you watched it. Low = chasing new releases; high = digging through the catalog.",
      scale: {
        kind: 'position',
        ratio: recencyRatio(profile.recencyVelocity.medianLagYears),
        leftLabel: 'Now',
        rightLabel: 'Deep catalog',
      },
      confidenceNote,
    });
  };

  const openReach = () => {
    metricSheetRef.current?.present({
      metric: 'reach',
      label: 'Reach',
      heroValue: formatReachValue(profile.popularity.bucket),
      readout: profile.popularity.readout,
      explainer:
        'Median TMDB popularity across your rated films. Indie ≈ festival-circuit, Mixed = a bit of both, Wide ≈ wide-release crowd-pleasers.',
      scale: {
        kind: 'position',
        ratio: reachRatio(profile.popularity.bucket),
        leftLabel: 'Indie',
        rightLabel: 'Wide',
      },
      confidenceNote,
    });
  };

  const openLoyalty = () => {
    const director = profile.loyalty.topDirector;
    const share = profile.loyalty.topShare;
    const sharePct = Math.round(share * 100);
    // Concrete "X of what" answer — share is *of your rated films with a known director*.
    const explainer = director
      ? `Share of your rated films directed by your most-recurring filmmaker. So ${sharePct}% means about 1 in every ${Math.max(2, Math.round(1 / Math.max(share, 0.01)))} of your rated films is theirs.`
      : 'Share of your rated films directed by your most-recurring filmmaker. As you rate more, a favourite director may emerge.';
    metricSheetRef.current?.present({
      metric: 'loyalty',
      label: 'Loyalty',
      heroValue: director ? `${sharePct}%` : '—',
      readout: profile.loyalty.readout,
      explainer,
      scale: {
        kind: 'fill',
        ratio: share,
        leftLabel: 'Spread out',
        rightLabel: 'Single director',
      },
      confidenceNote,
      cta:
        profile.loyalty.topDirectorId != null && director
          ? {
              label: `See ${director}`,
              onPress: () => router.push(`/person/${profile.loyalty.topDirectorId}`),
            }
          : undefined,
    });
  };

  const openStyle = () => {
    metricSheetRef.current?.present({
      metric: 'style',
      label: 'Style',
      heroValue:
        profile.ratingStyle.median > 0 ? profile.ratingStyle.median.toFixed(1) : '—',
      readout: profile.ratingStyle.readout,
      explainer:
        'Median of your star ratings. The spread shows whether your ratings cluster tight or split between strong loves and skips.',
      scale: { kind: 'stars', median: profile.ratingStyle.median },
      confidenceNote,
    });
  };

  return (
    <View style={frame}>
      {/* Top eyebrow row: brand mark + section name + rule + live meta */}
      <View style={[styles.eyebrowRow, { gap: t.spacing.sm }]}>
        <CinefillMark size={t.spacing.lg} />
        <Text
          variant="label"
          tone="secondary"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          Your taste
        </Text>
        <View
          style={{
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: t.colors.border.strong,
            marginHorizontal: t.spacing.xs,
          }}
        />
        <LiveDot size={t.spacing.xs} />
        <Text
          variant="caption"
          tone="muted"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          {profile.ratedCount} rated
        </Text>
      </View>

      {/* Hero headline — the screenshotable centerpiece */}
      <Pressable
        onPress={openGenreLead}
        accessibilityRole="button"
        accessibilityLabel={`${leadLine.body}${leadLine.punct} ${eraLine ? eraLine.body + eraLine.punct : ''}. Tap for details.`}
        style={({ pressed }) => ({
          marginTop: t.spacing.xl,
          opacity: pressed ? t.opacity.pressed : 1,
        })}
      >
        <Text variant="displayItalicLg" tone="primary">
          {leadLine.body}
          <Text tone="accent">{leadLine.punct}</Text>
        </Text>
        {eraLine ? (
          <Text variant="displayItalicLg" tone="primary">
            {eraLine.body}
            <Text tone="accent">{eraLine.punct}</Text>
          </Text>
        ) : null}
      </Pressable>

      {/* Personality blurb — leading em-dash gives it a pull-quote feel */}
      {blurb ? (
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: t.spacing.md, fontStyle: 'italic' }}
        >
          {`— ${blurb}`}
        </Text>
      ) : null}

      {profile.confidence === 'low' ? (
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.md }}>
          Based on {profile.ratedCount} rated film
          {profile.ratedCount === 1 ? '' : 's'} — sharpens as you go.
        </Text>
      ) : null}

      {/* Decorative gold tick — the pull-quote rule */}
      <View
        style={{
          marginTop: t.spacing.xl,
          width: t.spacing.xxxl,
          height: StyleSheet.hairlineWidth,
          backgroundColor: t.colors.accent.base,
        }}
      />

      {/* 2 × 3 stat cell grid */}
      <View style={[styles.grid, { marginTop: t.spacing.lg, gap: t.spacing.sm }]}>
        <View style={[styles.gridRow, { gap: t.spacing.sm }]}>
          <TasteCell
            label="Era"
            value={profile.era.modalDecade ? `${profile.era.modalDecade}s` : '—'}
            readout={profile.era.readout}
            glyph={<PositionScale ratio={decadeRatio(profile.era.modalDecade)} />}
            onPress={openEra}
          />
          <TasteCell
            label="Runtime"
            value={
              profile.runtime.meanMinutes != null
                ? `${Math.round(profile.runtime.meanMinutes)}m`
                : '—'
            }
            readout={profile.runtime.readout}
            glyph={<BarFill ratio={runtimeRatio(profile.runtime.meanMinutes)} />}
            onPress={openRuntime}
          />
          <TasteCell
            label="Recency"
            value={formatRecencyValue(profile.recencyVelocity.medianLagYears)}
            readout={profile.recencyVelocity.readout}
            glyph={
              <PositionScale ratio={recencyRatio(profile.recencyVelocity.medianLagYears)} />
            }
            onPress={openRecency}
          />
        </View>
        <View style={[styles.gridRow, { gap: t.spacing.sm }]}>
          <TasteCell
            label="Reach"
            value={formatReachValue(profile.popularity.bucket)}
            readout={profile.popularity.readout}
            glyph={<PositionScale ratio={reachRatio(profile.popularity.bucket)} />}
            onPress={openReach}
          />
          <TasteCell
            label="Loyalty"
            value={
              profile.loyalty.topDirector
                ? `${Math.round(profile.loyalty.topShare * 100)}%`
                : '—'
            }
            readout={profile.loyalty.readout}
            glyph={<BarFill ratio={profile.loyalty.topShare} />}
            onPress={openLoyalty}
          />
          <TasteCell
            label="Style"
            value={
              profile.ratingStyle.median > 0
                ? profile.ratingStyle.median.toFixed(1)
                : '—'
            }
            readout={profile.ratingStyle.readout}
            glyph={<StarRow value={profile.ratingStyle.median} />}
            onPress={openStyle}
          />
        </View>
      </View>

      {/* Footer receipt — printed-stub vibe via mono numerals */}
      <Text
        variant="mono"
        tone="muted"
        style={{
          marginTop: t.spacing.xl,
          textTransform: 'uppercase',
          letterSpacing: t.tracking.label,
        }}
      >
        {totalMovies} films · {Math.round(filmHours)}h  ·  {totalSeasons} season
        {totalSeasons === 1 ? '' : 's'} · {Math.round(tvHours)}h
      </Text>

      <TasteMetricSheet ref={metricSheetRef} />
    </View>
  );
}

// ---------- TasteCell ----------

function TasteCell({
  label,
  value,
  readout,
  glyph,
  onPress,
}: {
  label: string;
  value: string;
  readout?: string;
  glyph?: ReactNode;
  onPress?: () => void;
}) {
  const t = useTheme();
  const inner = (
    <View
      style={[
        styles.cell,
        {
          backgroundColor: t.colors.bg.elevated,
          padding: t.spacing.md,
          borderRadius: t.radii.md,
          gap: t.spacing.xs,
        },
      ]}
    >
      <Text
        variant="caption"
        tone="muted"
        style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
      >
        {label}
      </Text>
      <Text variant="titleLg" numberOfLines={1}>
        {value}
      </Text>
      {glyph ? (
        <View style={{ marginTop: t.spacing.xxs, height: t.spacing.md }}>{glyph}</View>
      ) : null}
      {readout ? (
        <Text
          variant="caption"
          tone="secondary"
          numberOfLines={2}
          style={{ marginTop: t.spacing.xxs }}
        >
          {readout}
        </Text>
      ) : null}
      {/* Tap-to-expand affordance — subtle chevron tucked in the top-right. */}
      {onPress ? (
        <View style={{ position: 'absolute', top: t.spacing.sm, right: t.spacing.sm }}>
          <Ionicons name="chevron-up" size={t.spacing.md} color={t.colors.text.muted} />
        </View>
      ) : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens metric details"
      accessibilityLabel={`${label}: ${readout ?? value}`}
      style={({ pressed }) => [
        styles.pressableCell,
        { opacity: pressed ? t.opacity.pressed : 1 },
      ]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {},
  eyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'column' },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0 },
  pressableCell: { flex: 1 },
});
