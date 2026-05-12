import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { logoUrl } from '@/lib/tmdb';
import type { MovieDetails } from '@/lib/tmdb';
import { Text } from './Text';

const LOGO_SIZE = 48;
const ITEM_WIDTH = 64;

type Provider = MovieDetails['flatrateProviders'][number];

export function WatchProviders({ providers }: { providers: MovieDetails['flatrateProviders'] }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: t.spacing.lg, gap: t.spacing.md }]}>
      {providers.map((p) => (
        <ProviderItem key={p.id} provider={p} />
      ))}
    </View>
  );
}

function ProviderItem({ provider }: { provider: Provider }) {
  const t = useTheme();
  const url = logoUrl(provider.logoPath, 'w92');
  return (
    <View style={[styles.item, { width: ITEM_WIDTH }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[
            styles.logo,
            {
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: t.radii.md,
              backgroundColor: t.colors.bg.elevated,
            },
          ]}
          contentFit="cover"
          transition={t.durations.fast}
        />
      ) : (
        <View
          style={[
            styles.logo,
            {
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: t.radii.md,
              backgroundColor: t.colors.bg.elevated,
              borderColor: t.colors.border.subtle,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        />
      )}
      <Text
        variant="caption"
        tone="muted"
        numberOfLines={2}
        style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
      >
        {provider.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: { alignItems: 'center' },
  logo: {},
});
