import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';
import { Wordmark } from './Wordmark';
import { deleteAllEntries } from '@/db/diary';
import { deleteAllWatchlist } from '@/db/watchlist';
import { deleteAllStandouts } from '@/db/standouts';
import { useFilmContext } from '@/lib/film-context';

export type SettingsSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

export const SettingsSheet = forwardRef<SettingsSheetHandle>(function SettingsSheet(
  _,
  ref,
) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const { refresh } = useFilmContext();

  useImperativeHandle(ref, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  const handleImport = () => {
    modalRef.current?.dismiss();
    requestAnimationFrame(() => router.push('/import-letterboxd'));
  };

  const handleReset = () => {
    Alert.alert(
      'Reset all data?',
      'Permanently deletes every diary entry, watchlist item, and standout episode. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            modalRef.current?.dismiss();
            try {
              const [entries, watchlist, standouts] = await Promise.all([
                deleteAllEntries(),
                deleteAllWatchlist(),
                deleteAllStandouts(),
              ]);
              await refresh();
              Alert.alert(
                'Wiped',
                `Removed ${entries} diary, ${watchlist} watchlist, ${standouts} standout ${
                  standouts === 1 ? 'row' : 'rows'
                }.`,
              );
            } catch (err) {
              console.warn('reset failed', err);
              Alert.alert('Reset failed', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      enablePanDownToClose
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: t.colors.bg.elevated }}
      handleIndicatorStyle={{ backgroundColor: t.colors.border.strong }}
    >
      <BottomSheetView
        style={{
          paddingTop: t.spacing.sm,
          paddingBottom: insets.bottom + t.spacing.lg,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: t.spacing.md,
          }}
        >
          <Wordmark width={112} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import from Letterboxd"
          onPress={handleImport}
          style={({ pressed }) => [
            styles.row,
            {
              paddingHorizontal: t.spacing.lg,
              paddingVertical: t.spacing.md,
              gap: t.spacing.md,
              backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
            },
          ]}
        >
          <Ionicons
            name="cloud-download-outline"
            size={t.spacing.xl}
            color={t.colors.text.primary}
          />
          <View style={styles.flex1}>
            <Text variant="body">Import from Letterboxd</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
              Bring in your diary, reviews, and watchlist from a Letterboxd export.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={t.spacing.lg}
            color={t.colors.text.muted}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset all data"
          onPress={handleReset}
          style={({ pressed }) => [
            styles.row,
            {
              paddingHorizontal: t.spacing.lg,
              paddingVertical: t.spacing.md,
              gap: t.spacing.md,
              backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
            },
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={t.spacing.xl}
            color={t.colors.danger}
          />
          <View style={styles.flex1}>
            <Text variant="body" tone="danger">
              Reset all data
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xxs }}>
              Wipe diary, watchlist, and standout episodes. For starting over from a fresh import.
            </Text>
          </View>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
