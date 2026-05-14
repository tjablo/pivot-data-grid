import { useEffect, useRef, useState } from 'react';
import type { PivotResult, SourceFilter } from '../core/types';
import type { PaginationState, SortState } from './DataGrid.types';
import type { PivotTableGetPage } from './PivotTable.types';

interface UseManagedPivotPageOptions {
  enabled: boolean;
  getPage?: PivotTableGetPage;
  model: Parameters<PivotTableGetPage>[0]['model'];
  filters: SourceFilter[];
  page: PaginationState;
  sort: SortState | null;
}

function isAbortError(error: unknown): boolean {
  return typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
}

export function useManagedPivotPage({ enabled, getPage, model, filters, page, sort }: UseManagedPivotPageOptions): {
  result: PivotResult | null;
  totalRows: number;
  loading: boolean;
} {
  const [result, setResult] = useState<PivotResult | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    if (!enabled || !getPage || !model.rows.length || !model.values.length) {
      requestVersionRef.current += 1;
      setResult(null);
      setTotalRows(0);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    setLoading(true);

    void Promise.resolve(getPage({ model, filters, page, sort, signal: controller.signal }))
      .then((response) => {
        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) return;
        setResult(response.result);
        setTotalRows(response.totalRows);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error) || requestVersionRef.current !== requestVersion) return;
        setResult(null);
        setTotalRows(0);
      })
      .finally(() => {
        if (controller.signal.aborted || requestVersionRef.current !== requestVersion) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [enabled, filters, getPage, model, page, sort]);

  return { result, totalRows, loading };
}
