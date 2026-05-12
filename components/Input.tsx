import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  multiline?: boolean;
};

export function Input({ label, style, multiline, ...rest }: Props) {
  const t = useTheme();
  return (
    <View>
      {label ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: t.spacing.xs }}>
          {label}
        </Text>
      ) : null}
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
            minHeight: multiline ? 96 : 44,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
    </View>
  );
}
