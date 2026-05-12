import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ReadonlyArray<Edge>;
  padded?: boolean;
};

export function Screen({ children, style, edges = ['bottom'], padded = true }: Props) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: t.colors.bg.app }]}>
      <View style={[styles.flex, padded ? { paddingHorizontal: t.spacing.lg } : null, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
