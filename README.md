# Pivot Grid Table

[![CI](https://github.com/tjablo/pivot-data-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/tjablo/pivot-data-grid/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-92.53%25-brightgreen)](docs/TESTING.md)
[![npm alpha](https://img.shields.io/npm/v/pivot-grid-table/alpha.svg?label=npm%20alpha)](https://www.npmjs.com/package/pivot-grid-table)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React peer](https://img.shields.io/badge/react-%3E%3D18.2%20%3C20-61dafb.svg)](package.json)

Open-source React data grid and pivot table for analytical product screens. It ships a pure TypeScript pivot engine, a virtualized React data grid, client-side and server-side pivot modes, built-in drill-in navigation, and CSS token-based styling that can be aligned with an existing design system.

Live playground: https://pivot-data-grid.vercel.app/

Source repository: https://github.com/tjablo/pivot-data-grid

## Core capabilities

Pivot Grid Table keeps the core data contract portable while providing a practical React UI for analytics and finance workflows:

- Client mode: pass raw rows and compute pivot/filter/drilldown locally.
- Server mode: pass a backend `pivotResult` and use serializable `PivotModel`, `SourceFilter[]`, and `DrillDownRequest` contracts.
- Source filter action menu: users edit filters from a compact toolbar menu while apps keep full control through `filters` and `onFiltersChange`.
- Drill-in navigation: click a metric cell to replace the pivot with matching source rows, then return with Back.
- Virtualized rows and columns via TanStack Virtual.
- Built-in pagination with configurable rows-per-page options.
- Selectable cell text with optional per-column copy buttons.
- Configurable signed value tones for finance metrics.
- Localizable UI labels through the `labels` prop.
- Themeable CSS variables with an optional Tailwind preset.
- MIT-licensed project and permissive runtime dependencies.

## Install

```bash
npm install pivot-grid-table@alpha
```

The first public builds are published on the npm `alpha` dist-tag while the API is still hardening. Switch to `npm install pivot-grid-table` after a stable `latest` release exists.

```tsx
import { PivotTable, type PivotFieldConfig, type PivotModel } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

const fields: PivotFieldConfig[] = [
  { field: 'product', label: 'Product', role: 'dimension', type: 'string', copyable: true },
  { field: 'region', label: 'Region', role: 'dimension', type: 'string' },
  { field: 'amount', label: 'Amount', role: 'value', type: 'number', valueTone: 'signed' },
  { field: 'orderedAt', label: 'Ordered at', role: 'filter-only', type: 'date' },
];

const defaultPivotModel: PivotModel = {
  rows: ['product'],
  columns: ['region'],
  values: [{ field: 'amount', aggFunc: 'sum' }],
};

export function OrdersPivot({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <PivotTable
      data={rows}
      fields={fields}
      defaultPivotModel={defaultPivotModel}
      frozenColumnCount={1}
      entityName="orders"
    />
  );
}
```

`PivotTable` freezes the first visible column by default because row dimensions are usually the primary navigation surface in a pivot. Set `frozenColumnCount={0}` to disable it, or pass a larger number when your layout needs more pinned context. `DataGrid` exposes the same `frozenColumnCount` prop and defaults to `0`.

`PivotTable` enables pagination by default. Configure it with the `pagination` object, or disable it with `pagination={false}`. `DataGrid` exposes the same pagination renderer but leaves it off by default:

```tsx
<DataGrid
  rows={rows}
  columns={columns}
  pagination
/>
```

Use `PivotTable` `pagination.mode: 'client'` when the component should slice rows locally. Use `pagination.mode: 'server'` when your API already returns the current page and the component should use `totalRows` only to render page controls. `DataGrid` exposes the same choice as `paginationMode`.

## Copyable Cells

Cell text is selectable by default. Mark a `DataGrid` column as `copyable` to show a copy icon beside each value:

```tsx
const columns = [
  { id: 'orderId', header: 'Order', accessor: 'orderId', copyable: true },
  {
    id: 'amount',
    header: 'Amount',
    accessor: 'amount',
    copyable: true,
    copyValue: (value) => String(value ?? ''),
  },
];
```

For `PivotTable`, set `copyable: true` on the relevant `PivotFieldConfig`. Generated row and drilldown columns for that field will expose the copy action.

## Value Tones

Use `valueTone: 'signed'` when positive and negative numbers should carry semantic color. `PivotTable` reads this from `PivotFieldConfig` and applies it to generated metric and drilldown columns. `DataGrid` supports the same mode per column:

```tsx
const columns = [
  {
    id: 'pnl',
    header: 'P&L',
    accessor: 'pnl',
    align: 'right',
    valueTone: 'signed',
  },
];
```

For product-specific rules, pass a resolver on `DataGridColumn`:

```tsx
const columns = [
  {
    id: 'risk',
    header: 'Risk',
    accessor: 'riskScore',
    valueTone: ({ value }) => (Number(value) > 0.8 ? 'negative' : 'neutral'),
  },
];
```

Override `--pg-positive` and `--pg-negative` to match your design system without changing component code.

## Filter-Only Fields And Date Ranges

Fields with `role: 'filter-only'` are excluded from row/value selectors but remain available in the source filter menu. This is useful for values such as transaction dates, booking dates, or internal status fields.

```tsx
const fields: PivotFieldConfig[] = [
  { field: 'product', label: 'Product', role: 'dimension', type: 'string' },
  { field: 'amount', label: 'Amount', role: 'value', type: 'number' },
  { field: 'orderedAt', label: 'Ordered at', role: 'filter-only', type: 'date' },
];
```

Date fields use a package date picker built on Radix Popover, not the browser-native date input. Values still use the existing serializable filter shape and inclusive ranges:

```ts
{ id: 'orderedAt-range', field: 'orderedAt', operator: 'between', value: '2026-01-01', valueTo: '2026-01-31' }
```

## Localization

Built-in UI text is configurable through `labels`. Pass only the keys you want to override:

```tsx
<PivotTable
  data={rows}
  fields={fields}
  labels={{
    rowField: 'Wiersze',
    columnField: 'Kolumny',
    valueField: 'Wartość',
    sourceFilters: 'Filtry danych',
    addFilter: 'Dodaj filtr',
    recordCount: (filtered, total, entityName) => `${filtered}/${total} ${entityName}`,
    groupCount: (count) => `${count} grupy`,
  }}
/>
```

## Server Mode

Use the same model and filters as request payloads for your API. The backend returns `PivotResult`; the component renders it without receiving raw source data.
The built-in filter menu edits the same `SourceFilter[]` array that you pass to your backend.

```tsx
const [model, setModel] = useState(defaultPivotModel);
const [filters, setFilters] = useState([]);
const [pivotPage, setPivotPage] = useState({ pageIndex: 0, pageSize: 25 });
const [activeDrillDown, setActiveDrillDown] = useState(null);
const [drillDownPage, setDrillDownPage] = useState({ pageIndex: 0, pageSize: 25 });
const { pivotResult, totalPivotRows, isFetching } = usePivotApi({
  model,
  filters,
  page: pivotPage,
});
const { rows: drillDownPageRows, totalRows: totalDrillDownRows, isFetching: isDrillDownFetching } = useDrillDownApi({
  request: activeDrillDown,
  filters,
  page: drillDownPage,
});

<PivotTable
  pivotResult={pivotResult}
  fields={fields}
  pivotModel={model}
  onPivotModelChange={setModel}
  filters={filters}
  onFiltersChange={setFilters}
  loading={isFetching}
  pagination={{
    mode: 'server',
    state: pivotPage,
    onChange: setPivotPage,
    totalRows: totalPivotRows,
  }}
  drillDown={{
    onOpen: setActiveDrillDown,
    rows: drillDownPageRows,
    loading: isDrillDownFetching,
    pagination: {
      mode: 'server',
      state: drillDownPage,
      totalRows: totalDrillDownRows,
      onChange: (state, request) => {
        setActiveDrillDown(request);
        setDrillDownPage(state);
      },
    },
  }}
  entityName="transactions"
/>;
```

For backend-fed pivot pages, set `pagination.mode` to `server`, return only the current page in `pivotResult.rows`, and pass the total number of pivot groups through `pagination.totalRows`. `PivotTable` will keep the page controls in sync without slicing the already-paged rows again.

## PivotTable Props

`PivotTable` supports client mode with raw `data` and server mode with a backend-computed `pivotResult`. The most important props are grouped by responsibility:

| Prop | Purpose |
| --- | --- |
| `data` | Client-mode source rows. When set, filtering, pivoting, and drilldown run in the browser. |
| `pivotResult` | Server-mode pivot result. In backend pagination, pass only the current page in `pivotResult.rows`. |
| `fields` | Field metadata for labels, roles, filters, copy buttons, value tones, and drilldown columns. Required in server mode. |
| `defaultPivotModel` | Initial uncontrolled pivot model. |
| `pivotModel` / `onPivotModelChange` | Controlled pivot model for apps that keep row/column/value selection in external state. |
| `filters` / `onFiltersChange` | Controlled source filters shared by client and server mode. |
| `pagination` | `false` disables pivot pagination, `true` uses defaults, and an object configures pivot page sizes, controlled state, and backend pagination. |
| `drillDown` | Scoped drilldown behavior: `mode`, `onOpen`, `onLoad`, controlled `rows`, `loading`, and drilldown-only `pagination`. |
| `formatValue` | Numeric pivot-value formatter. |
| `labels` | Overrides built-in text and count formatters. |
| `className` | Theme scope for CSS token overrides. |

Pagination object shape:

```tsx
<PivotTable
  pagination={{
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    mode: 'server',
    state: paginationState,
    totalRows: totalPivotRows,
    onChange: setPaginationState,
  }}
  drillDown={{
    mode: 'replace',
    onOpen: setActiveDrillDown,
    rows: drillDownPageRows,
    loading: isDrillDownFetching,
    pagination: {
      mode: 'server',
      state: drillDownPaginationState,
      totalRows: totalDrillDownRows,
      onChange: (state, request) => fetchDrilldownPage(request, state),
    },
  }}
/>
```

`mode` defaults to `client`. Set it to `server` only when your backend already applied `state.pageIndex` and `state.pageSize` and the component should render the rows exactly as received. `drillDown.pagination` is separate because pivot groups and drilldown source rows are often fetched by different endpoints.

## Styling

The distributed CSS is intentionally plain. Override tokens on a wrapper or on the `className` passed to `PivotTable`:

```css
.finance-grid {
  --pg-accent: var(--brand-primary);
  --pg-bg: var(--app-bg);
  --pg-surface: var(--panel-bg);
  --pg-border: var(--border-subtle);
  --pg-toolbar-bg: var(--panel-muted);
  --pg-positive: var(--success);
  --pg-negative: var(--danger);
  --pg-radius: 6px;
  --pg-font-family: var(--font-sans);
}
```

Optional Tailwind bridge:

```js
import pivotGridPreset from 'pivot-grid-table/tailwind-preset';

export default {
  presets: [pivotGridPreset],
};
```

## Development

```bash
npm install
npm run dev
npm run check
npm run format
npm run typecheck
npm run coverage
npm run build
npm run pack:check
npm run release
```

The local playground runs at `http://127.0.0.1:5173/` and includes client pivot mode, server-like pivot mode, raw virtualized grid mode, and theme switching. The deployed playground is available at https://pivot-data-grid.vercel.app/.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Styling strategy](docs/STYLING.md)
- [Publishing](docs/PUBLISHING.md)
- [Research and license review](docs/RESEARCH.md)
- [Testing strategy](docs/TESTING.md)

## Status

This is an initial alpha package foundation. The public API is usable, but pre-`1.0.0`; expect the roadmap in `docs/ARCHITECTURE.md` to guide hardening around accessibility, column resizing, advanced pinning, and backend pagination.
