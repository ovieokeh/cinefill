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

const CLUSTER_NOUN: Record<MoodCluster, string> = {
  storyDriven: 'Story-driven viewer',
  intense: 'Intensity-seeker',
  feelGood: 'Feel-good viewer',
  escapist: 'Escapist',
  cerebral: 'Cerebral viewer',
};

function headlineFrom(profile: TasteProfile): string {
  const lead = profile.genreLead.cluster;
  const decade = profile.era.modalDecade;
  const leadPart = lead ? CLUSTER_NOUN[lead] : null;
  const eraPart = decade != null ? `${String(decade).slice(-2)}s-leaning` : null;
  if (leadPart && eraPart) return `${leadPart}, ${eraPart}`;
  if (leadPart) return leadPart;
  if (eraPart) return `${decade}s viewer`;
  return 'Your taste is taking shape';
}

function formatRuntimeValue(meanMinutes: number | null): string {
  if (meanMinutes == null) return '—';
  return `${Math.round(meanMinutes)}m`;
}

function formatRecencyValue(medianLag: number | null): string {
  if (medianLag == null) return '—';
  if (medianLag === 0) return 'same year';
  const n = Math.round(medianLag);
  return `${n} yr${n === 1 ? '' : 's'} lag`;
}

function formatPopularityValue(bucket: TasteProfile['popularity']['bucket']): string {
  switch (bucket) {
    case 'cult':
      return 'Cult';
    case 'balanced':
      return 'Balanced';
    case 'mainstream':
      return 'Mainstream';
    default:
      return '—';
  }
}

function formatLoyaltyValue(profile: TasteProfile): string {
  if (!profile.loyalty.topDirector) return '—';
  return `${Math.round(profile.loyalty.topShare * 100)}%`;
}

function formatEraValue(profile: TasteProfile): string {
  if (profile.era.modalDecade == null) return '—';
  return `${profile.era.modalDecade}s`;
}

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  readout: string;
  onPress?: () => void;
};

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

  const card = [
    styles.card,
    {
      backgroundColor: t.colors.bg.surface,
      margin: t.spacing.lg,
      padding: t.spacing.lg,
      borderRadius: t.radii.md,
    },
  ];

  if (profile.confidence === 'empty') {
    return (
      <View style={card}>
        <Text
          variant="label"
          tone="muted"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          Your taste
        </Text>
        <Text variant="displayMd" style={{ marginTop: t.spacing.xs }}>
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

  const rows: Row[] = [
    {
      icon: 'color-palette-outline',
      label: 'Genre lean',
      value: profile.genreLead.cluster
        ? `${Math.round(profile.genreLead.share * 100)}%`
        : '—',
      readout: profile.genreLead.readout,
      onPress: genreLeadOnPress,
    },
    {
      icon: 'time-outline',
      label: 'Era',
      value: formatEraValue(profile),
      readout: profile.era.readout,
      onPress: eraOnPress,
    },
    {
      icon: 'hourglass-outline',
      label: 'Runtime',
      value: formatRuntimeValue(profile.runtime.meanMinutes),
      readout: profile.runtime.readout,
    },
    {
      icon: 'flash-outline',
      label: 'Recency',
      value: formatRecencyValue(profile.recencyVelocity.medianLagYears),
      readout: profile.recencyVelocity.readout,
    },
    {
      icon: 'compass-outline',
      label: 'Reach',
      value: formatPopularityValue(profile.popularity.bucket),
      readout: profile.popularity.readout,
    },
    {
      icon: 'person-outline',
      label: 'Loyalty',
      value: formatLoyaltyValue(profile),
      readout: profile.loyalty.readout,
      onPress: loyaltyOnPress,
    },
    {
      icon: 'star-outline',
      label: 'Rating style',
      value: profile.ratingStyle.median.toFixed(1),
      readout: profile.ratingStyle.readout,
    },
  ];

  return (
    <View style={card}>
      <Text
        variant="label"
        tone="muted"
        style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
      >
        Your taste
      </Text>
      <Text variant="displayMd" style={{ marginTop: t.spacing.xs }}>
        {headlineFrom(profile)}
      </Text>

      {profile.confidence === 'low' ? (
        <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
          Based on {profile.ratedCount} rated film
          {profile.ratedCount === 1 ? '' : 's'} — sharpens as you go.
        </Text>
      ) : null}

      <View style={{ marginTop: t.spacing.lg, gap: t.spacing.md }}>
        {rows.map((row) => (
          <TasteRow key={row.label} row={row} />
        ))}
      </View>

      <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.lg }}>
        {totalMovies} films · {Math.round(filmHours)}h  ·  {totalSeasons} season
        {totalSeasons === 1 ? '' : 's'} · {Math.round(tvHours)}h
      </Text>
    </View>
  );
}

function TasteRow({ row }: { row: Row }) {
  const t = useTheme();
  const tappable = row.onPress != null;
  const valueMinWidth = t.spacing.xxxl + t.spacing.lg; // ≈ 64px
  const content = (
    <>
      <Ionicons
        name={row.icon}
        size={t.spacing.lg}
        color={t.colors.text.muted}
        style={{ marginRight: t.spacing.md }}
      />
      <View style={styles.flex1}>
        <View style={styles.rowHeader}>
          <Text variant="caption" tone="muted" style={styles.flex1}>
            {row.label}
          </Text>
          <Text
            variant="bodyStrong"
            style={{ minWidth: valueMinWidth, textAlign: 'right' }}
          >
            {row.value}
          </Text>
          {tappable ? (
            <Ionicons
              name="chevron-forward"
              size={t.spacing.md}
              color={t.colors.text.muted}
              style={{ marginLeft: t.spacing.xxs }}
            />
          ) : null}
        </View>
        <Text
          variant="caption"
          tone="secondary"
          style={{ marginTop: t.spacing.xxs }}
        >
          {row.readout}
        </Text>
      </View>
    </>
  );
  if (!tappable) {
    return <View style={styles.row}>{content}</View>;
  }
  return (
    <Pressable
      onPress={row.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}: ${row.readout}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? t.opacity.pressed : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
