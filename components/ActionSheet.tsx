import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type ActionItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export type ActionSheetHandle = {
  present: (actions: ActionItem[]) => void;
  dismiss: () => void;
};

export const ActionSheet = forwardRef<ActionSheetHandle>(function ActionSheet(_, ref) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);

  useImperativeHandle(ref, () => ({
    present: (a) => {
      setActions(a);
      modalRef.current?.present();
    },
    dismiss: () => {
      modalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

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
        {actions.map((item, idx) => (
          <Pressable
            key={`${item.label}-${idx}`}
            onPress={() => {
              modalRef.current?.dismiss();
              requestAnimationFrame(item.onPress);
            }}
            style={({ pressed }) => [
              styles.row,
              {
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.md,
                backgroundColor: pressed ? t.colors.bg.surface : t.colors.transparent,
              },
            ]}
          >
            {item.icon ? (
              <Ionicons
                name={item.icon}
                size={t.spacing.xl}
                color={item.destructive ? t.colors.danger : t.colors.text.primary}
                style={{ marginRight: t.spacing.md }}
              />
            ) : null}
            <Text variant="body" tone={item.destructive ? 'danger' : 'primary'}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
