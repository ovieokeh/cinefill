import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Button, Input, Screen, Text } from '@/components';
import { useSync } from '@/lib/sync/context';
import { checkSyncHealth } from '@/lib/sync/client';
import { getSyncSettings, saveSyncSettings } from '@/lib/sync/settings';
import { normalizeSyncServerUrl } from '@/lib/sync/url';
import { useTheme } from '@/theme';

const SYNC_FAQ_URL = 'https://cinefill.ovie.dev/faq';

function formatTime(value: number | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export default function SyncSettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const sync = useSync();
  const [enabled, setEnabled] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await getSyncSettings();
      if (cancelled) return;
      setEnabled(settings.enabled);
      setServerUrl(settings.serverUrl);
      setToken(settings.token);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await saveSyncSettings({
        enabled,
        serverUrl: normalizeSyncServerUrl(serverUrl),
        token,
      });
      await sync.reload();
      router.back();
    } catch (error) {
      console.warn('sync settings save failed', error);
      Alert.alert('Save failed', 'Could not save sync settings.');
    } finally {
      setSaving(false);
    }
  }

  async function testAndSync(): Promise<void> {
    const normalized = normalizeSyncServerUrl(serverUrl);
    const trimmedToken = token.trim();
    if (!normalized || !trimmedToken) {
      Alert.alert('Missing details', 'Add a server URL and personal token first.');
      return;
    }
    setChecking(true);
    try {
      await checkSyncHealth({ serverUrl: normalized, token: trimmedToken });
      await saveSyncSettings({ enabled: true, serverUrl: normalized, token: trimmedToken });
      await sync.reload();
      const result = await sync.syncNow();
      if (result?.status === 'synced') {
        Alert.alert('Synced', `Pushed ${result.pushed}, pulled ${result.pulled}.`);
      } else {
        Alert.alert('Sync skipped', 'Enable sync and check your settings.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.';
      Alert.alert('Sync failed', message);
    } finally {
      setChecking(false);
    }
  }

  async function openSyncFaq(): Promise<void> {
    try {
      await Linking.openURL(SYNC_FAQ_URL);
    } catch {
      Alert.alert('Could not open FAQ', SYNC_FAQ_URL);
    }
  }

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button title="Save" variant="ghost" onPress={save} loading={saving} />
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.lg,
          paddingTop: t.spacing.lg,
          paddingBottom: t.spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            padding: t.spacing.md,
            borderRadius: t.radii.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: t.colors.border.subtle,
            backgroundColor: t.colors.bg.surface,
            gap: t.spacing.xs,
            marginBottom: t.spacing.lg,
          }}
        >
          <Text variant="label" tone="muted">
            PRIVACY
          </Text>
          <Text variant="caption" tone="muted">
            Optional sync mirrors your diary, watchlist, standout episodes, and
            deletions to the server you choose. Diary/watchlist items stay private unless marked public.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={openSyncFaq}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              marginTop: t.spacing.xs,
              opacity: pressed ? t.opacity.pressed : 1,
            })}
          >
            <Text variant="caption" tone="accent">
              Sync FAQ
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.row,
            {
              paddingVertical: t.spacing.md,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: t.colors.border.subtle,
            },
          ]}
        >
          <View style={styles.flex1}>
            <Text variant="bodyStrong">Enable sync</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
              Keep diary, watchlist, and standout episodes mirrored on the
              server you choose.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: t.colors.border.strong, true: t.colors.accent.base }}
            thumbColor={t.colors.text.primary}
          />
        </View>

        <View style={{ marginTop: t.spacing.lg }}>
          <Input
            label="Server URL"
            placeholder="https://ovie.dev"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={{ marginTop: t.spacing.lg }}>
          <Input
            label="Personal token"
            placeholder="CINEFILL_SYNC_TOKEN"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <View
          style={{
            marginTop: t.spacing.xl,
            padding: t.spacing.md,
            borderRadius: t.radii.md,
            backgroundColor: t.colors.bg.surface,
            gap: t.spacing.xs,
          }}
        >
          <Text variant="label" tone="muted">
            STATUS
          </Text>
          <Text variant="body">Last sync: {formatTime(sync.meta?.lastSuccessAt ?? null)}</Text>
          {sync.meta?.lastError ? (
            <Text variant="caption" tone="danger">
              {sync.meta.lastError}
            </Text>
          ) : null}
        </View>

        <Button
          title="Sync now"
          onPress={testAndSync}
          loading={checking || sync.phase === 'syncing' || loading}
          style={{ marginTop: t.spacing.xl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
