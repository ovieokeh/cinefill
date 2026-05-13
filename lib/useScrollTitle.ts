import { useState } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const DEFAULT_THRESHOLD = 160;

export type UseScrollTitleResult = {
  /**
   * Shared value that tracks vertical scroll offset. Pass to any animated hero
   * components (e.g. `BackdropPosterHeader`) that drive parallax off the scroll.
   */
  scrollY: SharedValue<number>;
  /**
   * Attach to `<Animated.ScrollView onScroll={...} scrollEventThrottle={16} />`.
   */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /**
   * True once the user has scrolled past `threshold`. Use it to drive
   * `<Stack.Screen options={{ title: showTitle ? entityName : '' }} />` on
   * detail pages so the entity name fades into the nav bar past the hero.
   */
  showTitle: boolean;
};

/**
 * Shared "reveal the nav title once the user scrolls past the hero" hook.
 * Used by movie, tv, person, and season detail pages so the pattern stays
 * consistent across detail surfaces.
 *
 * `threshold` is in pixels — the scroll offset at which the title flips on.
 * Tune per-page if a particular hero is shorter or taller than the default.
 */
export function useScrollTitle(threshold: number = DEFAULT_THRESHOLD): UseScrollTitleResult {
  const [showTitle, setShowTitle] = useState(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  useAnimatedReaction(
    () => scrollY.value > threshold,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setShowTitle)(current);
      }
    },
  );
  return { scrollY, scrollHandler, showTitle };
}
