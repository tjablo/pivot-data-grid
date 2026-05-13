import { useCallback, useEffect, useRef, useState } from 'react';
import { createDrillDownRequestFromCell, getDrillDownRows } from '../core/drilldown';
import type { DrillDownRequest, PivotModel, PivotResult, PivotRow, RowData, SourceFilter } from '../core/types';
import type { DataGridColumn } from './DataGrid.types';

interface UsePivotDrillDownOptions {
  clientMode: boolean;
  model: PivotModel;
  result: PivotResult | null;
  filteredData: RowData[];
  sourceFilters: SourceFilter[];
  onOpen?: (request: DrillDownRequest) => void;
  onLoad?: (request: DrillDownRequest) => undefined | RowData[] | Promise<RowData[]>;
  controlledRows?: RowData[];
  controlledLoading?: boolean;
}

export function usePivotDrillDown({
  clientMode,
  model,
  result,
  filteredData,
  sourceFilters,
  onOpen,
  onLoad,
  controlledRows,
  controlledLoading,
}: UsePivotDrillDownOptions) {
  const [activeRequest, setActiveRequest] = useState<DrillDownRequest | null>(null);
  const [internalRows, setInternalRows] = useState<RowData[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const requestVersionRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset drilldown whenever the pivot model or filters change.
  useEffect(() => {
    requestVersionRef.current += 1;
    setActiveRequest(null);
    setInternalRows([]);
    setInternalLoading(false);
  }, [model, sourceFilters]);

  const open = useCallback(
    async ({ row, column }: { row: PivotRow; column: DataGridColumn<PivotRow> }) => {
      if (!result) return;
      const request = createDrillDownRequestFromCell(model, result, row, column.id);
      if (!request) return;

      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;
      onOpen?.(request);
      setActiveRequest(request);

      if (clientMode) {
        setInternalRows(getDrillDownRows(filteredData, request));
        return;
      }

      const maybeRows = onLoad?.(request);
      if (maybeRows && typeof (maybeRows as Promise<RowData[]>).then === 'function') {
        setInternalLoading(true);
        try {
          const rows = await (maybeRows as Promise<RowData[]>);
          if (requestVersionRef.current === requestVersion) setInternalRows(rows);
        } finally {
          if (requestVersionRef.current === requestVersion) setInternalLoading(false);
        }
      } else if (Array.isArray(maybeRows)) {
        setInternalRows(maybeRows);
      }
    },
    [clientMode, filteredData, model, onLoad, onOpen, result],
  );

  const close = useCallback(() => {
    requestVersionRef.current += 1;
    setActiveRequest(null);
    setInternalRows([]);
    setInternalLoading(false);
  }, []);

  return {
    activeRequest,
    rows: controlledRows ?? internalRows,
    loading: controlledLoading ?? internalLoading,
    open,
    close,
  };
}
