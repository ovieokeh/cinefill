import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { haptic } from '@/lib/haptics';

type Props = {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
  readOnly?: boolean;
};

const MAX = 5;

export function StarRating({ value, onChange, size = 28, readOnly = false }: Props) {
  const t = useTheme();
  const interactive = !readOnly && !!onChange;
  const gap = t.spacing.xs;

  function pick(target: number) {
    if (!interactive) return;
    haptic.selection();
    onChange?.(value === target ? 0 : target);
  }

  return (
    <View
      style={styles.row}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityValue={{
        min: 0,
        max: MAX * 2,
        now: Math.round(value * 2),
        text: `${value} of ${MAX} stars`,
      }}
    >
      {Array.from({ length: MAX }).map((_, i) => {
        const filled = Math.max(0, Math.min(1, value - i));
        const isHalf = filled > 0 && filled < 1;
        const name: 'star' | 'star-half' | 'star-outline' = filled >= 1 ? 'star' : isHalf ? 'star-half' : 'star-outline';
        const leftValue = i + 0.5;
        const rightValue = i + 1;

        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                width: size,
                height: size,
                marginRight: i === MAX - 1 ? 0 : gap,
              },
            ]}
          >
            <Ionicons
              name={name}
              size={size}
              color={value > i ? t.colors.star : t.colors.text.muted}
            />
            {interactive ? (
              <>
                <Pressable
                  onPress={() => pick(leftValue)}
                  style={[styles.half, styles.halfLeft]}
                  hitSlop={{ top: 8, bottom: 8 }}
                  accessibilityLabel={`${leftValue} stars`}
                />
                <Pressable
                  onPress={() => pick(rightValue)}
                  style={[styles.half, styles.halfRight]}
                  hitSlop={{ top: 8, bottom: 8 }}
                  accessibilityLabel={`${rightValue} stars`}
                />
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  cell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  halfLeft: { left: 0 },
  halfRight: { right: 0 },
});
