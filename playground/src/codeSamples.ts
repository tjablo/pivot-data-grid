import type { ThemeMode, ViewMode } from './types';

export const themeCode: Record<ThemeMode, string> = {
  default: `.theme-default {
  --pg-bg: #f3f4f6;
  --pg-surface: #ffffff;
  --pg-surface-raised: #ffffff;
  --pg-border: #d7dce2;
  --pg-border-strong: #aeb6c0;
  --pg-text: #1f2328;
  --pg-muted: #667085;
  --pg-accent: #4b5563;
  --pg-accent-strong: #242b35;
  --pg-accent-weak: #eceff3;
  --pg-row-hover: #eef1f4;
  --pg-header-bg: #f0f2f5;
  --pg-toolbar-bg: #ffffff;
  --pg-radius: 10px;
  --pg-shadow: 0 18px 46px rgb(31 35 40 / 10%);
}`,
  finance: `.theme-finance {
  --pg-bg: #f1f3f5;
  --pg-surface: #ffffff;
  --pg-surface-raised: #fbfcfd;
  --pg-border: #d2d7de;
  --pg-border-strong: #9fa8b3;
  --pg-text: #181d24;
  --pg-muted: #64707d;
  --pg-accent: #59636f;
  --pg-accent-strong: #28313c;
  --pg-accent-weak: #e8ebef;
  --pg-row-hover: #e9edf1;
  --pg-header-bg: #e4e8ed;
  --pg-toolbar-bg: #ffffff;
  --pg-radius: 6px;
  --pg-shadow: 0 14px 36px rgb(31 41 55 / 12%);
}`,
  dark: `.theme-dark {
  --pg-bg: #101418;
  --pg-surface: #171d24;
  --pg-surface-raised: #1d2530;
  --pg-border: #303a46;
  --pg-border-strong: #526071;
  --pg-text: #f4f7fb;
  --pg-muted: #a5b2c1;
  --pg-accent: #7dd3fc;
  --pg-accent-strong: #e6edf3;
  --pg-accent-weak: #193344;
  --pg-row-hover: #202a36;
  --pg-header-bg: #202833;
  --pg-toolbar-bg: #151b22;
  --pg-positive: #74d6a0;
  --pg-negative: #ff8a80;
  --pg-shadow: 0 18px 42px rgb(0 0 0 / 32%);
}`,
};

const dataShapeCode = `type OrderRow = RowData & {
  id: string;
  product: string;
  region: 'AMER' | 'EMEA' | 'APAC' | 'LATAM';
  channel: string;
  segment: string;
  amount: number; // Some sample rows use million-scale decimals with 8 fractional digits.
  units: number;
  orderedAt: string; // ISO date string used by date filters.
  salesRep: {
    name: string; // Nested fields are addressed with dot paths, e.g. "salesRep.name".
  };
};`;

const formatNumberCode = `function formatNumber(value: unknown): string {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  const hasFraction = !Number.isInteger(numericValue);
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 8 : 0,
    maximumFractionDigits: hasFraction ? 8 : 0,
  });
}`;

function getClientPivotCode(theme: ThemeMode) {
  return `import { useMemo } from 'react';
import { Globe2, Package } from 'lucide-react';
import { PivotTable, type PivotTableFieldConfig, type PivotModel, type RowData } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

${dataShapeCode}

${formatNumberCode}

export function OrdersPivot({ orders }: { orders: OrderRow[] }) {
  // Keep field metadata stable so toolbar menus do not rebuild on every render.
  const fields = useMemo<PivotTableFieldConfig[]>(
    () => [
      {
        field: 'product',
        label: 'Product',
        role: 'dimension',
        type: 'string',
        copyable: true,
        renderFieldCell: ({ value, location }) => (
          <span className="field-chip" data-location={location}>
            <Package aria-hidden />
            {String(value)}
          </span>
        ),
      },
      {
        field: 'region',
        label: 'Region',
        role: 'dimension',
        type: 'string',
        renderFieldCell: ({ value, location }) => (
          <span className="field-chip" data-location={location}>
            <Globe2 aria-hidden />
            {String(value)}
          </span>
        ),
      },
      { field: 'channel', label: 'Channel', role: 'dimension', type: 'string' },
      { field: 'segment', label: 'Segment', role: 'dimension', type: 'string' },
      { field: 'salesRep.name', label: 'Sales rep', role: 'dimension', type: 'string', copyable: true },
      { field: 'amount', label: 'Amount', role: 'value', type: 'number', copyable: true, valueTone: 'signed' },
      { field: 'units', label: 'Units', role: 'value', type: 'number', copyable: true },
      { field: 'orderedAt', label: 'Ordered at', role: 'filter-only', type: 'date' },
    ],
    [],
  );

  const defaultPivotModel = useMemo<PivotModel>(
    () => ({
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    }),
    [],
  );

  return (
    <PivotTable
      data={orders} // Client mode receives raw rows and pivots/filter/drilldown locally.
      fields={fields}
      defaultPivotModel={defaultPivotModel}
      formatValue={formatNumber}
      entityName="orders"
      className="theme-${theme}"
    />
  );
}`;
}

