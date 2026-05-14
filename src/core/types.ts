export type RowData = Record<string, unknown>;

export type AggregationFn = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type FieldType = 'string' | 'number' | 'date' | 'boolean';

export type FieldRole = 'dimension' | 'value' | 'filter-only' | 'all';

export type ValueToneMode = 'none' | 'signed';

export interface PivotFieldConfig {
  field: string;
  label?: string;
  type?: FieldType;
  role?: FieldRole;
  copyable?: boolean;
  valueTone?: ValueToneMode;
}

export interface PivotValueConfig {
  field: string;
  aggFunc: AggregationFn;
  label?: string;
}

export interface PivotModel {
  rows: string[];
  columns: string[];
  values: PivotValueConfig[];
}

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'between'
  | 'after'
  | 'before';

export interface SourceFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value?: string;
  valueTo?: string;
}

export interface PivotColumnKey {
  id: string;
  label: string;
  values: Record<string, string>;
}

export interface PivotRow {
  id: string;
  _groupKey: string;
  _count: number;
  [key: string]: string | number | null;
}

export interface PivotResult {
  rows: PivotRow[];
  columns: PivotColumnKey[];
  columnValues: string[];
  rowFields: string[];
  columnFields: string[];
  valueFields: PivotValueConfig[];
  totalSourceRecords: number;
  filteredSourceRecords: number;
}

export interface DrillDownRequest {
  rowValues: Record<string, string>;
  columnValues?: Record<string, string>;
  valueField?: string;
}

export interface PivotRequest {
  model: PivotModel;
  filters: SourceFilter[];
  limit?: number;
  offset?: number;
}

export interface PivotStats {
  total: number;
  filtered: number;
  groups: number;
}
