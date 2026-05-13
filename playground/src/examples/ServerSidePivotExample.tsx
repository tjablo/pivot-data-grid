import { useCallback, useEffect, useState } from 'react';

import {
  applySourceFilters,
  type DrillDownRequest,
  getDrillDownRows,
  type PaginationState,
  type PivotModel,
  type PivotResult,
  PivotTable,
  pivotData,
  type RowData,
  type SourceFilter,
} from '../../../src';
import { defaultPivotModel, fields } from '../demoData';
import type { ThemeMode } from '../types';

interface ServerSidePivotExampleProps {
  orders: RowData[];
  theme: ThemeMode;
  active: boolean;
}

interface ApiPageRequest {
  pageIndex: number;
  pageSize: number;
}

interface ApiPageMeta extends ApiPageRequest {
  totalRows: number;
  totalPages: number;
}

interface PivotApiRequest {
  model: PivotModel;
  filters: SourceFilter[];
  page: ApiPageRequest;
}

interface PivotApiResponse {
  result: PivotResult;
  page: ApiPageMeta;
}

interface DrillDownApiRequest {
  drillDown: DrillDownRequest;
  filters: SourceFilter[];
  page: ApiPageRequest;
}

interface DrillDownApiResponse {
  rows: RowData[];
  page: ApiPageMeta;
}

interface ApiExchange {
  endpoint: 'GET /api/pivot' | 'GET /api/pivot/drilldown';
  request: PivotApiRequest | DrillDownApiRequest;
  response: {
    page: ApiPageMeta;
    rowsReturned: number;
    totalSourceRecords?: number;
    filteredSourceRecords?: number;
  };
}

const INITIAL_PIVOT_PAGE: PaginationState = { pageIndex: 0, pageSize: 5 };
const INITIAL_DRILL_DOWN_PAGE: PaginationState = { pageIndex: 0, pageSize: 25 };
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getPagedRows<T>(rows: T[], page: ApiPageRequest): { rows: T[]; page: ApiPageMeta } {
  const pageSize = Math.max(1, Math.floor(page.pageSize));
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const pageIndex = Math.min(Math.max(0, Math.floor(page.pageIndex)), totalPages - 1);
  const start = pageIndex * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page: {
      pageIndex,
      pageSize,
      totalRows,
      totalPages,
    },
  };
}

async function fetchPivotFromApi(orders: RowData[], request: PivotApiRequest): Promise<PivotApiResponse> {
  await delay(420);
  const filtered = applySourceFilters(orders, request.filters);
  const fullResult = pivotData(filtered, request.model);
  const pagedRows = getPagedRows(fullResult.rows, request.page);

  return {
    result: {
      ...fullResult,
      rows: pagedRows.rows,
      totalSourceRecords: orders.length,
      filteredSourceRecords: filtered.length,
    },
    page: pagedRows.page,
  };
}

async function fetchDrillDownFromApi(orders: RowData[], request: DrillDownApiRequest): Promise<DrillDownApiResponse> {
  await delay(350);
  const filtered = applySourceFilters(orders, request.filters);
  const rows = getDrillDownRows(filtered, request.drillDown);
  return getPagedRows(rows, request.page);
}

