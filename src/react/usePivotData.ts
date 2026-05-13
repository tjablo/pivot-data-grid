import { useMemo } from 'react';
import { applySourceFilters } from '../core/filters';
import { pivotData } from '../core/pivot';
import type { PivotModel, PivotResult, RowData, SourceFilter } from '../core/types';

interface UsePivotDataOptions {
  clientMode: boolean;
  sourceData: RowData[];
  sourceFilters: SourceFilter[];
  model: PivotModel;
  serverResult: PivotResult | null | undefined;
}

export function usePivotData({ clientMode, sourceData, sourceFilters, model, serverResult }: UsePivotDataOptions): {
  filteredData: RowData[];
  result: PivotResult | null;
} {
  const filteredData = useMemo(
    () => (clientMode ? applySourceFilters(sourceData, sourceFilters) : []),
    [clientMode, sourceData, sourceFilters],
  );

  const clientResult = useMemo(() => {
    if (!clientMode || !model.rows.length || !model.values.length) return null;
    const result = pivotData(filteredData, model);
    return {
      ...result,
      totalSourceRecords: sourceData.length,
      filteredSourceRecords: filteredData.length,
    };
  }, [clientMode, filteredData, model, sourceData.length]);

  return {
    filteredData,
    result: clientMode ? clientResult : (serverResult ?? null),
  };
}
