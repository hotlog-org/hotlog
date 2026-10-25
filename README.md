# Hotlog

Modern Next.js 16 application with Turbopack, TypeScript, Tailwind CSS v4, `next-intl` i18n, React Query, shadcn-inspired UI components, and a lightweight REST API layer built around `ky` + provider pattern.

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

- Open `http://localhost:3001` in the browser (port 3000 is reserved for the local relay).

## Supabase database setup

**Never reset linked Hotlog `mcpsycjnnjmdobrhvstr`, replay its historic migrations,
run `db push --include-all`, or repair its migration history.** The reconstructed
`20260314173820_remote_schema.sql` is only for a new, isolated database. Existing
hosted deployments use reviewed forward migrations only; deployment and hosted
SQL tests are separate parent-controlled gates. Do not load repository dumps.

Local setup requires Docker, Supabase CLI (2.119.0 inspected), PostgreSQL 17 via
Supabase, Node 22.12+ (Node 24 used for tests), and Yarn 1.22.22. The local
`supabase/config.toml` uses project identifier `hotlog-local`, not a hosted ref.
Install the CLI separately if unavailable; the reset wrapper never downloads it.
When an isolated local environment is authorized and Docker is running:

```bash
npx --no-install supabase start
```

To replay **all** migrations and the static permission seed on that isolated
local instance (erases only its local database), use the guarded wrapper:

```bash
node scripts/reset-local-supabase.mjs --confirm-local-reset
```

The wrapper accepts no other arguments, forces `--local`, and pins the checkout
workdir; never substitute `--linked` or `--db-url`. Supabase provides `auth.users`,
`auth.uid()`, its roles and extension schema; a bare PostgreSQL database is not a
sufficient bootstrap target. `supabase/seed.sql` contains only the exact 43 static
permission UUID/action/subject rows, no user/project/event/key data. Keep seeding
enabled: atomic project bootstrap intentionally fails on an empty catalog.

Copy the **local** API URL and publishable/anon key shown by local Supabase into
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in your
private `.env`; never use a service-role key in client-side configuration. Local recovery callbacks
for en/ru/am are configured; local confirmation/recovery mail is captured in
Inbucket (`http://localhost:54324`). Hosted Auth URLs/templates must be reviewed
separately for the approved deployment origin; this config does not change them.

Baseline provenance: data-free verified public-schema DDL minus later migration
additions; original schemas/fields have `name`, components retain their old type,
and API keys retain their old UUID column until the forward hash-only migration.
April12 owns the component layout FK because its original actions are
unrecoverable. Nonprerequisite `project_count`, `project_role_count` and hosted
`rls_auto_enable` functions are intentionally excluded. All other recoverable
core constraints and defaults are retained. This is a bounded prerequisite
reconstruction, not an exact historical export or current-state squash.

**Clean-install certification is pending:** Docker was unavailable; no migration
chain or SQL regression fixture has been executed. Static/guard tests do not
prove PostgreSQL replay, RLS, triggers, ACLs or concurrency. Future isolated
certification must replay migrations plus seed, inspect final objects/permissions,
and run the reviewed SQL regression artifacts. Never use linked Hotlog as a
substitute for that fresh-install test.

**Hosted development sync (2026-10-24):** forward migrations
`20261004160001` through `20261004160005` are deployed to Hotlog
`mcpsycjnnjmdobrhvstr`. All five SQL regression fixtures passed with their
synthetic changes rolled back; the four existing API keys were retained.
This does not certify fresh installation, concurrent sessions, or browser flows.

## Scripts

| Command               | Description                           |
| --------------------- | ------------------------------------- |
| `yarn dev`            | Start dev server with Turbopack       |
| `yarn build`          | Production build                      |
| `yarn start`          | Start production server (after build) |
| `yarn lint`           | Run ESLint on application sources     |
| `yarn eslint-fix`     | Auto-fix lint issues                  |
| `yarn prettier`       | Format code with Prettier             |
| `yarn prettier-check` | Check formatting                      |
| `yarn test`           | Run isolated Vitest/RTL unit tests    |
| `yarn typecheck`      | TypeScript check without emit         |

## Environment Variables

Managed with `@t3-oss/env-nextjs` + `zod`. Validation fails fast during build/runtime.

Client-side (must be prefixed with `NEXT_PUBLIC_`):

| Variable                               | Required | Description                                                    |
| -------------------------------------- | -------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_CLIENT_WEB_URL`           | Yes      | Base public web URL (e.g. `http://localhost:3001`)             |
| `NEXT_PUBLIC_CLIENT_API_URL`           | Yes      | Base API URL for REST calls                                    |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | Supabase API URL (local: `http://127.0.0.1:54321`)             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Publishable/anon key for the same instance; never service-role |

Server-side:

| Variable   | Required      | Description                   |
| ---------- | ------------- | ----------------------------- |
| `NODE_ENV` | No (defaults) | `development` or `production` |
| `SUPABASE_SERVICE_ROLE_KEY` | Account deletion only | Server-only key for the same Supabase instance; never prefix it with `NEXT_PUBLIC_` or expose it to the browser |

Example `.env.example` (create this if not present):

```env
NEXT_PUBLIC_CLIENT_WEB_URL=http://localhost:3001
NEXT_PUBLIC_CLIENT_API_URL=http://localhost:3001/api
# NODE_ENV is optional
```

## Account settings

Clicking the sidebar account row opens Account, Language, and Projects settings
directly; Log out is available in Account settings. Display
names update the user's Auth `username` metadata; language changes preserve the
current route/query and use a one-year browser locale cookie. Project owners
cannot leave; members can leave with confirmation, and authorized users can
explicitly delete projects. Leave removes only the caller's memberships and
project-scoped role assignments in one database transaction.

Project listing uses the existing RLS-protected tables and permission helper,
so it does not require a new database function. Deploy reviewed
`20261004160005_account_settings.sql` before enabling project leave or account
deletion. It changes the project-owner
Auth foreign key from cascade to **RESTRICT**, so deleting an account cannot
implicitly destroy projects—even if another project is created during deletion.
Account deletion fails closed without the safety RPC/constraint or the server-only
`SUPABASE_SERVICE_ROLE_KEY`. It requires a typed email confirmation and verified
password/social/OTP sign-in within 15 minutes (silent refresh is not reauthentication).
Owned projects must be deleted explicitly first. The privileged Auth client can
only delete the validated current user; it never accepts a user ID from a request.
No application credentials were added. The database migration is deployed to
Hotlog development; account deletion still requires the separately configured
server-only `SUPABASE_SERVICE_ROLE_KEY`.

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
