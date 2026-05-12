import type { ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';
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
  feelGood: 'Follows the laughter trail. Stays for the encore.',
  escapist: 'Trades clocks for worlds. Watches twice.',
  cerebral: 'Holds onto the questions. Argues after.',
};

// ---------- value helpers ----------

function headlineLeadLine(profile: TasteProfile, hasEra: boolean): string {
  const noun = profile.genreLead.cluster
    ? CLUSTER_NOUN[profile.genreLead.cluster]
    : 'Your taste is taking shape';
  return noun + (hasEra ? ',' : '.');
}

function headlineEraLine(profile: TasteProfile): string | null {
  const d = profile.era.modalDecade;
  return d != null ? `${d}s-leaning.` : null;
}

function decadeIndex(decade: number | null): number {
  if (decade == null) return -1;
  // 5 buckets ending at 2010s+. Anything older lands on the first dot.
  if (decade <= 1970) return 0;
  if (decade <= 1980) return 1;
  if (decade <= 1990) return 2;
  if (decade <= 2000) return 3;
  return 4;
}

function runtimeRatio(meanMinutes: number | null): number {
  if (meanMinutes == null) return 0;
  // Map 60–180min → 0–1 for the bar fill.
  return Math.max(0, Math.min(1, (meanMinutes - 60) / 120));
}

function recencyIndex(lag: number | null): number {
  if (lag == null) return -1;
  if (lag <= 1) return 0;
  if (lag <= 5) return 1;
  if (lag <= 15) return 2;
  return 3;
}

function reachIndex(bucket: TasteProfile['popularity']['bucket']): number {
  switch (bucket) {
    case 'cult':
      return 0;
    case 'balanced':
      return 1;
    case 'mainstream':
      return 2;
    default:
      return -1;
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
      return 'Balanced';
    case 'mainstream':
      return 'Mainstream';
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
        <Text
          variant="label"
          tone="muted"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          Your taste
        </Text>
        <Text variant="displayMd" style={{ marginTop: t.spacing.sm }}>
          Rate a few films to start your profile
        </Text>
        <Text variant="body" tone="muted" style={{ marginTop: t.spacing.sm }}>
          Once you rate, cinefill builds a fingerprint of what you actually like — genres, eras, runtimes, more.
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

  const eraLine = headlineEraLine(profile);
  const leadLine = headlineLeadLine(profile, eraLine != null);
  const blurb = profile.genreLead.cluster
    ? CLUSTER_BLURB[profile.genreLead.cluster]
    : null;

  const genreLeadOnPress = (() => {
    const c = profile.genreLead.cluster;
    if (c == null) return undefined;
    const g = PRIMARY_GENRE_FOR_CLUSTER[c];
    return () =>
      router.push({
        pathname: '/(tabs)/search',
        params: { mediaType: 'movie', genreId: String(g.id), genreName: g.name },
      });
  })();
  const eraOnPress =
    profile.era.modalDecade != null
      ? () =>
          router.push({
            pathname: '/(tabs)/search',
            params: { decade: String(profile.era.modalDecade) },
          })
      : undefined;
  const loyaltyOnPress =
    profile.loyalty.topDirectorId != null
      ? () => router.push(`/person/${profile.loyalty.topDirectorId}`)
      : undefined;

  return (
    <View style={frame}>
      {/* Top eyebrow row: section name + rule + meta */}
      <View style={[styles.eyebrowRow, { gap: t.spacing.md }]}>
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
          }}
        />
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
        onPress={genreLeadOnPress}
        disabled={!genreLeadOnPress}
        accessibilityRole={genreLeadOnPress ? 'button' : undefined}
        accessibilityLabel={`${leadLine} ${eraLine ?? ''}`}
        style={({ pressed }) => ({
          marginTop: t.spacing.xl,
          opacity: pressed && genreLeadOnPress ? t.opacity.pressed : 1,
        })}
      >
        <Text variant="displayMd" style={{ color: t.colors.accent.base }}>
          {leadLine}
        </Text>
        {eraLine ? (
          <Text variant="displayMd" style={{ color: t.colors.accent.base }}>
            {eraLine}
          </Text>
        ) : null}
      </Pressable>

      {/* Personality blurb */}
      {blurb ? (
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: t.spacing.md, fontStyle: 'italic' }}
        >
          {blurb}
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
            glyph={<DotScale total={5} active={decadeIndex(profile.era.modalDecade)} />}
            onPress={eraOnPress}
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
          />
          <TasteCell
            label="Recency"
            value={formatRecencyValue(profile.recencyVelocity.medianLagYears)}
            readout={profile.recencyVelocity.readout}
            glyph={
              <DotScale
                total={4}
                active={recencyIndex(profile.recencyVelocity.medianLagYears)}
              />
            }
          />
        </View>
        <View style={[styles.gridRow, { gap: t.spacing.sm }]}>
          <TasteCell
            label="Reach"
            value={formatReachValue(profile.popularity.bucket)}
            readout={profile.popularity.readout}
            glyph={<DotScale total={3} active={reachIndex(profile.popularity.bucket)} />}
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
            onPress={loyaltyOnPress}
          />
          <TasteCell
            label="Style"
            value={
              profile.ratingStyle.median > 0
                ? profile.ratingStyle.median.toFixed(1)
                : '—'
            }
            readout={profile.ratingStyle.readout}
            glyph={<StarGlyph median={profile.ratingStyle.median} />}
          />
        </View>
      </View>

      {/* Footer receipt */}
      <Text
        variant="caption"
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
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
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

// ---------- glyphs ----------

function DotScale({ total, active }: { total: number; active: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.spacing.xs, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: t.spacing.xs,
            height: t.spacing.xs,
            borderRadius: t.radii.pill,
            backgroundColor:
              i === active ? t.colors.accent.base : t.colors.border.subtle,
          }}
        />
      ))}
    </View>
  );
}

function BarFill({ ratio }: { ratio: number }) {
  const t = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View
      style={{
        height: t.spacing.xxs,
        backgroundColor: t.colors.border.subtle,
        borderRadius: t.radii.pill,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.round(clamped * 100)}%`,
          height: '100%',
          backgroundColor: t.colors.accent.base,
          borderRadius: t.radii.pill,
        }}
      />
    </View>
  );
}

function StarGlyph({ median }: { median: number }) {
  const t = useTheme();
  const filled = Math.round(median);
  return (
    <View style={{ flexDirection: 'row', gap: t.spacing.xxs }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={t.spacing.sm}
          color={i < filled ? t.colors.accent.base : t.colors.text.muted}
        />
      ))}
    </View>
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
