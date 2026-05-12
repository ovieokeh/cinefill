# cinefill

React Native (Expo SDK 54) Letterboxd-style app. v0 surface: **Diary** — log films you've watched, view past entries.

This file is the canonical reference for project conventions. Read it before touching code. If a rule below conflicts with what you'd "naturally" write, the rule wins — every rule is here because not following it broke something.

---

## Stack

- **Toolchain:** Expo SDK 54, expo-router v6, React 19, RN 0.81 (New Architecture / Fabric enabled).
- **Storage:** Local-only via `expo-sqlite`. No backend, no auth in v0.
- **Film data:** TMDB API (v4 read access token via `.env` → `app.config.ts.extra` → `expo-constants`).
- **Keyboard:** `react-native-keyboard-controller` (in Expo Go).
- **Dates:** `date-fns`.

`.env` (gitignored) holds `TMDB_API_READ_ACCESS_TOKEN` and `TMDB_API_KEY`. Restart metro after changing it.

---

## File layout

```
app/                  # expo-router routes
  _layout.tsx           # root Stack + KeyboardProvider + GestureHandlerRootView + ThemeProvider
  (tabs)/
    _layout.tsx         # bottom tabs (Diary so far)
    index.tsx           # Diary list
  new-entry.tsx         # Add-entry modal screen
components/           # shared UI primitives (see "Components" below)
db/diary.ts           # SQLite schema + CRUD for the diary
lib/tmdb.ts           # TMDB client (searchMovies, posterUrl)
lib/config.ts         # reads TMDB token via expo-constants
theme/                # design tokens + ThemeProvider/useTheme
```

---

## Pre-commit hook

`husky` + `lint-staged` are configured. Every `git commit` runs, in order:

1. **`tsc --noEmit`** — full-project type-check.
2. **`jest --passWithNoTests --silent`** — unit tests under `**/__tests__/*.test.ts`.
3. **`expo lint --fix --max-warnings 0`** — ESLint on staged files (treats warnings as errors).
4. **`node scripts/check-style-tokens.mjs`** — custom guard that rejects inline hex colors, `rgba()`/`hsla()`, and inline numeric literals for spacing/typography/radius/letterSpacing/gap properties. Exempts `theme/tokens.ts`. Allows `0`, `StyleSheet.hairlineWidth`, and percentage strings.

If a commit blocks, fix the issue at the source — do **not** use `--no-verify` to bypass. The whole point of the hook is to keep the design-token rule mechanically enforced. The only legitimate reason to bypass would be an emergency hotfix the user explicitly authorizes.

Run the same checks ad-hoc with `npm run typecheck`, `npm test`, and `npm run lint`.

## Typography

cinefill uses **Fraunces** (variable serif) for display + title variants and **Inter** for body / caption / label, both delivered via `@expo-google-fonts/*` subpackages. Fonts are loaded at app boot in `app/_layout.tsx` via `useFonts`; the splash screen is held until they're ready (or fail to load — in which case we proceed with system fallbacks).

Adding a new weight:
1. Import the weight from the per-family subpackage (e.g. `Fraunces_400Regular` from `@expo-google-fonts/fraunces`).
2. Register it in `app/_layout.tsx`'s `useFonts({...})`.
3. Reference its registered name (matches the import name) from `theme/tokens.ts`.

Each weight is ~50KB bundled. Don't add weights speculatively — only when a token variant needs one.

## Where logic lives

Non-trivial business logic — stat aggregation, format transforms, filter rules — goes in **pure-function modules under `lib/`** with **co-located tests** in `lib/__tests__/`. `db/` exposes raw reads; screens orchestrate; `lib/` does the math. Pure functions that depend on "now" should accept it as an optional argument so tests can pin time. Jest config: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }`.

## Hard rules

### 1. Every style value goes through `theme/tokens.ts`

No inline color/spacing/typography/radii/shadow literals **anywhere** in app code. If you need a new value (e.g. a new gray, a new spacing step), add it to `theme/tokens.ts` first and use it from there.

```tsx
// ✗ wrong
<View style={{ padding: 16, backgroundColor: '#171B21' }} />

