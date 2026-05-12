// Thin, fire-and-forget wrapper around expo-haptics.
//
// Each function returns a Promise that's silently caught — devices without
// haptics support fail silently. Call sites stay terse: `haptic.success()`.

import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => p.catch(() => {});

export const haptic = {
  /** Light "this is selectable" tap — star ratings, toggles. */
  selection: () => safe(Haptics.selectionAsync()),
  /** Subtle confirmation — watchlist toggles. */
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Stronger confirmation — FAB / primary actions. */
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Success notification — save/log succeeded. */
  success: () =>
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Warning notification — blocked action, e.g. tapping a disabled filter chip. */
  warning: () =>
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
