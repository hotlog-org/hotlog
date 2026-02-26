# Hotlog Agent Playbook

This file is the local playbook for agents working in `/home/razmik/hotlog`.

It captures conventions for architecture, naming, typing, formatting, and the
project commands for building, linting, and quality checks.

No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` files
exist in this snapshot.

## 1) Commands

Run from repo root.

- `yarn install`
- `yarn dev`
  start dev server.
- `yarn build`
  - run full Next.js build + route compilation.
- `yarn start`
  - run production server.

### Lint/format

- `yarn lint` (Next lint)
- `yarn eslint-check`
- `yarn eslint-fix`
- `yarn prettier`
- `yarn prettier-check`

### Single file checks

- `yarn eslint-check src/modules/events/events.service.ts`
- `yarn prettier-check src/modules/events/events.service.ts`
- `yarn exec tsc --noEmit`

### Tests

- No `test` script is currently defined in `package.json`.
- There is no committed app test suite yet.
- If a runner is added, keep commands as:
  - `yarn test src/modules/<feature>/xxx.test.ts`
  - `yarn vitest path/to/file.test.ts` / `yarn jest path/to/file.test.ts`
  - `yarn playwright test path/to/spec.ts` (e2e)

## 2) Code organization

- `src/modules/*` contains feature modules.
- `src/shared/*` contains cross-module UI/hooks/utils.
- `src/widgets/*` contains composed product-level pieces.

Feature split:

- `*.component.tsx` = presentational UI.
- `*.service.ts` = state + side effects + derived data.
- `*.interface.ts` = shared contracts and exported models.
- `mock-data.ts` = local temporary test data.

Preferred pattern:

- component consumes service via `const service = useXService()`.
- component passes service data/callbacks down, no business logic.

## 3) Imports and module boundaries

- Import order: external, alias (`@/...`), local sibling.
- Prefer named exports; use default only when conventions already use it.
- Use `import type` for type-only usage.
- Avoid cyclic barrel chains and mixing client and server concerns in same module.

## 4) Formatting and lint rules

- Follow `.prettierrc.json`:
  - no semicolons
  - single quotes
  - print width 80
  - trailing commas
  - 2-space indent
- ESLint config enforces:
  - `quotes: single`
  - `semi: never`
  - `prettier/prettier: error`
  - `@typescript-eslint/no-unused-vars` warning
  - `no-console` warning

Keep one export style per file where possible.

## 5) Types and naming

- Prefer strict types and explicit return contracts.
- Use domain interfaces/enums for data shapes and feature contracts.
- Use `z.infer` for zod form payloads.
- Services should expose a typed interface in the same file when shared.

Naming:

- Components: PascalCase (`SchemaComponent`).
- Service hooks: `useXService`.
- Functions: verb-first (`addField`, `removeSchema`, `openEvent`).
- Props: descriptive names (`value`, `onChange`, `onSubmit`) and object keys consistent
  with domain vocabulary.

## 6) Error handling

- Wrap async work in `try / catch / finally`.
- Clear `isLoading` in `finally`.
- Keep user-facing text from stable message keys, not raw exceptions.
- Map transport errors through existing helpers (e.g. `mapErrorToCode`) before surfacing.
- Prefer returning structured result objects in actions:
  - `success: true/false`
  - `error?`
  - `errorCode?`

## 7) i18n and copy

- Use `useTranslations` / translation services for any visible text.
- Keep user strings in locale JSON files.
- New keys should follow feature namespace patterns (`modules.dashboard.<feature>...`).

## 8) Client/server boundaries

- Add `'use client'` only where hooks/browser APIs are needed.
- Keep token/auth/provider setup and server-safe logic in server-compatible modules.
- Do not add client-only side effects in shared server-usable files.

## 9) UI and styling conventions

- Use shared `src/shared/ui/*` components first.
- Keep complex style in Tailwind utility classes.
- For forms, use shared `form` and field wrappers.
- Avoid random per-feature one-off UI primitives when shared alternatives exist.

## 10) Performance and rendering

- Memoize expensive derived arrays with `useMemo`.
- Memoize callbacks passed to deep children with `useCallback`.
- Prefer immutable updates for nested state.
- Keep effects dependency arrays complete.

## 11) Module-specific notes

- `src/app/(web)/[locale]/` is routing/internationalization boundary.
- `src/shared/hooks` should stay generic.
- New utility functions should be exported through `src/shared/utils/index.ts`.
- New shared state should be via feature-local store files, not module-level globals.

## 12) Delivery checklist for agent changes

- Run at least: `yarn lint`, `yarn prettier-check`, `yarn build` before handoff.
- If no tests exist, document that and run targeted runtime verification instead.
- Keep PR diffs scoped to existing conventions and shared component reuse.
- Update this file if conventions change in code or scripts.

## 13) What to avoid

- Business logic in JSX.
- Hardcoded UI copy.
- Silent catch blocks.
- `any` without justification.
- Introducing duplicate shared logic between modules.
