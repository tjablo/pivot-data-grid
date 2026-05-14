import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDrillDownRequestFromCell, getDrillDownRows } from '../core/drilldown';
import type { DrillDownRequest, PivotModel, PivotResult, PivotRow, RowData, SourceFilter } from '../core/types';
import type { DataGridColumn } from './DataGrid.types';
import { type DrillDownSession, drillDownSessionService } from './drillDownSessionService';
import type { PivotTableDrillDownGetPage } from './PivotTable.types';
import { useManagedPageState } from './useManagedPageState';

interface UsePivotDrillDownOptions {
  clientMode: boolean;
  model: PivotModel;
  result: PivotResult | null;
  filteredData: RowData[];
  sourceFilters: SourceFilter[];
  onOpen?: (request: DrillDownRequest) => void;
  getPage?: PivotTableDrillDownGetPage;
  defaultPageSize: number;
  controlledRows?: RowData[];
  controlledLoading?: boolean;
}

function isAbortError(error: unknown): boolean {
  return typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
}

export function usePivotDrillDown({
  clientMode,
  model,
  result,
  filteredData,
  sourceFilters,
  onOpen,
  getPage,
  defaultPageSize,
  controlledRows,
  controlledLoading,
}: UsePivotDrillDownOptions) {
  const scopeKey = useMemo(() => drillDownSessionService.getScopeKey(model, sourceFilters), [model, sourceFilters]);
  const [session, setSession] = useState<DrillDownSession | null>(null);
  const activeSession = drillDownSessionService.getActive(session, scopeKey);
  const activeRequest = activeSession?.request ?? null;
  const [internalRows, setInternalRows] = useState<RowData[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [managedTotalRows, setManagedTotalRows] = useState(0);
  const {
    page: managedPage,
    sort: managedSort,
    setPage: setManagedPage,
    setSort: setManagedSort,
    reset: resetManagedPage,
  } = useManagedPageState(defaultPageSize);
  const requestVersionRef = useRef(0);
  const hasManagedLoader = Boolean(getPage);

  useEffect(() => {
    if (!getPage || clientMode || !activeRequest) return undefined;

    const controller = new AbortController();
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    setInternalLoading(true);
    setInternalRows([]);

    void Promise.resolve(
      getPage({ request: activeRequest, filters: sourceFilters, page: managedPage, sort: managedSort, signal: controller.signal }),
    )
      .then((response) => {
        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) return;
        setInternalRows(response.rows);
        setManagedTotalRows(response.totalRows);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error) || requestVersionRef.current !== requestVersion) return;
        setInternalRows([]);
        setManagedTotalRows(0);
      })
      .finally(() => {
        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) return;
        setInternalLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeRequest, clientMode, getPage, managedPage, managedSort, sourceFilters]);

  const open = useCallback(
    ({ row, column }: { row: PivotRow; column: DataGridColumn<PivotRow> }) => {
      if (!result) return;
      const request = createDrillDownRequestFromCell(model, result, row, column.id);
      if (!request) return;

      requestVersionRef.current += 1;
      onOpen?.(request);
      setSession(drillDownSessionService.create(scopeKey, request));

      if (clientMode) {
        setInternalRows(getDrillDownRows(filteredData, request));
        setInternalLoading(false);
        return;
      }

      if (getPage) {
        setInternalRows([]);
        setManagedTotalRows(0);
        resetManagedPage();
        return;
      }
    },
    [clientMode, filteredData, getPage, model, onOpen, resetManagedPage, result, scopeKey],
  );

  const close = useCallback(() => {
    requestVersionRef.current += 1;
    setSession(null);
    setInternalRows([]);
    setInternalLoading(false);
    resetManagedPage();
    setManagedTotalRows(0);
  }, [resetManagedPage]);

  return {
    activeRequest,
    rows: activeRequest ? (controlledRows ?? internalRows) : [],
    loading: activeRequest ? (controlledLoading ?? internalLoading) : false,
    managedPagination: hasManagedLoader
      ? {
          state: managedPage,
          totalRows: managedTotalRows,
          onChange: setManagedPage,
        }
      : null,
    sort: hasManagedLoader
      ? {
          state: managedSort,
          onChange: setManagedSort,
        }
      : null,
    open,
    close,
  };
}
