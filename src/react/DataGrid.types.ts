import type { CSSProperties, ReactNode } from 'react';
import type { RowData, ValueToneMode } from '../core/types';
import type { DataGridLabelOverrides } from './labels';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export type SortMode = 'client' | 'server';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export type PaginationMode = 'client' | 'server';

export type DataGridCellTone = 'positive' | 'negative' | 'neutral';

export type DataGridValueToneResolver<T extends RowData = RowData> = (args: {
  value: unknown;
  row: T;
  column: DataGridColumn<T>;
}) => DataGridCellTone | null | undefined;

export type DataGridValueTone<T extends RowData = RowData> = ValueToneMode | DataGridValueToneResolver<T>;

export interface DataGridColumn<T extends RowData = RowData> {
  id: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T) => unknown);
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  format?: (value: unknown, row: T) => ReactNode;
  cell?: (row: T) => ReactNode;
  copyable?: boolean;
  copyValue?: (value: unknown, row: T) => string;
  valueTone?: DataGridValueTone<T>;
}

export interface DataGridProps<T extends RowData = RowData> {
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId?: (row: T, index: number) => string | number;
  height?: number | string;
  rowHeight?: number;
  headerHeight?: number;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  loading?: boolean;
  emptyMessage?: ReactNode;
  showColumnMenu?: boolean;
  initialHiddenColumnIds?: string[];
  sortState?: SortState | null;
  onSortStateChange?: (sortState: SortState | null) => void;
  /**
   * Controls where sorting is applied.
   * `client` sorts the rows passed to the grid.
   * `server` updates sort state and renders the rows exactly as received.
   */
  sortMode?: SortMode;
  onCellClick?: (args: { row: T; rowIndex: number; column: DataGridColumn<T>; value: unknown }) => void;
  toolbarContent?: ReactNode;
  skeletonRowCount?: number;
  frozenColumnCount?: number;
  pagination?: boolean;
  paginationState?: PaginationState;
  defaultPaginationState?: Partial<PaginationState>;
  pageSizeOptions?: number[];
  /**
   * Controls where pagination is applied.
   * `client` slices the rows passed to the grid.
   * `server` renders the rows as the current page and uses `totalRows` for page count.
   */
  paginationMode?: PaginationMode;
  totalRows?: number;
  onPaginationChange?: (state: PaginationState) => void;
  labels?: DataGridLabelOverrides;
}
