# Architecture

## Product Goal

Build an npm-installable React package that works as both a data grid and a pivot table. The package must support frontend-only analytics screens and backend-driven data products where pivoting, filtering, and drilldown are handled by an API.

## Package Shape

- `src/core`: framework-free TypeScript utilities for nested access, field detection, filtering, pivot aggregation, drilldown matching, and backend request contracts.
- `src/react`: React components built on the core contracts.
- `src/styles.css`: default theme using CSS custom properties.
- `src/tailwind-preset.ts`: optional Tailwind token bridge.
- `dist`: ESM, CJS, type declarations, and CSS output for npm.

## Public API

Primary exports:

- `DataGrid`: virtualized generic grid.
- `PivotTable`: controlled/uncontrolled pivot UI.
- `pivotData`: local pivot engine.
- `applySourceFilters`: local source filtering.
- `getDrillDownRows`: local drilldown extraction.
- `createPivotRequest`: serializable backend request helper.
- Default and resolved label exports for UI localization.
- Type exports for `PivotModel`, `PivotResult`, `SourceFilter`, `DrillDownRequest`, value tone configuration, and label overrides.

## Client Mode

Client mode receives raw source rows:

```tsx
<PivotTable data={rows} fields={fields} />
```

The package auto-detects fields when explicit fields are not supplied, applies source filters locally, computes the pivot locally, and opens drill-in rows from the filtered source rows.

## Server Mode

Server mode receives a pre-computed result:

```tsx
<PivotTable
  pivotResult={result}
  fields={fields}
  pivotModel={model}
  onPivotModelChange={setModel}
  filters={filters}
  onFiltersChange={setFilters}
  drillDown={{
    onLoad: loadRows,
  }}
/>
```

The frontend emits `PivotModel`, `SourceFilter[]`, and `DrillDownRequest`. The backend owns query planning, database aggregation, permissions, row limits, and result caching.

## Source Filters

`PivotTable` renders source filters in a toolbar action menu. The menu is presentation only: it edits the same serializable `SourceFilter[]` contract used by client mode and server mode. Client mode applies filters locally with `applySourceFilters`; server mode should send the updated filters to the backend alongside the current `PivotModel`.

Fields marked as `role: 'filter-only'` are kept out of row/value pivot controls but remain available to source filters. When a filter-only field is present, the Add filter action prefers it as the initial filter target. Date fields use the package date picker built on Radix Popover and the existing `between` operator as an inclusive date range (`value` as start, `valueTo` as end). The same `SourceFilter[]` payload can be sent to a backend without UI-specific state.

## Localization

`PivotTable` and `DataGrid` expose a `labels` prop for built-in UI text. Default English labels live in `src/react/labels.ts` and are exported for reuse. Consumers can override only selected keys, including filter operators, aggregation names, aria labels, empty states, and dynamic count formatters. Component render paths should consume labels rather than embedding product text directly.

## Drilldown

The default drill-in view replaces the pivot grid in place and provides a Back action. Metric cells generate a `DrillDownRequest` containing:

- matched row dimension values;
- matched column dimension values when the clicked cell belongs to a pivot column;
- the clicked value field when available.

Client mode filters source rows locally. Server mode scopes all drilldown behavior under `drillDown`: use `drillDown.onLoad` for a loader, or pass controlled `drillDown.rows` and `drillDown.loading` when another data layer owns fetching.

## Virtualization

`DataGrid` virtualizes both rows and columns with TanStack Virtual. Pivot result rows and drilldown rows share the same grid implementation to keep scroll behavior, styling, and accessibility work centralized.

## Sorting And Pagination

Sortable columns cycle through ascending, descending, and unsorted states. The unsorted state does not render a sort icon, which keeps inactive headers visually quiet. `DataGrid` exposes controlled `sortState` / `onSortStateChange` for consumers that need to keep sort state outside the component.

`DataGrid` also owns the shared pagination UI. It supports local pagination by slicing rows, controlled pagination through `paginationState` / `onPaginationChange`, and `paginationMode="server"` for backend-fed pages where the consumer passes already-paged rows plus `totalRows`. `PivotTable` enables pagination by default for pivot and drilldown grids. Use `pagination={false}` for the pivot grid and `drillDown={{ pagination: false }}` for the source-row drilldown grid.

In server mode, `PivotTable` passes backend pagination through to `DataGrid` from scoped objects. Use `pagination.mode: 'server'` when the backend returns only the current page in `PivotResult.rows`; `pagination.totalRows` represents the full number of pivot groups. Use `drillDown.pagination.mode: 'server'` when source-row drilldown pages are fetched independently from pivot-row pages.

## Cell Selection And Copy

`DataGrid` renders data cells as selectable grid cells rather than button elements. `onCellClick` remains available for drill-in behavior, but selecting text should not trigger cell click handling. Consumers can mark a `DataGridColumn` as `copyable` or provide `copyValue` for custom clipboard text. `PivotTable` maps `PivotFieldConfig.copyable` onto generated row and drilldown columns so pivot consumers can opt into copy actions without overriding the internal column renderer.

## Value Tones

Finance metrics often need positive, negative, and neutral visual treatment without hard-coding product colors into React components. `PivotFieldConfig.valueTone` supports serializable modes such as `signed`, which the pivot renderer maps onto generated value and drilldown columns. `DataGridColumn.valueTone` also accepts a resolver function for UI-only rules that depend on the current row or column.

The renderer emits tone classes such as `.pg-grid-cell-tone-positive` and reads `--pg-positive` / `--pg-negative` CSS variables. This keeps backend contracts JSON-safe while allowing host apps to align semantic colors with their design system.

## Frozen Columns

`DataGrid` exposes `frozenColumnCount` for sticky leading columns. It defaults to `0` for generic grid usage. `PivotTable` defaults to `1` so the primary row dimension stays visible during horizontal scrolling; consumers can disable this with `frozenColumnCount={0}` or freeze additional leading columns with a higher value.

## Styling

Runtime styling is plain CSS, scoped under `.pg-root`, and controlled by `--pg-*` variables. This keeps the package usable in projects with Tailwind, CSS Modules, vanilla CSS, CSS-in-JS, or enterprise design systems.

## Roadmap

1. Harden accessibility with roving focus and full WAI-ARIA grid keyboard navigation.
2. Add column resizing and advanced row/column pinning controls.
3. Add multi-row and multi-column group display with expandable hierarchy.
4. Add first-class backend pagination helpers for drilldown query planning.
5. Add E2E visual tests for large datasets and mobile layouts.
6. Add integration guides for Next.js, Vite, and backend SQL query planning.
