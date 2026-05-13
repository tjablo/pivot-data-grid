import { useMemo } from 'react';
import type { DrillDownRequest } from '../core/types';
import type { PaginationMode, PaginationState } from './DataGrid.types';
import type { PivotTableDrillDownPaginationOptions, PivotTablePaginationOptions, PivotTableProps } from './PivotTable.types';

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100];

export interface ResolvedPivotPagination {
  enabled: boolean;
  defaultPageSize: number;
  pageSizeOptions: number[];
  mode: PaginationMode;
  state?: PaginationState;
  totalRows?: number;
  onChange?: (state: PaginationState) => void;
}

export interface ResolvedDrillDownPagination {
  enabled: boolean;
  defaultPageSize: number;
  pageSizeOptions: number[];
  mode: PaginationMode;
  state?: PaginationState;
  totalRows?: number;
  onChange?: (state: PaginationState, request: DrillDownRequest) => void;
}

function getPaginationOptions(pagination: boolean | PivotTablePaginationOptions | undefined): PivotTablePaginationOptions {
  if (pagination && typeof pagination === 'object') return pagination;
  return { enabled: pagination ?? true };
}

function getDrillDownPaginationOptions(
  pagination: boolean | PivotTableDrillDownPaginationOptions | undefined,
): PivotTableDrillDownPaginationOptions {
  if (pagination && typeof pagination === 'object') return pagination;
  return { enabled: pagination ?? true };
}

export function usePivotPagination(
  pagination: PivotTableProps['pagination'],
  drillDownPagination: PivotTableDrillDownPaginationOptions | boolean | undefined,
): {
  pivot: ResolvedPivotPagination;
  drillDown: ResolvedDrillDownPagination;
} {
  return useMemo(() => {
    const paginationOptions = getPaginationOptions(pagination);
    const defaultPageSize = paginationOptions.defaultPageSize ?? DEFAULT_PAGE_SIZE;
    const pageSizeOptions = paginationOptions.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
    const enabled = paginationOptions.enabled ?? true;
    const drillDownOptions = getDrillDownPaginationOptions(drillDownPagination);

    return {
      pivot: {
        enabled,
        defaultPageSize,
        pageSizeOptions,
        mode: paginationOptions.mode ?? 'client',
        state: paginationOptions.state,
        totalRows: paginationOptions.totalRows,
        onChange: paginationOptions.onChange,
      },
      drillDown: {
        enabled: drillDownOptions.enabled ?? true,
        defaultPageSize: drillDownOptions.defaultPageSize ?? DEFAULT_PAGE_SIZE,
        pageSizeOptions: drillDownOptions.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
        mode: drillDownOptions.mode ?? 'client',
        state: drillDownOptions.state,
        totalRows: drillDownOptions.totalRows,
        onChange: drillDownOptions.onChange,
      },
    };
  }, [drillDownPagination, pagination]);
}
