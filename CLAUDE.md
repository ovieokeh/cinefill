# cinefill

React Native (Expo SDK 54) Letterboxd-style app. v0 is local-only **Diary**: log watched films and view past entries.

This is the canonical conventions file. Follow it over personal preference.

## Stack

- Expo SDK 54, expo-router v6, React 19, RN 0.81, New Architecture/Fabric enabled.
- Storage: local `expo-sqlite`; no backend, auth, sync, or web support in v0.
- Film data: TMDB via `.env` -> `app.config.ts.extra` -> `expo-constants`.
- Keyboard: `react-native-keyboard-controller`; dates: `date-fns`.
- `.env` contains `TMDB_API_READ_ACCESS_TOKEN` and `TMDB_API_KEY`; restart Metro after changes.

## Layout

```
app/                  # expo-router routes
  _layout.tsx         # Stack + KeyboardProvider + GestureHandlerRootView + ThemeProvider
  (tabs)/             # bottom tabs; Diary lives at index.tsx
  new-entry.tsx       # add-entry modal
components/           # shared UI primitives
db/diary.ts           # SQLite schema + diary CRUD
lib/tmdb.ts           # TMDB client
lib/config.ts         # expo-constants config access
theme/                # tokens + ThemeProvider/useTheme
```

## Checks

Pre-commit runs:

1. `tsc --noEmit`
2. `jest --passWithNoTests --silent`
3. `expo lint --fix --max-warnings 0`
4. `node scripts/check-style-tokens.mjs`

Run ad hoc with `npm run typecheck`, `npm test`, and `npm run lint`. Fix failures at the source; do not use `--no-verify` unless the user explicitly authorizes an emergency bypass.

The token checker rejects inline hex colors, `rgba()`/`hsla()`, and inline numeric literals for spacing/typography/radius/letterSpacing/gap style props. `theme/tokens.ts`, `0`, `StyleSheet.hairlineWidth`, and percentage strings are allowed.

IMPORTANT: Never commit a broken build (web or mobile) as pushes trigger EAS and Nixpack builds. Unless explicity told otherwise, always confirm with the user before committing.

## Typography

- Display/title: Fraunces. Body/caption/label: Inter.
- Fonts load in `app/_layout.tsx` via `useFonts`; splash waits until fonts are ready or failed.
- Add a weight only when a token needs it: import from the family package, register in `useFonts`, then reference the registered name from `theme/tokens.ts`.

## Logic

- Put non-trivial business logic in pure modules under `lib/` with co-located tests in `lib/__tests__/`.
- `db/` exposes raw reads/writes; screens orchestrate; `lib/` transforms, filters, and aggregates.
- Pure functions that depend on time should accept `now` as an optional argument.
- Jest uses `ts-jest`, `testEnvironment: 'node'`, and `@/* -> <rootDir>/*`.

## Hard Rules

### 1. Use Theme Tokens

No inline colors, spacing, typography, radii, or shadows in app code. Add missing values to `theme/tokens.ts` first, prefer semantic names, and access them through `useTheme()`.

```tsx
const t = useTheme();
<View style={{ padding: t.spacing.lg, backgroundColor: t.colors.bg.surface }} />;
```

### 2. Use Shared Components

Import from `@/components`: `Screen`, `Text`, `Input`, `Button`, `StarRating`, `PosterImage`, `DateField`, `EntryRow`, and skeleton helpers.

If a shared component needs a variation, add a prop instead of creating a parallel component. `Text` replaces `RNText`; `Screen` is every screen's outer wrapper.

### 3. Safe Area + Navigation

Navigator headers already absorb the top inset, so `Screen` defaults to `edges={['bottom']}`. Do not add `'top'` unless the screen has no nav header.

Tab routes under `app/(tabs)/*` should pass `edges={[]}` because the tab bar already absorbs the bottom inset. Non-tab stack screens and modals keep the default bottom edge.

### 4. Fabric A11y Values Are Integers

Fabric coerces `accessibilityValue.{min,max,now}` to C integers. Scale fractional values and put the readable value in `text`.

```tsx
accessibilityValue={{
  min: 0,
  max: MAX * 2,
  now: Math.round(value * 2),
  text: `${value} of ${MAX} stars`,
}}
```

### 5. Touch-To-Value Inputs Use One Pressable Per Value

Do not compute values from `locationX`; child-relative coordinates and stretched rows make it fragile. Render discrete touch targets instead, such as one `Pressable` per star half. Constrain rows with `alignSelf: 'flex-start'` or explicit width when needed.

### 6. Forms Use KeyboardAwareScrollView

Use `KeyboardAwareScrollView` from `react-native-keyboard-controller`, not RN `KeyboardAvoidingView`, especially inside iOS modals. The root `KeyboardProvider` already lives in `app/_layout.tsx`.

```tsx
<Screen padded={false}>
  <KeyboardAwareScrollView
    contentContainerStyle={{ padding: t.spacing.lg }}
    keyboardShouldPersistTaps="handled"
    bottomOffset={t.spacing.lg}
    style={{ flex: 1 }}
  >
    {/* form */}
  </KeyboardAwareScrollView>
</Screen>
```

### 7. Loading States Are Skeletons

Initial loads must use content-shaped skeletons, not spinners. Match the final container geometry: padding, gap, radius, background, and enough placeholder items to fill the viewport.

Use `Skeleton`, `SkeletonText`, and `SkeletonPoster`. `ActivityIndicator` is only for fixed-surface feedback, such as button loading, or bottom-of-list pagination. Reusable skeleton variants should live next to their component.

## Recipes

### New Screen

1. Create `app/<route>.tsx` or `app/(tabs)/<route>.tsx`.
2. Wrap with `Screen`; tab screens use `edges={[]}`.
3. Use `useTheme()` and shared components.
4. Forms use `KeyboardAwareScrollView`.
5. Register modals in the root Stack with `presentation: 'modal'`.

### New Diary Field

1. Update `DiaryEntry`, `NewDiaryEntry`, and the `entries` DDL in `db/diary.ts`.
2. v0 has no migrations; during dev, drop/recreate `entries` or reset data through `SettingsSheet`.
3. Update `addEntry`, read sites, `app/new-entry.tsx`, and `components/EntryRow.tsx`.

### New Token

Edit `theme/tokens.ts` with a semantic name. `useTheme()` exposes it automatically.

### TMDB

Only `lib/tmdb.ts` talks to TMDB. Add endpoints there as named exports and use `posterUrl(posterPath, size)` for image URLs.

## Out Of Scope For v0

Ask before adding auth, accounts, sync, backend storage, or rewatch toggles.
