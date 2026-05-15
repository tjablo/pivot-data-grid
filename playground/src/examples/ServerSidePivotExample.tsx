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
  type SortState,
  type SourceFilter,
} from '../../../src';
import { defaultPivotModel, fields, formatPlaygroundNumber } from '../demoData';
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
  sort: SortState | null;
}

interface PivotApiResponse {
  result: PivotResult;
  page: ApiPageMeta;
}

interface DrillDownApiRequest {
  drillDown: DrillDownRequest;
  filters: SourceFilter[];
  page: ApiPageRequest;
  sort: SortState | null;
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

function compareApiValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  const leftNumber = typeof left === 'number' || typeof left === 'string' ? Number(left) : Number.NaN;
  const rightNumber = typeof right === 'number' || typeof right === 'string' ? Number(right) : Number.NaN;
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function getNestedApiValue(row: RowData, path: string): unknown {
  if (path in row) return row[path];
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as RowData)[segment];
  }, row);
}

function sortApiRows<T extends RowData>(rows: T[], sort: SortState | null): T[] {
  if (!sort) return rows;
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort(
    (left, right) => compareApiValues(getNestedApiValue(left, sort.columnId), getNestedApiValue(right, sort.columnId)) * direction,
  );
}

async function fetchPivotFromApi(orders: RowData[], request: PivotApiRequest, signal?: AbortSignal): Promise<PivotApiResponse> {
  await delay(420, signal);
  const filtered = applySourceFilters(orders, request.filters);
  const fullResult = pivotData(filtered, request.model);
  const sortedRows = sortApiRows(fullResult.rows, request.sort);
  const pagedRows = getPagedRows(sortedRows, request.page);

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
  return getPagedRows(sortApiRows(rows, request.sort), request.page);
}

export function ServerSidePivotExample({ orders, theme }: ServerSidePivotExampleProps) {
  const [lastExchange, setLastExchange] = useState<ApiExchange | null>(null);

  const loadPivotPage = useCallback(
    async ({
      model,
      filters,
      page,
      sort,
      signal,
    }: {
      model: PivotModel;
      filters: SourceFilter[];
      page: PaginationState;
      sort: SortState | null;
      signal: AbortSignal;
    }) => {
      const request: PivotApiRequest = { model, filters, page, sort };
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
      sort,
      signal,
    }: {
      request: DrillDownRequest;
      filters: SourceFilter[];
      page: PaginationState;
      sort: SortState | null;
      signal: AbortSignal;
    }) => {
      const apiRequest: DrillDownApiRequest = { drillDown: request, filters, page, sort };
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
        formatValue={formatPlaygroundNumber}
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
