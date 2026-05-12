import { View, TextInput, TextInputProps, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  multiline?: boolean;
  /** When provided and `value` is non-empty, renders an X button that calls this on press. */
  onClear?: () => void;
};

export function Input({ label, style, multiline, onClear, ...rest }: Props) {
  const t = useTheme();
  const showClear =
    !!onClear && typeof rest.value === 'string' && rest.value.length > 0 && !multiline;

  return (
    <View>
      {label ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: t.spacing.xs }}>
          {label}
        </Text>
      ) : null}
      <View>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={t.colors.text.muted}
          style={[
            t.typography.body,
            {
              color: t.colors.text.primary,
              backgroundColor: t.colors.bg.input,
              borderColor: t.colors.border.subtle,
              borderRadius: t.radii.md,
              borderWidth: StyleSheet.hairlineWidth,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.md,
              paddingRight: showClear ? t.spacing.xxxl : t.spacing.md,
              minHeight: multiline ? 96 : 44,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
        />
        {showClear ? (
          <Pressable
            onPress={onClear}
            hitSlop={t.spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            style={{
              position: 'absolute',
              right: t.spacing.sm,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: t.spacing.xs,
            }}
          >
            <Ionicons name="close-circle" size={t.spacing.lg} color={t.colors.text.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
