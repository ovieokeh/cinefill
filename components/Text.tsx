import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';

type Variant = keyof ReturnType<typeof useTheme>['typography'];
type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'inverted';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  const t = useTheme();
  const color =
    tone === 'accent'
      ? t.colors.accent.base
      : tone === 'danger'
        ? t.colors.danger
        : tone === 'inverted'
          ? t.colors.text.inverted
          : tone === 'muted'
            ? t.colors.text.muted
            : tone === 'secondary'
              ? t.colors.text.secondary
              : t.colors.text.primary;

  return <RNText {...rest} style={[t.typography[variant], { color }, style]} />;
}
