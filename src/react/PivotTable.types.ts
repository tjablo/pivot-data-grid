import type { DrillDownRequest, PivotFieldConfig, PivotModel, PivotResult, RowData, SourceFilter } from '../core/types';
import type { PaginationMode, PaginationState, SortState } from './DataGrid.types';
import type { PivotTableLabelOverrides } from './labels';

export type PivotTablePaginationMode = PaginationMode;

export interface PivotTableManagedPaginationOptions {
  /** Enables the managed backend pagination control. Defaults to true. */
  enabled?: boolean;
  /** Initial page size for managed backend pagination. */
  defaultPageSize?: number;
  /** Page-size choices shown in the pagination control. */
  pageSizeOptions?: number[];
}

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

export interface PivotTableGetPageArgs {
  model: PivotModel;
  filters: SourceFilter[];
  /** Zero-based page state. UI labels render this as one-based page numbers. */
  page: PaginationState;
  sort: SortState | null;
  signal: AbortSignal;
}

export interface PivotTableGetPageResult {
  result: PivotResult;
  /** Total backend pivot groups matching the current model and filters. */
  totalRows: number;
}

export type PivotTableGetPage = (args: PivotTableGetPageArgs) => PivotTableGetPageResult | Promise<PivotTableGetPageResult>;

export interface PivotTableDrillDownGetPageArgs {
  request: DrillDownRequest;
  filters: SourceFilter[];
  /** Zero-based page state. UI labels render this as one-based page numbers. */
  page: PaginationState;
  sort: SortState | null;
  signal: AbortSignal;
}

export interface PivotTableDrillDownGetPageResult {
  rows: RowData[];
  /** Total source rows matching the active drilldown request. */
  totalRows: number;
}

export type PivotTableDrillDownGetPage = (
  args: PivotTableDrillDownGetPageArgs,
) => PivotTableDrillDownGetPageResult | Promise<PivotTableDrillDownGetPageResult>;

interface PivotTableDrillDownBaseOptions {
  /** Determines whether drilldown replaces the pivot, renders below it, or is disabled. */
  mode?: 'replace' | 'inline' | 'none';
  /** Called when a metric cell creates a drilldown request, before rows are loaded. */
  onOpen?: (request: DrillDownRequest) => void;
}

export interface PivotTableDrillDownManagedOptions extends PivotTableDrillDownBaseOptions {
  /** Managed backend drilldown loader. Called on open, page changes, page-size changes, and sort changes. */
  getPage: PivotTableDrillDownGetPage;
  rows?: never;
  loading?: never;
  /** Pagination settings for the managed drilldown source-row grid. */
  pagination?: boolean | PivotTableManagedPaginationOptions;
}

export interface PivotTableDrillDownControlledOptions extends PivotTableDrillDownBaseOptions {
  getPage?: never;
  /** Controlled drilldown rows, usually supplied by an external data layer. */
  rows?: RowData[];
  /** Loading state for controlled drilldown rows. */
  loading?: boolean;
  /** Pagination settings for the drilldown source-row grid. */
  pagination?: boolean | PivotTableDrillDownPaginationOptions;
}

export type PivotTableDrillDownOptions = PivotTableDrillDownManagedOptions | PivotTableDrillDownControlledOptions;

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
  /** Keeps filter menu edits local until the menu closes. Defaults to true. */
  deferFilterUpdates?: boolean;
  /** Additional class applied to the `.pg-root` wrapper for theme scoping. */
  className?: string;
  /** Height of the pivot or replace-mode drilldown grid. */
  height?: number | string;
  /** Scoped drilldown behavior, loading rows, and drilldown pagination. */
  drillDown?: PivotTableDrillDownOptions;
  /** Number of leading columns pinned while scrolling horizontally. */
  frozenColumnCount?: number;
  /** Overrides built-in UI labels and count formatters. */
  labels?: PivotTableLabelOverrides;
}

export interface PivotTableClientProps extends PivotTableBaseProps {
  /** Raw source rows. When present, `PivotTable` runs filtering, pivoting, and drilldown locally. */
  data: RowData[];
  pivotResult?: never;
  getPage?: never;
  /** Optional field metadata. If omitted, fields are inferred from `data`. */
  fields?: PivotFieldConfig[];
  /** Pagination settings. Pass `false` to disable, `true` for defaults, or an object for client/controlled pagination. */
  pagination?: boolean | PivotTablePaginationOptions;
}

export interface PivotTableServerProps extends PivotTableBaseProps {
  data?: never;
  getPage?: never;
  /** Backend-computed pivot result. In server pagination mode, `rows` should contain only the current page. */
  pivotResult: PivotResult | null | undefined;
  /** Field metadata required for toolbar labels, roles, filters, and drilldown columns. */
  fields: PivotFieldConfig[];
  /** Pagination settings. Pass `false` to disable, `true` for defaults, or an object for controlled/backend pagination. */
  pagination?: boolean | PivotTablePaginationOptions;
}

export interface PivotTableManagedServerProps extends PivotTableBaseProps {
  data?: never;
  pivotResult?: never;
  /** Managed backend pivot loader. Called on mount, model/filter changes, page changes, page-size changes, and sort changes. */
  getPage: PivotTableGetPage;
  /** Field metadata required for toolbar labels, roles, filters, and drilldown columns. */
  fields: PivotFieldConfig[];
  /** Pagination settings for the managed backend pivot grid. */
  pagination?: boolean | PivotTableManagedPaginationOptions;
}

export type PivotTableProps = PivotTableClientProps | PivotTableServerProps | PivotTableManagedServerProps;
