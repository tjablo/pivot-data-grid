# Server-Side Pivot Mode

Use server-side mode when the backend owns aggregation, permissions, row limits, or query planning. The frontend still owns the UI model: `PivotModel`, `SourceFilter[]`, pagination state, sort state, and `DrillDownRequest` are serializable payloads that can be sent to an API.

There are two server-side styles:

- managed loaders with `getPage`: recommended for normal backend pagination;
- controlled props with `pivotResult`, `rows`, `loading`, and `pagination.onChange`: an escape hatch for React Query, Redux, URL-driven state, or existing data layers.

## Recommended: Managed `getPage`

`getPage` is the shortest path for backend pagination. `PivotTable` calls it on initial load, pivot model changes, source filter changes, page changes, page-size changes, and server sort changes.

```tsx
<PivotTable
  fields={fields}
  defaultPivotModel={{
    rows: ['product'],
    columns: ['region'],
    values: [{ field: 'amount', aggFunc: 'sum' }],
  }}
  getPage={async ({ model, filters, page, sort, signal }) => {
    const response = await api.fetchPivot({
      model,
      filters,
      sort,
      pageIndex: page.pageIndex,
      pageSize: page.pageSize,
      signal,
    });

    return {
      result: response.pivotResult,
      totalRows: response.totalPivotGroups,
    };
  }}
  pagination={{
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  }}
/>
```

`page.pageIndex` is zero-based. The UI displays one-based page labels. Return `totalRows`, not only `totalPages`, so the grid can calculate page count after page-size changes and render accurate record counts.

The `signal` is an `AbortSignal`. Pass it to `fetch` or your request layer. `PivotTable` also ignores stale responses, so fast page changes or model changes cannot overwrite newer data.

Source filter edits are drafted while the filter action menu is open. `getPage` receives the new `filters` only after the menu closes, so typing in a text filter or date range does not fire a request per keystroke. Set `deferFilterUpdates={false}` to opt back into immediate filter updates.

While the first backend page is loading, `PivotTable` renders skeleton rows using fallback columns derived from the current pivot model. The grid no longer appears empty just because `pivotResult` has not arrived yet.

## Backend Drilldown Pagination

Use `drillDown.getPage` when source rows for a clicked pivot cell are fetched page by page.

```tsx
<PivotTable
  fields={fields}
  getPage={loadPivotPage}
  drillDown={{
    getPage: async ({ request, filters, page, sort, signal }) => {
      const response = await api.fetchPivotDrilldown({
        rowValues: request.rowValues,
        columnValues: request.columnValues,
        valueField: request.valueField,
        filters,
        sort,
        pageIndex: page.pageIndex,
        pageSize: page.pageSize,
        signal,
      });

      return {
        rows: response.data,
        totalRows: response.totalRows,
      };
    },
    pagination: {
      defaultPageSize: 25,
      pageSizeOptions: [25, 50, 100],
    },
  }}
/>
```

Use `request.rowValues` and `request.columnValues` for query scope. They carry the full multi-dimensional pivot selection and are the only drilldown scope fields exposed by the package.

`drillDown.onOpen` is only a notification hook for controlled flows. It does not load rows by itself; use `drillDown.getPage` for managed backend drilldown fetching or `drillDown.rows` with controlled pagination when an external data layer owns the request.

## Sorting

Managed server mode treats sorting as backend-owned. When a user clicks a sortable header, `getPage` receives `sort` and the component resets to page `0`. The grid renders rows exactly as returned by the backend.

This avoids the common bug where a server-paginated grid sorts only the current page in the browser.

## Controlled Server Mode

Use controlled server mode when another data layer already owns loading, caching, retries, URL state, or optimistic updates.

```tsx
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
    totalRows: totalPivotRows,
    onChange: setPivotPage,
  }}
  drillDown={{
    rows: drillDownRows,
    loading: isDrillDownFetching,
    pagination: {
      mode: 'server',
      state: drillDownPage,
      totalRows: totalDrillDownRows,
      onChange: (nextPage, request) => {
        setActiveDrillDown(request);
        setDrillDownPage(nextPage);
      },
    },
  }}
/>
```

In controlled mode, the host app must handle page resets, loading state, cancellation, and stale responses. That is intentional: controlled mode exists for apps that need full ownership of data fetching.

## Choosing A Mode

Use `data` when all source rows are already in the browser and local drilldown is correct.

Use root `getPage` when the backend should fetch pivot pages and the component can own loading, page state, sort state, and stale-response protection.

Use `drillDown.getPage` when a backend should fetch source rows for clicked pivot cells page by page.

Use `pivotResult` plus controlled pagination when your app already has a data layer that must remain the source of truth.
