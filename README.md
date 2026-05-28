# cinefill

cinefill is a local-first film and TV diary built with Expo. It lets you log
films and TV seasons, rate them with half-stars, keep a watchlist, mark standout
TV episodes, import from Letterboxd, export your data as a zip, and optionally
sync user-owned data to a compatible cinefill server.

The native app stores its primary data in on-device SQLite. TMDB is used for
search, discovery, posters, genres, runtime, cast, and related metadata. The
marketing/privacy/support site lives in `web/`.

## Stack

- Expo SDK 54, React Native 0.81, React 19, expo-router v6.
- Local storage: `expo-sqlite`.
- Secure token storage: `expo-secure-store`.
- File import/export: `expo-document-picker`, `expo-file-system`, `expo-sharing`, `jszip`.
- Tests: Jest + ts-jest.
- Website: Next.js 16 in `web/`.
- Release: EAS Build and Submit, currently iOS-focused.

## Setup

Install app dependencies from the repo root:

```bash
npm install
```

Create `.env` with TMDB credentials:

```bash
TMDB_API_READ_ACCESS_TOKEN=...
TMDB_API_KEY=...
```

These are read by `app.config.ts` and exposed through Expo config. Restart Metro
after changing `.env`.

Install website dependencies separately:

```bash
cd web
npm install
```

## Run The App

Start Metro:

```bash
npm run start
```

Then open a simulator/device from the Expo CLI. For native development builds:

```bash
npm run ios
```

If native dependencies change, rebuild the dev client before testing on a device
or simulator.

## Local Native Builds

Expo Go is not enough for this app because it uses native modules such as
SQLite, Secure Store, File System, Sharing, and the date picker. Use a
development build/dev client for local native testing.

After installing or removing a native package, rebuild the native app before
running Metro:

```bash
npm install
npx expo prebuild --clean
npm run ios
```

Then start Metro:

```bash
npm run start
```

For a regular code-only change, you can usually skip `prebuild` and just run:

```bash
npm run start
```

If the simulator already has a current dev client installed, `npm run start`
is enough. If Metro shows a native module missing error, rebuild with
`npm run ios` again.

### App Store screenshot mode

Use review mode when capturing App Store screenshots. It replaces TMDB/search
responses and local diary/watchlist reads with fictional fixture data, including
fictional posters, titles, cast, and crew, so screenshot metadata does not show
third-party film or TV IP.

```bash
npm run start:review
```

If you need to rebuild the native app while review mode is active:

```bash
npm run ios:review
```

Do not use review mode for production builds.

## Run The Website

```bash
cd web
npm run dev
```

The site includes the homepage, support page, and privacy policy used for App
Store review and public product copy.

## Quality Checks

Run these before shipping app changes:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Run these before shipping website changes:

```bash
cd web
npm run lint
npm run build
```

`lint-staged` also runs Expo lint fixes and style-token checks on staged native
source files.

## Build And Release

EAS profiles are defined in `eas.json`.

Development iOS simulator build:

```bash
npm run build:dev:ios
```

Internal preview iOS build:

```bash
npm run build:preview:ios
```

Production iOS build:

```bash
npm run build:ios
```

Local production build, loading `.env` first:

```bash
npm run build:ios:local
```

Submit the latest production build to App Store Connect:

```bash
npm run submit:ios
```

Submit a local `.ipa` by passing its path after the script:

```bash
npm run submit:ios:local /path/to/cinefill.ipa
```

## Sync

Sync is optional and user-configured inside the app. It mirrors only user-owned
data:

- diary entries
- watchlist items
- TV episode standouts
- tombstones and sync metadata needed to merge changes

Diary entries and watchlist items sync as private by default. The in-app
`Make public` controls only appear when sync is configured, and public sites
should render only records with that explicit flag.

The client API is in `lib/sync/`. The app expects a compatible server exposing:

- `GET /api/cinefill/v1/health`
- `POST /api/cinefill/v1/sync`

The reference Payload implementation currently lives in the sibling
`ovie-space` repo. Server tokens are not bundled into the app; users enter a
server URL and personal token in Sync settings.

## Import And Export

Letterboxd import accepts the standard Letterboxd export zip and parses it
locally before matching titles against TMDB.

Export data creates a cinefill zip through the iOS share sheet. The export
contains:

- `cinefill.json`
- `diary.csv`
- `watchlist.csv`
- `episode-standouts.csv`
- `manifest.json`
- `README.txt`

The export includes user-owned cinefill data only. Derived TMDB cache rows are
not exported.

## Useful Paths

- `app/` - expo-router screens.
- `components/` - shared React Native UI.
- `db/` - SQLite schema and CRUD.
- `lib/tmdb.ts` - TMDB API client.
- `lib/sync/` - sync protocol, settings, and engine.
- `lib/cinefill-export.ts` - export zip generation.
- `theme/` - tokens and theme provider.
- `web/` - Next.js marketing, support, and privacy site.
