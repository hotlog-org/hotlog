# Codex Agent Playbook

Practical conventions for contributing code in this repo with Codex. Always use reactive pattern for writin react.

## File & folder structure
- **Split by responsibility:**
  - UI markup lives in `*.component.tsx` (no business logic beyond rendering).
  - State/logic/hooks live in matching `*.service.ts` exported as `useXService` and consumed via `const service = useXService(...)`.
  - Interfaces/types live in matching `*.interface.ts` files; never declare component-local types in JSX files.
  - For props interface use the component file
- **Nested features:** place submodules under `src/modules/<feature>/fields/<submodule>` (e.g. `table`, `detail`, `searchbar`). Detail type renderers go in `fields/detail/types/*`.
- **Mock data:** keep temporary mocks in a single `mock-data.ts` inside the module root to keep services type-safe until real APIs land.

## Internationalization
- No hardcoded copy (except mock-data). Pull strings from `messages/en.json` using `useTranslations` and pass the `t` function down through props.
- Keys follow the scope `modules.dashboard.<feature>.*`.

## Components vs. services
- Components only receive props and render; avoid `useMemo`, `useEffect`, data shaping, or translations here.
- Services own state, derived data, side effects, and third-party hooks. Example pattern:

```ts
// feature.service.ts
const useFeatureService = () => {
  const t = useTranslations('modules.dashboard.feature')
  const [state, setState] = useState(...)
  const derived = useMemo(() => ..., [state])
  return { t, state, derived, setState }
}

// feature.component.tsx
export function FeatureComponent() {
  const service = useFeatureService()
  return <UI t={service.t} data={service.derived} />
}
```

## UI libraries
- Prefer shared shadcn-style wrappers under `src/shared/ui` (e.g. `button`, `card`, `menubar`, `field`, `data-table`). If a shadcn primitive is missing, add it to `src/shared/ui` instead of importing directly in modules.
- Inputs use the `Field` pattern: `<Field><FieldLabel /><FieldControl><Input ... /></FieldControl><FieldMessage /></Field>`.
- Menus: use `Menubar`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarItem`, `MenubarSeparator` from `src/shared/ui/menubar`. Keep menus open during multi-step flows by handling `onSelect={e => { e.preventDefault(); ... }}` and controlling `open` in the service.
- Tables: use the shadcn data-table wrapper. Columns are defined in a dedicated service (`events-table.service.tsx`) and consumed by `DataTable` in `fields/table/data-table.component.tsx`. Keep containers flex so tables can stretch to full height.

## Icons
- Use Hugeicons: `import { Heading01Icon } from '@hugeicons/core-free-icons'` and render with `<HugeiconsIcon icon={Heading01Icon} className='size-4' />`.
- Lucide remains acceptable for simple line icons already in use.

## Validation
- Use `zod` for input/filter validation inside services. Surface errors through `FieldMessage` components.

## Navbar extras
- Extra controls (search, filters, chips) mount into the dashboard navbar via the Zustand store `useDashboardNavbarExtra`. Services create the element with `createElement(FeatureExtraComponent, {...})` and clean up on unmount.

## Filtering UX (Events example)
- Single filter entry point (menubar) with multi-step flow: select schema ➜ select field ➜ enter value. Use draft state in the service and keep menu open between steps.
- Show applied filters as chips; indicate per-field filters with a small amber dot in menu lists.

## General styling
- Tailwind utility classes; prefer `className` overrides instead of new bespoke CSS.
- Keep layouts responsive: containers usually `flex flex-col` with `gap-*`; cards stretch with `flex-1`/`h-full` to fill available space.

## How to add a new feature
1) Create `feature.component.tsx`, `feature.service.ts`, `feature.interface.ts` under the module (plus `fields/*` directories as needed).
2) Put all logic, translations, and validation in the service; keep the component purely presentational.
3) Add mock data to `mock-data.ts` if the API is not ready.
4) Use shared shadcn UI parts and Hugeicons for visuals; add new primitives to `src/shared/ui` when necessary.
5) Add copy to `messages/en.json` under `modules.dashboard.<feature>`.

Use these patterns to keep the codebase consistent, testable, and easy to refactor when real data sources arrive.
