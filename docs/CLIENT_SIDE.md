# Client-Side Pivot Mode

Use client-side mode when the browser has all rows needed for the current analysis. `PivotTable` receives raw `data`, applies source filters locally, computes the pivot locally, and opens drilldown rows from the filtered in-memory rows.

```tsx
<PivotTable
  data={orders}
  fields={fields}
  defaultPivotModel={{
    rows: ['product'],
    columns: ['region'],
    values: [{ field: 'amount', aggFunc: 'sum' }],
  }}
  entityName="orders"
/>
```

## When To Use It

Client-side mode is a good fit when:

- the dataset is already in the browser;
- row count is small enough to filter, pivot, sort, and drill into locally;
- the user is exploring a bounded export, report snapshot, or already-authorized slice;
- drilldown should show the exact source rows already present in `data`.

Avoid client-side mode when the source table is large, access-controlled per query, or filtered by backend-only rules. In those cases use server-side mode so the backend owns aggregation, permissions, limits, and query planning.

## Pagination

`PivotTable` enables pagination by default. In client-side mode the grid slices the computed pivot rows in the browser.

```tsx
<PivotTable
  data={orders}
  fields={fields}
  pagination={{
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  }}
/>
```

Use `pagination={false}` only when the pivot result is known to stay small enough to scan without page controls.

## Source Filters

Source filter edits are drafted while the filter action menu is open and applied when the menu closes. In client-side mode this avoids recomputing the pivot for every keystroke while a user is still editing a filter value. Pass `deferFilterUpdates={false}` when immediate local filtering is preferred.

## Multiple Values

`PivotModel.values` can contain more than one value aggregation. The toolbar opens value configuration from a compact `Values` menu so users can add, remove, and edit multiple metrics without expanding the main toolbar.

```tsx
<PivotTable
  data={orders}
  fields={fields}
  defaultPivotModel={{
    rows: ['product'],
    columns: ['region'],
    values: [
      { field: 'amount', aggFunc: 'sum' },
      { field: 'amount', aggFunc: 'min' },
      { field: 'amount', aggFunc: 'avg' },
    ],
  }}
/>
```

When all active values use the same source field, generated metric headers stay compact, for example `AMER (Sum)`, `AMER (Min)`, and `Total (Avg)`. If values use different fields, headers include the field label as well so metrics remain distinguishable.

Each value metric is unique by the pair `{ field, aggFunc }`. Duplicate pairs are normalized away before client aggregation and before managed backend requests.

## Drilldown

Drilldown is automatic in client-side mode. A metric cell creates a `DrillDownRequest`, then the component filters the already-loaded rows by the clicked row and column dimension values.

The drilldown title shows the fixed row and column dimension values, and the drilldown grid omits those same scoped fields from its columns to avoid repeated data.

```tsx
<PivotTable
  data={orders}
  fields={fields}
  drillDown={{
    mode: 'replace', // default; use 'inline' to render below the pivot
    pagination: {
      defaultPageSize: 25,
      pageSizeOptions: [25, 50, 100],
    },
  }}
/>
```

Client-side drilldown should not be combined with a backend-computed pivot unless the client has the complete, authorized source-row cache for the same filters and model. If the backend computes the pivot, prefer server-side drilldown with `drillDown.getPage`.

## Controlled UI State

You can control `pivotModel` and `filters` when the host app needs to sync them with URL state, tabs, saved reports, or external controls.

```tsx
<PivotTable
  data={orders}
  fields={fields}
  pivotModel={model}
  onPivotModelChange={setModel}
  filters={filters}
  onFiltersChange={setFilters}
/>
```
