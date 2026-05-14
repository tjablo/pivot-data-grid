import { useCallback, useState } from 'react';

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

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
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

async function fetchPivotFromApi(orders: RowData[], request: PivotApiRequest, signal?: AbortSignal): Promise<PivotApiResponse> {
  await delay(420, signal);
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

async function fetchDrillDownFromApi(orders: RowData[], request: DrillDownApiRequest, signal?: AbortSignal): Promise<DrillDownApiResponse> {
  await delay(350, signal);
  const filtered = applySourceFilters(orders, request.filters);
  const rows = getDrillDownRows(filtered, request.drillDown);
  return getPagedRows(rows, request.page);
}

export function ServerSidePivotExample({ orders, theme }: ServerSidePivotExampleProps) {
  const [lastExchange, setLastExchange] = useState<ApiExchange | null>(null);

  const loadPivotPage = useCallback(
    async ({
      model,
      filters,
      page,
      signal,
    }: {
      model: PivotModel;
      filters: SourceFilter[];
      page: PaginationState;
      signal: AbortSignal;
    }) => {
      const request: PivotApiRequest = { model, filters, page };
      const response = await fetchPivotFromApi(orders, request, signal);

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

      return {
        result: response.result,
        totalRows: response.page.totalRows,
      };
    },
    [orders],
  );

  const loadDrillDownPage = useCallback(
    async ({
      request,
      filters,
      page,
      signal,
    }: {
      request: DrillDownRequest;
      filters: SourceFilter[];
      page: PaginationState;
      signal: AbortSignal;
    }) => {
      const apiRequest: DrillDownApiRequest = { drillDown: request, filters, page };
      const response = await fetchDrillDownFromApi(orders, apiRequest, signal);

      setLastExchange({
        endpoint: 'GET /api/pivot/drilldown',
        request: apiRequest,
        response: {
          page: response.page,
          rowsReturned: response.rows.length,
        },
      });

      return {
        rows: response.rows,
        totalRows: response.page.totalRows,
      };
    },
    [orders],
  );

  return (
    <>
      <PivotTable
        getPage={loadPivotPage}
        fields={fields}
        defaultPivotModel={defaultPivotModel}
        deferFilterUpdates
        entityName="orders"
        pagination={{
          defaultPageSize: INITIAL_PIVOT_PAGE.pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        drillDown={{
          getPage: loadDrillDownPage,
          pagination: {
            defaultPageSize: INITIAL_DRILL_DOWN_PAGE.pageSize,
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
