import type { AggregationFn, FilterOperator } from '../core/types';

export interface DataGridLabels {
  columnMenu: string;
  noRows: string;
  copyCellValue: string;
  copiedCellValue: string;
  pagination: string;
  rowsPerPage: string;
  paginationPreviousPage: string;
  paginationNextPage: string;
  paginationPageStatus: (page: number, pageCount: number, totalRows: number) => string;
}

export type DataGridLabelOverrides = Partial<DataGridLabels>;

export interface PivotTableLabels extends DataGridLabels {
  rowField: string;
  columnField: string;
  valueField: string;
  values: string;
  addValue: string;
  removeValue: (index: number) => string;
  valueFieldAria: (index: number) => string;
  aggregation: string;
  aggregationAria: (index: number) => string;
  none: string;
  aggregations: Record<AggregationFn, string>;
  filterOperators: Record<FilterOperator, string>;
  pivotControls: string;
  sourceFilters: string;
  clearAllFilters: string;
  removeFilter: string;
  filterColumn: string;
  filterColumnAria: string;
  filterOperator: string;
  filterOperatorAria: string;
  filterValue: string;
  filterValueAria: string;
  filterValueFrom: string;
  filterValueFromAria: string;
  filterValueTo: string;
  filterValueToAria: string;
  datePickerCalendar: string;
  datePickerOpenCalendar: string;
  datePickerPreviousMonth: string;
  datePickerNextMonth: string;
  datePickerSelectDate: (date: string) => string;
  datePickerSelectedDate: (date: string) => string;
  noFilterValue: string;
  noSourceFilters: string;
  addFilter: string;
  pivotStatistics: string;
  entityName: string;
  recordCount: (filtered: number, total: number, entityName: string) => string;
  groupCount: (count: number) => string;
  noMatchingRecords: (entityName: string) => string;
  noPivotData: string;
  drilldownRows: string;
  noDrilldownRows: string;
  back: string;
  loading: string;
  drilldownRecordCount: (count: number | string, entityName: string) => string;
  countColumn: string;
  totalColumn: string;
  totalColumnWithValue: (valueLabel: string) => string;
}

export type PivotTableLabelOverrides = Partial<Omit<PivotTableLabels, 'aggregations' | 'filterOperators'>> & {
  aggregations?: Partial<Record<AggregationFn, string>>;
  filterOperators?: Partial<Record<FilterOperator, string>>;
};

export const DEFAULT_DATA_GRID_LABELS: DataGridLabels = {
  columnMenu: 'Columns',
  noRows: 'No rows to display.',
  copyCellValue: 'Copy cell value',
  copiedCellValue: 'Copied',
  pagination: 'Pagination',
  rowsPerPage: 'Rows per page',
  paginationPreviousPage: 'Previous page',
  paginationNextPage: 'Next page',
  paginationPageStatus: (page, pageCount, totalRows) => `Page ${page} of ${pageCount} (${totalRows} rows)`,
};

export const DEFAULT_PIVOT_TABLE_LABELS: PivotTableLabels = {
  ...DEFAULT_DATA_GRID_LABELS,
  rowField: 'Rows',
  columnField: 'Columns',
  valueField: 'Value',
  values: 'Values',
  addValue: 'Add value',
  removeValue: (index) => `Remove value ${index}`,
  valueFieldAria: (index) => `Value field ${index}`,
  aggregation: 'Agg',
  aggregationAria: (index) => `Aggregation ${index}`,
  none: 'None',
  aggregations: {
    sum: 'Sum',
    count: 'Count',
    avg: 'Avg',
    min: 'Min',
    max: 'Max',
  },
  filterOperators: {
    contains: 'Contains',
    equals: 'Equals',
    notEquals: 'Not equals',
    startsWith: 'Starts with',
    endsWith: 'Ends with',
    greaterThan: 'Greater than',
    lessThan: 'Less than',
    isEmpty: 'Is empty',
    isNotEmpty: 'Is not empty',
    between: 'Between',
    after: 'After',
    before: 'Before',
  },
  pivotControls: 'Pivot controls',
  sourceFilters: 'Source data filters',
  clearAllFilters: 'Clear all',
  removeFilter: 'Remove filter',
  filterColumn: 'Column',
  filterColumnAria: 'Filter column',
  filterOperator: 'Operator',
  filterOperatorAria: 'Filter operator',
  filterValue: 'Value',
  filterValueAria: 'Filter value',
  filterValueFrom: 'From',
  filterValueFromAria: 'Filter value from',
  filterValueTo: 'To',
  filterValueToAria: 'Filter value to',
  datePickerCalendar: 'Calendar',
  datePickerOpenCalendar: 'Open calendar',
  datePickerPreviousMonth: 'Previous month',
  datePickerNextMonth: 'Next month',
  datePickerSelectDate: (date) => `Select ${date}`,
  datePickerSelectedDate: (date) => `Selected ${date}`,
  noFilterValue: 'No value',
  noSourceFilters: 'No source filters',
  addFilter: 'Add filter',
  pivotStatistics: 'Pivot statistics',
  entityName: 'records',
  recordCount: (filtered, total, entityName) => (filtered < total ? `${filtered} / ${total} ${entityName}` : `${total} ${entityName}`),
  groupCount: (count) => `${count} groups`,
  noMatchingRecords: (entityName) => `No ${entityName} match the current filters.`,
  noPivotData: 'No data available for the selected pivot configuration.',
  drilldownRows: 'Drilldown rows',
  noDrilldownRows: 'No drilldown rows available.',
  back: 'Back',
  loading: 'Loading',
  drilldownRecordCount: (count, entityName) => `${count} ${entityName}`,
  countColumn: '#',
  totalColumn: 'Total',
  totalColumnWithValue: (valueLabel) => `Total (${valueLabel})`,
};

export function resolveDataGridLabels(labels?: DataGridLabelOverrides): DataGridLabels {
  return {
    ...DEFAULT_DATA_GRID_LABELS,
    ...labels,
  };
}

export function resolvePivotTableLabels(labels?: PivotTableLabelOverrides): PivotTableLabels {
  const { aggregations, filterOperators, ...rest } = labels ?? {};

  return {
    ...DEFAULT_PIVOT_TABLE_LABELS,
    ...rest,
    aggregations: {
      ...DEFAULT_PIVOT_TABLE_LABELS.aggregations,
      ...aggregations,
    },
    filterOperators: {
      ...DEFAULT_PIVOT_TABLE_LABELS.filterOperators,
      ...filterOperators,
    },
  };
}
