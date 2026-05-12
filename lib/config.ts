import Constants from 'expo-constants';

type Extra = {
  tmdbReadToken?: string;
  tmdbApiKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const config = {
  tmdbReadToken: extra.tmdbReadToken ?? '',
  tmdbApiKey: extra.tmdbApiKey ?? '',
};

export function assertTmdbConfigured() {
  if (!config.tmdbReadToken) {
    throw new Error(
      'TMDB_API_READ_ACCESS_TOKEN is missing. Add it to .env at the project root and restart the dev server.',
    );
  }
}
