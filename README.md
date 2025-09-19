# Hotlog

Modern Next.js 15 application with Turbopack, TypeScript, Tailwind CSS v4, `next-intl` i18n, React Query, shadcn-inspired UI components, and a lightweight REST API layer built around `ky` + provider pattern.

## Getting Started

Clone and install dependencies:

```bash
git clone https://github.com/hotlog-org/hotlog hotlog
cd hotlog
```

Install dependencies:

```bash
yarn install
```

Create an environment file:

```bash
cp .env.example .env
```

Then fill in the required variables (see below). Next.js automatically loads `.env`.

Run the development server (Turbopack):

```bash
yarn dev
```

Open `http://localhost:3000` in the browser.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server with Turbopack |
| `yarn build` | Production build |
| `yarn start` | Start production server (after build) |
| `yarn lint` | Run ESLint (Next.js + custom config) |
| `yarn lint:fix` | Auto-fix lint issues |
| `yarn format` | Format code with Prettier |
| `yarn format:check` | Check formatting |

## Environment Variables

Managed with `@t3-oss/env-nextjs` + `zod`. Validation fails fast during build/runtime.

Client-side (must be prefixed with `NEXT_PUBLIC_`):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLIENT_WEB_URL` | Yes | Base public web URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_CLIENT_API_URL` | Yes | Base API URL for REST calls |

Server-side:

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No (defaults) | `development` or `production` |

Example `.env.example` (create this if not present):

```env
NEXT_PUBLIC_CLIENT_WEB_URL=http://localhost:3000
NEXT_PUBLIC_CLIENT_API_URL=http://localhost:3000/api
# NODE_ENV is optional
```

## Project Structure (trimmed)

```text
src/
  app/                 # Next.js App Router structure with locale segment
  config/
    env/               # Env parsing (client/server)
    routes/            # Route helpers/interfaces
    styles/            # Global styles (Tailwind entry)
  i18n/                # next-intl helpers (navigation/routing)
  lib/
    rest-api/          # API provider + fetcher abstraction
  modules/             # Feature-level modules (shared UI/utilities)
    shared/ui/         # Reusable UI components (shadcn-style)
    shared/hooks/      # Custom React hooks
    shared/utils/      # Utility helpers
  widgets/             # Higher-level composed UI (e.g. NotFound)
public/                # Static assets
messages/              # Translation JSON files (en, ru, am, ...)
```

## Internationalization (i18n)

`next-intl` powers locale routing via the dynamic `[locale]` segment under `src/app/(web)/[locale]/`. Translation JSON files live in `messages/`.

Add a new locale by:

1. Adding `<locale>.json` in `messages/`.
2. Extending allowed locales in your `routing.ts` / navigation config (see `src/i18n`).
3. Providing links or a switcher (see `language-switcher.tsx`).

Dynamic nested routes fallback to `[...rest]/page.tsx` where needed.