export function ServerSidePivotExample({ orders, theme, active }: ServerSidePivotExampleProps) {
  const [serverModel, setServerModel] = useState<PivotModel>(defaultPivotModel);
  const [serverFilters, setServerFilters] = useState<SourceFilter[]>([]);
  const [pivotPage, setPivotPage] = useState<PaginationState>(INITIAL_PIVOT_PAGE);
  const [pivotResponse, setPivotResponse] = useState<PivotApiResponse | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [activeDrillDown, setActiveDrillDown] = useState<DrillDownRequest | null>(null);
  const [drillDownPage, setDrillDownPage] = useState<PaginationState>(INITIAL_DRILL_DOWN_PAGE);
  const [drillDownResponse, setDrillDownResponse] = useState<DrillDownApiResponse | null>(null);
  const [isDrillDownFetching, setIsDrillDownFetching] = useState(false);
  const [lastExchange, setLastExchange] = useState<ApiExchange | null>(null);

  const updateServerModel = useCallback((model: PivotModel) => {
    setServerModel(model);
    setPivotPage((current) => ({ ...current, pageIndex: 0 }));
    setActiveDrillDown(null);
    setDrillDownResponse(null);
  }, []);

  const updateServerFilters = useCallback((filters: SourceFilter[]) => {
    setServerFilters(filters);
    setPivotPage((current) => ({ ...current, pageIndex: 0 }));
    setActiveDrillDown(null);
    setDrillDownResponse(null);
  }, []);

  const openServerDrillDown = useCallback((request: DrillDownRequest) => {
    setActiveDrillDown(request);
    setDrillDownPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
    setDrillDownResponse(null);
  }, []);

  const changeDrillDownPage = useCallback((state: PaginationState, request: DrillDownRequest) => {
    setActiveDrillDown(request);
    setDrillDownPage(state);
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    const request: PivotApiRequest = {
      model: serverModel,
      filters: serverFilters,
      page: pivotPage,
    };

    setServerLoading(true);
    fetchPivotFromApi(orders, request).then((response) => {
      if (cancelled) return;
      setPivotResponse(response);
      setServerLoading(false);
      setLastExchange({
        endpoint: 'GET /api/pivot',
        request,
        response: {
          page: response.page,
          rowsReturned: response.result.rows.length,
          totalSourceRecords: response.result.totalSourceRecords,
          filteredSourceRecords: response.result.filteredSourceRecords,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, orders, pivotPage, serverFilters, serverModel]);

  useEffect(() => {
    if (!active || !activeDrillDown) return undefined;

    let cancelled = false;
    const request: DrillDownApiRequest = {
      drillDown: activeDrillDown,
      filters: serverFilters,
      page: drillDownPage,
    };

    setIsDrillDownFetching(true);
    fetchDrillDownFromApi(orders, request).then((response) => {
      if (cancelled) return;
      setDrillDownResponse(response);
      setIsDrillDownFetching(false);
      setLastExchange({
        endpoint: 'GET /api/pivot/drilldown',
        request,
        response: {
          page: response.page,
          rowsReturned: response.rows.length,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [active, activeDrillDown, drillDownPage, orders, serverFilters]);

  return (
    <>
      <PivotTable
        pivotResult={pivotResponse?.result ?? null}
        fields={fields}
        pivotModel={serverModel}
        onPivotModelChange={updateServerModel}
        filters={serverFilters}
        onFiltersChange={updateServerFilters}
        loading={serverLoading}
        deferFilterUpdates
        entityName="orders"
        pagination={{
          mode: 'server',
          state: pivotPage,
          totalRows: pivotResponse?.page.totalRows ?? 0,
          onChange: setPivotPage,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        drillDown={{
          onOpen: openServerDrillDown,
          rows: drillDownResponse?.rows ?? [],
          loading: isDrillDownFetching,
          pagination: {
            mode: 'server',
            state: drillDownPage,
            totalRows: drillDownResponse?.page.totalRows ?? 0,
            onChange: changeDrillDownPage,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          },
        }}
        className={`theme-${theme}`}
      />

      {lastExchange ? (
        <section className="api-debug-panel" aria-label="Server API simulation">
          <div className="api-debug-header">
            <div>
              <span className="api-debug-kicker">Server API simulation</span>
              <h2>{lastExchange.endpoint}</h2>
            </div>
            <span className="api-debug-pill">
              page {lastExchange.response.page.pageIndex + 1} / {lastExchange.response.page.totalPages}
            </span>
          </div>
          <div className="api-debug-grid">
            <div>
              <span>Request payload</span>
              <pre>{JSON.stringify(lastExchange.request, null, 2)}</pre>
            </div>
            <div>
              <span>Response paging</span>
              <pre>{JSON.stringify(lastExchange.response, null, 2)}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
