# Hotlog

Modern Next.js 16 application with Turbopack, TypeScript, Tailwind CSS v4, `next-intl` i18n, React Query, shadcn-inspired UI components, and a Go-powered events backend behind authenticated Next.js API proxy routes.

## Getting Started

- Clone and install dependencies:

```bash
git clone https://github.com/hotlog-org/hotlog hotlog
cd hotlog
nvm use || nvm install 22
yarn install
```

- Create `.env` for environmental variables:

```bash
cp .env.example .env
```

Then fill in the required variables (see below). Next.js automatically loads `.env`.

- Run the development server (Turbopack):

```bash
yarn dev
```

- Run the Go events API in a separate terminal:

```bash
yarn dev:api
```

- Open `http://localhost:3000` in the browser.

## Scripts

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `yarn dev`            | Start dev server with Turbopack       |
| `yarn dev:api`        | Start Go events API service           |
| `yarn build`          | Production build                      |
| `yarn build:api`      | Build Go events API binary            |
| `yarn start`          | Start production server (after build) |
| `yarn lint`           | Run ESLint (Next.js + custom config)  |
| `yarn eslint-fix`     | Auto-fix lint issues                  |
| `yarn prettier`       | Format code with Prettier             |
| `yarn prettier-check` | Check formatting                      |

## Environment Variables

Managed with `@t3-oss/env-nextjs` + `zod`. Validation fails fast during build/runtime.

Client-side (must be prefixed with `NEXT_PUBLIC_`):

| Variable                     | Required | Description                                        |
| ---------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CLIENT_WEB_URL` | Yes      | Base public web URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_CLIENT_API_URL` | Yes      | Base API URL for REST calls                        |

Server-side:

| Variable                | Required      | Description                                  |
| ----------------------- | ------------- | -------------------------------------------- |
| `NODE_ENV`              | No (defaults) | `development` or `production`                |
| `BETTER_AUTH_SECRET`    | Yes           | Better Auth secret                           |
| `DATABASE_URL`          | Yes           | Postgres connection string                   |
| `GO_DATABASE_URL`       | No            | Go API DB URL (falls back to `DATABASE_URL`) |
| `GO_API_BASE_URL`       | No (defaults) | Next proxy target for Go API                 |
| `GO_API_INTERNAL_TOKEN` | No (defaults) | Shared internal token between Next and Go    |
| `GO_API_ADDR`           | No (defaults) | Go API listen address (for `yarn dev:api`)   |

Example `.env.example`:

```env
NEXT_PUBLIC_CLIENT_WEB_URL=http://localhost:3000
NEXT_PUBLIC_CLIENT_API_URL=http://localhost:3000/api
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000/api/auth

BETTER_AUTH_SECRET=replace_with_at_least_32_chars_secret_value
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hotlog?sslmode=disable
GO_DATABASE_URL=postgres://postgres:postgres@localhost:5432/hotlog?sslmode=disable

GO_API_ADDR=:8080
GO_API_BASE_URL=http://127.0.0.1:8080
GO_API_INTERNAL_TOKEN=dev-internal-token
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
