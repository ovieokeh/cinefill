import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * Small pulsing amber dot — used to signal a "live" / fresh state (e.g. next to
 * a rated-count receipt). Pulse loop runs forever; the dot stays accessible.
 */
export function LiveDot({ size }: { size?: number }) {
  const t = useTheme();
  const dim = size ?? t.spacing.sm;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: t.durations.slow * 4,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: t.durations.slow * 4,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, t.durations.slow]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });

  return (
    <View
      style={{
        width: dim,
        height: dim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
    >
      <Animated.View
        style={{
          width: dim,
          height: dim,
          borderRadius: t.radii.pill,
          backgroundColor: t.colors.accent.base,
          opacity,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}
