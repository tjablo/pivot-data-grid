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
  amount: number;
  units: number;
  orderedAt: string; // ISO date string used by date filters.
  salesRep: {
    name: string; // Nested fields are addressed with dot paths, e.g. "salesRep.name".
  };
};`;

function getClientPivotCode(theme: ThemeMode) {
  return `import { useMemo } from 'react';
import { PivotTable, type PivotFieldConfig, type PivotModel, type RowData } from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

${dataShapeCode}

export function OrdersPivot({ orders }: { orders: OrderRow[] }) {
  // Keep field metadata stable so toolbar menus do not rebuild on every render.
  const fields = useMemo<PivotFieldConfig[]>(
    () => [
      { field: 'product', label: 'Product', role: 'dimension', type: 'string', copyable: true },
      { field: 'region', label: 'Region', role: 'dimension', type: 'string' },
      { field: 'channel', label: 'Channel', role: 'dimension', type: 'string' },
      { field: 'segment', label: 'Segment', role: 'dimension', type: 'string' },
      { field: 'salesRep.name', label: 'Sales rep', role: 'dimension', type: 'string', copyable: true },
      { field: 'amount', label: 'Amount', role: 'value', type: 'number', valueTone: 'signed' },
      { field: 'units', label: 'Units', role: 'value', type: 'number' },
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
      entityName="orders"
      className="theme-${theme}"
    />
  );
}`;
}

function getServerPivotCode(theme: ThemeMode) {
  return `import { useCallback, useEffect, useState } from 'react';
import {
  PivotTable,
  type DrillDownRequest,
  type PaginationState,
  type PivotFieldConfig,
  type PivotModel,
  type PivotResult,
  type RowData,
  type SourceFilter,
} from 'pivot-grid-table';
import 'pivot-grid-table/styles.css';

${dataShapeCode}

interface OrdersPivotApi {
  loadPivot: (request: {
    model: PivotModel;
    filters: SourceFilter[];
    page: PaginationState;
  }) => Promise<{ result: PivotResult; page: { totalRows: number; totalPages: number } }>;
  loadDrillDown: (request: {
    drillDown: DrillDownRequest;
    filters: SourceFilter[];
    page: PaginationState;
  }) => Promise<{ rows: OrderRow[]; page: { totalRows: number; totalPages: number } }>;
}

const initialModel: PivotModel = {
  rows: ['product'],
  columns: ['region'],
  values: [{ field: 'amount', aggFunc: 'sum' }],
};

export function ServerOrdersPivot({ api, fields }: { api: OrdersPivotApi; fields: PivotFieldConfig[] }) {
  const [pivotModel, setPivotModel] = useState<PivotModel>(initialModel);
  const [filters, setFilters] = useState<SourceFilter[]>([]);
  const [pivotPage, setPivotPage] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const [pivotResult, setPivotResult] = useState<PivotResult | null>(null);
  const [totalPivotRows, setTotalPivotRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeDrillDown, setActiveDrillDown] = useState<DrillDownRequest | null>(null);
  const [drillDownPage, setDrillDownPage] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [drillDownPageRows, setDrillDownPageRows] = useState<RowData[]>([]);
  const [totalDrillDownRows, setTotalDrillDownRows] = useState(0);
  const [isDrillDownFetching, setIsDrillDownFetching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.loadPivot({ model: pivotModel, filters, page: pivotPage }).then(({ result, page }) => {
      if (!cancelled) {
        setPivotResult(result);
        setTotalPivotRows(page.totalRows);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, filters, pivotModel, pivotPage]);

  const openDrillDown = useCallback((request: DrillDownRequest) => {
    setActiveDrillDown(request);
    setDrillDownPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
  }, []);

  useEffect(() => {
    if (!activeDrillDown) return undefined;

    let cancelled = false;
    const request = { drillDown: activeDrillDown, filters, page: drillDownPage };

    setIsDrillDownFetching(true);
    api.loadDrillDown(request).then(({ rows, page }) => {
      if (!cancelled) {
        setDrillDownPageRows(rows);
        setTotalDrillDownRows(page.totalRows);
        setIsDrillDownFetching(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeDrillDown, api, drillDownPage, filters]);

  const changeDrillDownPage = useCallback(
    (state: PaginationState, request: DrillDownRequest) => {
      setActiveDrillDown(request);
      setDrillDownPage(state);
    },
    [],
  );

  const changeModel = useCallback((model: PivotModel) => {
    setPivotModel(model);
    setPivotPage((current) => ({ ...current, pageIndex: 0 }));
    setActiveDrillDown(null);
  }, []);

  const changeFilters = useCallback((nextFilters: SourceFilter[]) => {
    setFilters(nextFilters);
    setPivotPage((current) => ({ ...current, pageIndex: 0 }));
    setActiveDrillDown(null);
  }, []);

  return (
    <PivotTable
      pivotResult={pivotResult}
      fields={fields}
      pivotModel={pivotModel}
      onPivotModelChange={changeModel}
      filters={filters}
      onFiltersChange={changeFilters}
      loading={loading}
      deferFilterUpdates
      pagination={{
        mode: 'server',
        state: pivotPage,
        totalRows: totalPivotRows,
        onChange: setPivotPage,
        pageSizeOptions: [5, 10, 25, 50, 100],
      }}
      drillDown={{
        onOpen: openDrillDown,
        rows: drillDownPageRows,
        loading: isDrillDownFetching,
        pagination: {
          mode: 'server',
          state: drillDownPage,
          totalRows: totalDrillDownRows,
          onChange: changeDrillDownPage,
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
        width: 130,
        align: 'right',
        sortable: true,
        valueTone: 'signed',
        format: (value) => Number(value).toLocaleString('en-US'),
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
