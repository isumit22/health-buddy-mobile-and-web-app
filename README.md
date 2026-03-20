# Health Buddy Monorepo

Health Buddy is a cross-platform mental wellness project with:

- A React Native + Expo mobile app in `apps/mobile`
- A React Router + Vite web app in `apps/web`
- A `_/` snapshot folder containing an earlier/generated app state used as reference

## What This Repository Contains

### Mobile App (`apps/mobile`)

- Expo SDK 54 + React Native 0.81
- Expo Router based navigation
- TanStack Query for data fetching/cache
- Auth integration via web flow helpers
- Uploadcare-based file upload utility
- Multiple platform polyfills under `polyfills/`
- Patch maintenance with `patch-package` (`patches/`)

### Web App (`apps/web`)

- React Router v7 + Vite
- Server runtime wiring via `react-router-hono-server`
- Auth token endpoints under `src/app/api/auth/*`
- Shared API utilities (SQL + upload) under `src/app/api/utils/*`
- Tailwind + TypeScript setup

### Snapshot Folder (`_/`)

The `_/` folder contains a broader snapshot/reference version of the project, including routes such as chat, mood, and voice-analysis APIs. The actively configured apps for day-to-day development are the ones under `apps/`.

## High-Level Structure

```text
.
|- apps/
|  |- mobile/   # Expo / React Native app
|  \- web/      # React Router / Vite app
|- _/           # snapshot/reference app tree
\- README.md
```

## Prerequisites

- Node.js 20+
- npm 10+ (mobile uses `package-lock.json`)
- bun (optional, preferred by web because `bun.lock` is present)
- Expo tooling for mobile development

## Setup

### 1) Install dependencies

Mobile:

```bash
cd apps/mobile
npm install
```

Web (choose one):

```bash
cd apps/web
bun install
```

or

```bash
cd apps/web
npm install
```

### 2) Configure environment variables

This repo currently includes `.env` files in both app folders. If you are setting up fresh, ensure required values exist.

Commonly used variables in the codebase include:

Mobile (`apps/mobile`):

- `EXPO_PUBLIC_CREATE_ENV`
- `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY`
- `EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL`
- `EXPO_PUBLIC_PROXY_BASE_URL`
- `EXPO_PUBLIC_BASE_URL`
- `EXPO_PUBLIC_PROJECT_GROUP_ID`
- `EXPO_PUBLIC_HOST`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_LOGS_ENDPOINT`
- `EXPO_PUBLIC_CREATE_TEMP_API_KEY`

Web (`apps/web`):

- `AUTH_SECRET`
- `AUTH_URL`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `NEXT_PUBLIC_CREATE_APP_URL`
- `NEXT_PUBLIC_CREATE_BASE_URL`
- `NEXT_PUBLIC_CREATE_API_BASE_URL`
- `NEXT_PUBLIC_PROJECT_GROUP_ID`
- `NEXT_PUBLIC_CREATE_HOST`

## Running the Apps

### Mobile

```bash
cd apps/mobile
npx expo start
```

Useful targets:

- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS)
- Press `w` for web

### Web

```bash
cd apps/web
bun run dev
```

The web dev server is configured for `0.0.0.0:4000` in `vite.config.ts`.

## Quality Checks

Web type-check:

```bash
cd apps/web
bun run typecheck
```

Mobile tests (Jest preset configured):

```bash
cd apps/mobile
npx jest
```

## Notes

- Mobile `postinstall` runs `patch-package`, so dependency patches are automatically re-applied after install.
- EAS build profiles are defined in `apps/mobile/eas.json` (`development`, `preview`, `production`).
- If line-ending warnings appear on Windows (`LF will be replaced by CRLF`), they are Git normalization warnings and do not usually block builds.

## Security Reminder

Because `.env` files are tracked in this repository, treat any exposed credentials as compromised if this is a public repo. Rotate secrets and consider moving to `.env.example` + local untracked `.env` files.
