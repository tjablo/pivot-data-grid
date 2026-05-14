---
name: pivot-grid-maintainer
description: Maintain the Pivot Grid Table npm package architecture, React effect discipline, tests, styling tokens, backend contracts, virtualization behavior, and publishability. Use when editing this repo's source, docs, package metadata, test strategy, or component API.
---

# Pivot Grid Maintainer

## Guardrails

- Keep the pure pivot engine in `src/core`. React components may import core code, but core code must not import React or browser APIs.
- Preserve client and server modes. Client mode accepts raw rows and computes pivot/filter/drilldown locally; server mode accepts a `pivotResult` and emits model/filter/drilldown requests for backend fetching.
- Keep styling replaceable through `src/styles.css` custom properties prefixed with `--pg-*`. Do not hard-code product colors in components.
- Treat Tailwind as optional integration. Consumers must be able to use the package without Tailwind.
- Keep virtualization in `DataGrid`; pivot UI should reuse `DataGrid` rather than rendering a second grid system.
- Keep dependencies permissive for open source. Before adding a runtime dependency, verify license and document the reason.

## React Effect Discipline

- Use `useEffect` primarily to synchronize with external systems: browser/DOM APIs, observers, timers, subscriptions, imperative third-party instances, and network/API requests with cancellation.
- Do not use effects for pure derivation. Compute render data during render, with `useMemo` only when the computation is meaningfully expensive or reference stability matters.
- Keep core pivot, filter, sorting, pagination, request-building, and drilldown rules outside components. Prefer `src/core` utilities for framework-free logic and focused React hooks for UI state machines.
- When a topic needs several related helpers or owns lifecycle state, extract a cohesive service class or hook instead of growing a component file with many loose functions.
- Avoid prop-to-state mirroring effects unless the state is intentionally local UI state that must resync to external control. Encapsulate that pattern in a named hook and document the reason through names, not comments.
- Keep async loaders in dedicated hooks/services with `AbortController` or equivalent stale-response protection. Components should pass callbacks and render state, not own request orchestration inline.
- Treat `biome-ignore` around hook dependencies as a design smell. Prefer refactoring to stable hooks/services before suppressing dependency checks.

## Required Checks

Run these before considering a change done:

```bash
npm run typecheck
npm run coverage
npm run build
npm run pack:check
```

If a check cannot run because dependencies are missing, install them with `npm install` and rerun the checks.

## API Discipline

- Export stable TypeScript types from `src/index.ts`.
- Prefer additions over breaking prop renames before `1.0.0`, but document planned breaking changes in `docs/ARCHITECTURE.md`.
- Keep backend contracts serializable JSON: `PivotModel`, `SourceFilter[]`, `PivotResult`, and `DrillDownRequest`.
- Add or update tests for each new aggregation, filter operator, drilldown behavior, or public prop.