function getServerPivotCode(theme: ThemeMode) {
  return `import { useCallback } from 'react';
import { PivotTable, type DrillDownRequest, type PaginationState, type PivotFieldConfig, type PivotModel, type PivotResult, type SourceFilter, type SortState } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

${dataShapeCode}

${formatNumberCode}

interface OrdersPivotApi {
  loadPivot: (request: {
    model: PivotModel;
    filters: SourceFilter[];
    page: PaginationState;
    sort: SortState | null;
    signal: AbortSignal;
  }) => Promise<{ result: PivotResult; totalRows: number }>;
  loadDrillDown: (request: {
    drillDown: DrillDownRequest;
    filters: SourceFilter[];
    page: PaginationState;
    sort: SortState | null;
    signal: AbortSignal;
  }) => Promise<{ rows: OrderRow[]; totalRows: number }>;
}

const initialModel: PivotModel = {
  rows: ['product'],
  columns: ['region'],
  values: [{ field: 'amount', aggFunc: 'sum' }],
};

export function ServerOrdersPivot({ api, fields }: { api: OrdersPivotApi; fields: PivotFieldConfig[] }) {
  const loadPivotPage = useCallback(
    ({ model, filters, page, sort, signal }: { model: PivotModel; filters: SourceFilter[]; page: PaginationState; sort: SortState | null; signal: AbortSignal }) =>
      api.loadPivot({ model, filters, page, sort, signal }),
    [api],
  );

  const loadDrillDownPage = useCallback(
    ({
      request,
      filters,
      page,
      sort,
      signal,
    }: {
      request: DrillDownRequest;
      filters: SourceFilter[];
      page: PaginationState;
      sort: SortState | null;
      signal: AbortSignal;
    }) => api.loadDrillDown({ drillDown: request, filters, page, sort, signal }),
    [api],
  );

  return (
    <PivotTable
      getPage={loadPivotPage}
      fields={fields}
      defaultPivotModel={initialModel}
      deferFilterUpdates
      formatValue={formatNumber}
      pagination={{
        defaultPageSize: 5,
        pageSizeOptions: [5, 10, 25, 50, 100],
      }}
      drillDown={{
        getPage: loadDrillDownPage,
        pagination: {
          defaultPageSize: 25,
          pageSizeOptions: [5, 10, 25, 50, 100],
        },
      }}
      entityName="orders"
      className="theme-${theme}"
    />
  );
}`;
}

function getDataGridCode(theme: ThemeMode) {
  return `import { useMemo } from 'react';
import { DataGrid, type DataGridColumn, type RowData } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

${dataShapeCode}

${formatNumberCode}

export function OrdersGrid({ orders }: { orders: OrderRow[] }) {
  // DataGrid is the lower-level grid used by PivotTable; define columns directly here.
  const columns = useMemo<DataGridColumn<OrderRow>[]>(
    () => [
      { id: 'id', header: 'Order', accessor: 'id', width: 120, sortable: true, copyable: true },
      { id: 'product', header: 'Product', accessor: 'product', width: 160, sortable: true, copyable: true },
      { id: 'region', header: 'Region', accessor: 'region', width: 110, sortable: true },
      { id: 'channel', header: 'Channel', accessor: 'channel', width: 150, sortable: true },
      { id: 'salesRep.name', header: 'Sales rep', accessor: (row) => row.salesRep.name, width: 150, sortable: true },
      {
        id: 'amount',
        header: 'Amount',
        accessor: 'amount',
        width: 190,
        align: 'right',
        sortable: true,
        copyable: true,
        valueTone: 'signed',
        format: formatNumber,
      },
    ],
    [],
  );

  return (
    <div className="pg-root raw-grid-shell theme-${theme}">
      <DataGrid
        rows={orders}
        columns={columns}
        getRowId={(row) => row.id}
        height={640}
        pagination
      />
    </div>
  );
}`;
}

export function getUsageCode(view: ViewMode, theme: ThemeMode) {
  if (view === 'server') return getServerPivotCode(theme);
  if (view === 'grid') return getDataGridCode(theme);
  return getClientPivotCode(theme);
}
