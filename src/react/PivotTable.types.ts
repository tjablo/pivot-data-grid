import type { DrillDownRequest, PivotFieldConfig, PivotModel, PivotResult, RowData, SourceFilter } from '../core/types';
import type { PaginationMode, PaginationState } from './DataGrid.types';
import type { PivotTableLabelOverrides } from './labels';

export type PivotTablePaginationMode = PaginationMode;

export interface PivotTableDrillDownPaginationOptions {
  /** Enables pagination for the drilldown source-row grid. Defaults to true. */
  enabled?: boolean;
  /** Initial page size for uncontrolled drilldown pagination. */
  defaultPageSize?: number;
  /** Page-size choices shown in the drilldown pagination control. */
  pageSizeOptions?: number[];
  /**
   * Controls where drilldown pagination is applied.
   * `client` slices the loaded drilldown rows locally.
   * `server` expects `drillDown.rows` to contain only the current page and uses `totalRows` for page count.
   */
  mode?: PivotTablePaginationMode;
  /** Controlled drilldown pagination state. Use with `onChange` for backend fetching. */
  state?: PaginationState;
  /** Total source rows matching the active drilldown request when `mode` is `server`. */
  totalRows?: number;
  /** Called when the user changes drilldown page or page size. Receives the active drilldown request. */
  onChange?: (state: PaginationState, request: DrillDownRequest) => void;
}

export interface PivotTablePaginationOptions {
  /** Enables pagination for the pivot grid. Defaults to true. */
  enabled?: boolean;
  /** Initial page size for uncontrolled pivot pagination. */
  defaultPageSize?: number;
  /** Page-size choices shown in the pivot pagination control. */
  pageSizeOptions?: number[];
  /**
   * Controls where pivot pagination is applied.
   * `client` slices the computed pivot rows locally.
   * `server` expects `pivotResult.rows` to contain only the current page and uses `totalRows` for page count.
   */
  mode?: PivotTablePaginationMode;
  /** Controlled pivot pagination state. Use with `onChange` for backend fetching. */
  state?: PaginationState;
  /** Total pivot groups available on the backend when `mode` is `server`. */
  totalRows?: number;
  /** Called when the user changes pivot page or page size. */
  onChange?: (state: PaginationState) => void;
}

export interface PivotTableDrillDownOptions {
  /** Determines whether drilldown replaces the pivot, renders below it, or is disabled. */
  mode?: 'replace' | 'inline' | 'none';
  /** Called when a metric cell creates a drilldown request, before rows are loaded. */
  onOpen?: (request: DrillDownRequest) => void;
  /** Server-mode drilldown loader. Return rows synchronously, asynchronously, or manage rows with `rows`. */
  onLoad?: (request: DrillDownRequest) => undefined | RowData[] | Promise<RowData[]>;
  /** Controlled drilldown rows, usually supplied after `onLoad` fetches from a backend. */
  rows?: RowData[];
  /** Loading state for controlled drilldown rows. */
  loading?: boolean;
  /** Pagination settings for the drilldown source-row grid. */
  pagination?: boolean | PivotTableDrillDownPaginationOptions;
}

interface PivotTableBaseProps {
  /** Shows a loading state over the pivot grid while external data is being fetched. */
  loading?: boolean;
  /** Initial pivot model for uncontrolled usage. Ignored when `pivotModel` is controlled. */
  defaultPivotModel?: PivotModel;
  /** Controlled pivot model containing row fields, column fields, and value aggregations. */
  pivotModel?: PivotModel;
  /** Called when toolbar controls change the pivot model. */
  onPivotModelChange?: (model: PivotModel) => void;
  /** Controlled source filters shared by client and server mode. */
  filters?: SourceFilter[];
  /** Called when the source filter menu changes filters. */
  onFiltersChange?: (filters: SourceFilter[]) => void;
  /** Entity label used in record-count text. */
  entityName?: string;
  /** Formats numeric pivot values. Receives the numeric value and generated pivot column id. */
  formatValue?: (value: number | null, columnId: string) => string;
  /** Keeps filter input edits local until the user applies them from the filter menu. */
  deferFilterUpdates?: boolean;
  /** Additional class applied to the `.pg-root` wrapper for theme scoping. */
  className?: string;
  /** Height of the pivot or replace-mode drilldown grid. */
  height?: number | string;
  /** Scoped drilldown behavior, loading rows, and drilldown pagination. */
  drillDown?: PivotTableDrillDownOptions;
  /** Number of leading columns pinned while scrolling horizontally. */
  frozenColumnCount?: number;
  /** Pagination settings. Pass `false` to disable, `true` for defaults, or an object for controlled/backend pagination. */
  pagination?: boolean | PivotTablePaginationOptions;
  /** Overrides built-in UI labels and count formatters. */
  labels?: PivotTableLabelOverrides;
}

export interface PivotTableClientProps extends PivotTableBaseProps {
  /** Raw source rows. When present, `PivotTable` runs filtering, pivoting, and drilldown locally. */
  data: RowData[];
  pivotResult?: never;
  /** Optional field metadata. If omitted, fields are inferred from `data`. */
  fields?: PivotFieldConfig[];
}

export interface PivotTableServerProps extends PivotTableBaseProps {
  data?: never;
  /** Backend-computed pivot result. In server pagination mode, `rows` should contain only the current page. */
  pivotResult: PivotResult | null | undefined;
  /** Field metadata required for toolbar labels, roles, filters, and drilldown columns. */
  fields: PivotFieldConfig[];
}

export type PivotTableProps = PivotTableClientProps | PivotTableServerProps;
