import { useCallback, useEffect, useRef, useState } from 'react';
import { createDrillDownRequestFromCell, getDrillDownRows } from '../core/drilldown';
import type { DrillDownRequest, PivotModel, PivotResult, PivotRow, RowData, SourceFilter } from '../core/types';
import type { DataGridColumn, PaginationState, SortState } from './DataGrid.types';
import type { PivotTableDrillDownGetPage } from './PivotTable.types';

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
  const [activeRequest, setActiveRequest] = useState<DrillDownRequest | null>(null);
  const [internalRows, setInternalRows] = useState<RowData[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [managedPage, setManagedPage] = useState<PaginationState>({ pageIndex: 0, pageSize: defaultPageSize });
  const [managedSort, setManagedSort] = useState<SortState | null>(null);
  const [managedTotalRows, setManagedTotalRows] = useState(0);
  const requestVersionRef = useRef(0);
  const hasManagedLoader = Boolean(getPage);

  useEffect(() => {
    setManagedPage((current) =>
      current.pageSize === defaultPageSize ? current : { pageIndex: current.pageIndex, pageSize: defaultPageSize },
    );
  }, [defaultPageSize]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset drilldown whenever the pivot model or filters change.
  useEffect(() => {
    requestVersionRef.current += 1;
    setActiveRequest(null);
    setInternalRows([]);
    setInternalLoading(false);
    setManagedPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
    setManagedSort(null);
    setManagedTotalRows(0);
  }, [model, sourceFilters]);

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
      setActiveRequest(request);

      if (clientMode) {
        setInternalRows(getDrillDownRows(filteredData, request));
        return;
      }

      if (getPage) {
        setInternalRows([]);
        setManagedTotalRows(0);
        setManagedSort(null);
        setManagedPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
        return;
      }
    },
    [clientMode, filteredData, getPage, model, onOpen, result],
  );

  const close = useCallback(() => {
    requestVersionRef.current += 1;
    setActiveRequest(null);
    setInternalRows([]);
    setInternalLoading(false);
    setManagedPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
    setManagedSort(null);
    setManagedTotalRows(0);
  }, []);

  const changeManagedPage = useCallback((state: PaginationState) => {
    setManagedPage(state);
  }, []);

  const changeManagedSort = useCallback((sort: SortState | null) => {
    setManagedSort(sort);
    setManagedPage((current) => ({ pageIndex: 0, pageSize: current.pageSize }));
  }, []);

  return {
    activeRequest,
    rows: controlledRows ?? internalRows,
    loading: controlledLoading ?? internalLoading,
    managedPagination: hasManagedLoader
      ? {
          state: managedPage,
          totalRows: managedTotalRows,
          onChange: changeManagedPage,
        }
      : null,
    sort: hasManagedLoader
      ? {
          state: managedSort,
          onChange: changeManagedSort,
        }
      : null,
    open,
    close,
  };
}
