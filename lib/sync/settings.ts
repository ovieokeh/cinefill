import * as SecureStore from 'expo-secure-store';

import {
  getSyncMeta,
  saveSyncConfig,
  type SyncMeta,
} from '@/db/sync';

const TOKEN_KEY = 'cinefill.sync.token';

export type SyncSettings = SyncMeta & {
  token: string;
};

export async function getSyncSettings(): Promise<SyncSettings> {
  const [meta, token] = await Promise.all([
    getSyncMeta(),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);
  return { ...meta, token: token ?? '' };
}

export async function saveSyncSettings(input: {
  enabled: boolean;
  serverUrl: string;
  token: string;
}): Promise<void> {
  await saveSyncConfig({
    enabled: input.enabled,
    serverUrl: input.serverUrl,
  });
  const token = input.token.trim();
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