// ✓ right
const t = useTheme();
<View style={{ padding: t.spacing.lg, backgroundColor: t.colors.bg.surface }} />
```

Prefer **semantic** token names (`colors.bg.surface`, `colors.text.primary`) over palette names. The whole point of tokens is so we can swap the visual style later in one file; semantic names survive the swap, palette names don't.

### 2. Use the shared components, don't roll new ones

```tsx
import { Screen, Text, Input, Button, StarRating, PosterImage, DateField, EntryRow } from '@/components';
```

- `Screen` — every screen's outermost wrapper. Handles SafeArea (defaults to `edges=['bottom']` only — see "Safe area + nav" below) and the app background.
- `Text` — replaces `RNText`. Props: `variant` (typography token key), `tone` (semantic color).
- `Input` — text field with label, multiline support, token styling.
- `Button` — primary / ghost variants, loading, disabled.
- `StarRating` — half-star, tappable (discrete half-cell tap targets, not coordinate math).
- `PosterImage` — TMDB poster with sm/md/lg sizes and a token-styled fallback.
- `DateField` — native iOS/Android date picker with a labelled trigger.
- `EntryRow` — diary entry card.

If you need a variant of one of these, add a prop. Don't write a parallel component.

### 3. Safe-area + navigation

Every route in this app sits inside a navigator (Stack/Tabs) whose header already absorbs the top safe-area inset. `Screen` defaults to `edges={['bottom']}` for that reason — **do not** re-add `'top'` unless the screen has no nav header (custom splash, etc.). Symptom of getting this wrong: a huge empty gap below the nav header.

### 4. Fabric a11y values must be integers

The New Architecture coerces `accessibilityValue.{min,max,now}` to C `long long`. Passing a float crashes at render with `Exception in HostFunction: Loss of precision during arithmetic conversion`. Scale fractional values into ints and use `text` for the human-readable label:

```tsx
accessibilityValue={{
  min: 0,
  max: MAX * 2,
  now: Math.round(value * 2),     // not `value` if value can be 0.5/1.5/...
  text: `${value} of ${MAX} stars`,
}}
```

### 5. For touch-to-value inputs, render one Pressable per value

Don't read `locationX` and compute a ratio. Two reasons it bites:

- `locationX` is relative to whichever **child** got tapped, not the Pressable owning `onPress` — tapping a child icon gives you a tiny x, the math implodes.
- A `flexDirection: 'row'` Pressable with no width constraint stretches to the full parent width — the "empty space" past the visible content is still inside the row, so taps out there compute a huge ratio.

Render the touch surface AS the value: one Pressable per discrete step (use absolutely-positioned halves over an icon for half-step inputs). No coordinates, no measurement, no surprises. Add `alignSelf: 'flex-start'` (or explicit width) to row containers if you want them not to stretch.

### 6. Forms use `KeyboardAwareScrollView` from `react-native-keyboard-controller`

Not RN's built-in `KeyboardAvoidingView` — it breaks inside modal presentations on iOS. The keyboard-controller component tracks the focused input via the native keyboard frame APIs and works correctly inside modals.

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<Screen padded={false}>
  <KeyboardAwareScrollView
    contentContainerStyle={{ /* padding from tokens */ }}
    keyboardShouldPersistTaps="handled"
    bottomOffset={t.spacing.lg}
    style={{ flex: 1 }}
  >
    {/* form */}
  </KeyboardAwareScrollView>
</Screen>
```

The root `KeyboardProvider` is already in `app/_layout.tsx` — don't move it.

### 7. Loading states are content-shaped skeletons, not spinners

Every load site — anywhere we render conditionally on a fetched value being null/undefined — must render a **Skeleton placeholder whose geometry matches the eventual content** so the layout doesn't shift when data arrives. `ActivityIndicator` is reserved for two specific cases:

- **In-place feedback inside a fixed surface** that's not itself a load placeholder (Button loading state, genre-picker chip spinner).
- **Bottom-of-list pagination** when more items are appending to an already-visible list.

Everywhere else (full-screen loads, list/grid initial loads, hero placeholders, sectional placeholders) build the load state out of `Skeleton`, `SkeletonText`, `SkeletonPoster`:

```tsx
import { Skeleton, SkeletonText, SkeletonPoster } from '@/components';

// Plain rectangle (use only when no semantic helper fits)
<Skeleton width="100%" height={96} borderRadius={t.radii.md} />

// Text line shaped by typography variant — height = lineHeight of that variant
<SkeletonText variant="bodyStrong" width="70%" />
<SkeletonText variant="caption" width="35%" />

// Poster shaped to PosterImage's sm/md/lg dimensions exactly
<SkeletonPoster size="lg" />
```

Match the **content's containers** too — same padding, gap, borderRadius, background. If a row uses `bg.surface` + `padding: md` + `borderRadius: md`, the skeleton row uses the same. If a chart paddings the section with `paddingHorizontal: lg`, the skeleton does the same. Goal: when the data arrives, **nothing moves**.

When a component has a stable, content-shaped loading variant that more than one screen renders, colocate the skeleton next to the component as a named export (e.g. `BackdropPosterHeaderSkeleton`, `MoviePosterRowSkeleton`). One-off shapes (e.g. a season's episode list) live inline in the screen file.

Quantity: render enough placeholder items to fill the viewport during load — typically **6–8 vertical rows**, **2–3 grid rows × 2 cols**, **6 horizontal carousel items**.

---

## Recipes

### Adding a new screen

1. Create `app/<route>.tsx` (or `app/(tabs)/<route>.tsx` for a tab).
2. Wrap content in `<Screen>` (defaults to `padded` + bottom safe edge).
3. Use `useTheme()` + shared components for everything visual.
4. For forms, use `KeyboardAwareScrollView` (see rule 6).
5. If it's a modal, register it under the root Stack in `app/_layout.tsx` with `presentation: 'modal'`.

### Adding a new diary field

1. Update `DiaryEntry` + `NewDiaryEntry` types and the `entries` table DDL in `db/diary.ts`. Add a migration if the table already exists in dev (drop and recreate is acceptable in v0 — `await db.execAsync('DROP TABLE entries')`).
2. Update `addEntry` and any read sites.
3. Surface the field in `app/new-entry.tsx` form and `components/EntryRow.tsx`.

### Adding a token

1. Edit `theme/tokens.ts`. Use semantic naming.
2. Done — `useTheme()` exposes it automatically.

### TMDB calls

`lib/tmdb.ts` is the only place that talks to TMDB. Add new endpoints as named exports there; never `fetch` TMDB from a screen or component. Use `posterUrl(posterPath, size)` for image URLs.

---

## What NOT to add in v0 (without asking)

- Auth, user accounts, sync — explicitly deferred.
- Backend / remote storage — explicitly deferred.
- Web support — `expo-sqlite`'s web worker doesn't bundle out of the box; mobile-only for now.
- Rewatch toggle on entries — user explicitly deselected this in v0 spec.
- Edit/delete entry, entry detail screen — deferred unless asked.
