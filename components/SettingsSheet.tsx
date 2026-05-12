import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
            paddingHorizontal: t.spacing.lg,
            paddingVertical: t.spacing.sm,
          }}
        >
          <Text
            variant="label"
            tone="muted"
            style={{
              textTransform: 'uppercase',
              letterSpacing: t.tracking.label,
            }}
          >
            Settings
          </Text>
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
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1, minWidth: 0 },
});
