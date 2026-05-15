import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { autoDetectFields, buildDefaultModel } from '../core/fields';
import { normalizePivotModel } from '../core/model';
import { getPivotTotalColumnId, getPivotValueColumnId } from '../core/pivot';
import type { PivotColumnKey, PivotModel, PivotResult, PivotRow, RowData } from '../core/types';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, PaginationState, SortState } from './DataGrid.types';
import { DrillDownPanel } from './DrillDownPanel';
import { type PivotTableLabels, resolvePivotTableLabels } from './labels';
import type {
  PivotTableColumnSize,
  PivotTableColumnSizing,
  PivotTableFieldConfig,
  PivotTableProps,
  PivotValueFormatContext,
  PivotValueFormatter,
} from './PivotTable.types';
import { PivotToolbar } from './PivotToolbar';
import { PortalContainerContext } from './portalContext';
import { useControllableState } from './useControllableState';
import { useManagedPageState } from './useManagedPageState';
import { useManagedPivotPage } from './useManagedPivotPage';
import { usePivotData } from './usePivotData';
import { usePivotDrillDown } from './usePivotDrillDown';
import { usePivotPagination } from './usePivotPagination';

function createFormatContext(
  kind: PivotValueFormatContext['kind'],
  columnId: string,
  valueConfig?: PivotModel['values'][number],
  pivotColumn?: PivotColumnKey,
): PivotValueFormatContext {
  return {
    columnId,
    kind,
    valueConfig,
    field: valueConfig?.field,
    aggFunc: valueConfig?.aggFunc,
    pivotColumn,
  };
}

function formatMetricValue(value: unknown, context: PivotValueFormatContext, fallback?: PivotValueFormatter) {
  if (value == null) return '-';
  const metricValue = typeof value === 'number' || typeof value === 'string' ? value : String(value);
  if (fallback) return fallback(metricValue, context.columnId, context);
  if (typeof metricValue === 'string') return metricValue;
  return metricValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getValueLabel(
  valueConfig: PivotModel['values'][number],
  fields: PivotTableFieldConfig[],
  labels: PivotTableLabels,
  includeFieldLabel: boolean,
): string {
  if (valueConfig.label) return valueConfig.label;
  if (!includeFieldLabel) return labels.aggregations[valueConfig.aggFunc];
  const valueField = fields.find((field) => field.field === valueConfig.field);
  const fieldLabel = valueField?.label ?? valueConfig.field;
  return `${fieldLabel} ${labels.aggregations[valueConfig.aggFunc]}`;
}

function getColumnSize(defaultWidth: number, size?: PivotTableColumnSize) {
  return { width: defaultWidth, ...size };
}

function getPivotRowFieldCellFormat(field: PivotTableFieldConfig | undefined): DataGridColumn<PivotRow>['format'] | undefined {
  if (!field?.renderFieldCell) return undefined;
  return (value, row) => field.renderFieldCell?.({ value, row, field, location: 'pivot-row' });
}

function renderNodeList(parts: Array<{ key: string; node: ReactNode }>, separator: string, className: string): ReactNode {
  if (parts.length === 0) return '';
  if (parts.every((part) => typeof part.node === 'string' || typeof part.node === 'number')) {
    return parts.map((part) => part.node).join(` ${separator} `);
  }

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span className="pg-pivot-column-header-part" key={part.key}>
          {index > 0 ? <span className="pg-pivot-column-header-separator">{separator}</span> : null}
          {part.node}
        </span>
      ))}
    </span>
  );
}

function renderPivotColumnLabel(pivotColumn: PivotColumnKey, model: PivotModel, fields: PivotTableFieldConfig[]): ReactNode {
  const parts = model.columns
    .map((columnField) => {
      const field = fields.find((candidate) => candidate.field === columnField);
      const value = pivotColumn.values[columnField];
      if (value == null) return null;
      return {
        key: `${columnField}:${value}`,
        node: field?.renderFieldCell ? field.renderFieldCell({ value, field, location: 'pivot-column', pivotColumn }) : value,
      };
    })
    .filter((part): part is { key: string; node: ReactNode } => part != null);

  return parts.length ? renderNodeList(parts, '/', 'pg-pivot-column-header') : pivotColumn.label;
}

function renderPivotValueHeader(pivotColumnLabel: ReactNode, valueLabel: string, includeValueLabel: boolean): ReactNode {
  if (!includeValueLabel) return pivotColumnLabel;
  if (typeof pivotColumnLabel === 'string' || typeof pivotColumnLabel === 'number') return `${pivotColumnLabel} (${valueLabel})`;
  return (
    <span className="pg-pivot-column-header-with-value">
      <span className="pg-pivot-column-header-label">{pivotColumnLabel}</span>
      <span className="pg-pivot-column-value-label">({valueLabel})</span>
    </span>
  );
}

function buildColumns(
  result: PivotResult,
  model: PivotModel,
  fields: PivotTableFieldConfig[],
  labels: PivotTableLabels,
  formatValue?: PivotValueFormatter,
  columnSizing?: PivotTableColumnSizing,
): DataGridColumn<PivotRow>[] {
  const isSingleValue = model.values.length === 1;
  const isSingleValueField = new Set(model.values.map((value) => value.field)).size === 1;
  const columns: DataGridColumn<PivotRow>[] = model.rows.map((rowField) => {
    const field = fields.find((candidate) => candidate.field === rowField);
    return {
      id: rowField,
      header: field?.label ?? rowField,
      accessor: rowField,
      ...getColumnSize(180, columnSizing?.row),
      sortable: true,
      copyable: field?.copyable,
      valueTone: field?.valueTone,
      format: getPivotRowFieldCellFormat(field),
    };
  });

  columns.push({
    id: '_count',
    header: labels.countColumn,
    accessor: '_count',
    ...getColumnSize(92, columnSizing?.count),
    align: 'right',
    sortable: true,
    className: 'pg-metric-cell',
    format: (value) => formatMetricValue(value, createFormatContext('count', '_count'), formatValue),
  });

  for (const pivotColumn of result.columns) {
    for (const valueConfig of model.values) {
      const valueField = fields.find((field) => field.field === valueConfig.field);
      const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
      const id = getPivotValueColumnId(pivotColumn.id, suffix);
      const valueLabel = getValueLabel(valueConfig, fields, labels, !isSingleValueField);
      const pivotColumnLabel = renderPivotColumnLabel(pivotColumn, model, fields);
      columns.push({
        id,
        header: renderPivotValueHeader(pivotColumnLabel, valueLabel, !isSingleValue),
        accessor: id,
        ...getColumnSize(148, columnSizing?.value),
        align: 'right',
        sortable: true,
        className: 'pg-metric-cell',
        copyable: valueField?.copyable,
        valueTone: valueField?.valueTone,
        format: (value) => formatMetricValue(value, createFormatContext('value', id, valueConfig, pivotColumn), formatValue),
      });
    }
  }

  for (const valueConfig of model.values) {
    const valueField = fields.find((field) => field.field === valueConfig.field);
    const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
    const id = getPivotTotalColumnId(suffix);
    const valueLabel = getValueLabel(valueConfig, fields, labels, !isSingleValueField);
    columns.push({
      id,
      header: isSingleValue ? labels.totalColumn : labels.totalColumnWithValue(valueLabel),
      accessor: id,
      ...getColumnSize(148, columnSizing?.total),
      align: 'right',
      sortable: true,
      className: 'pg-metric-cell',
      copyable: valueField?.copyable,
      valueTone: valueField?.valueTone,
      format: (value) => formatMetricValue(value, createFormatContext('total', id, valueConfig), formatValue),
    });
  }

  return columns;
}

function buildLoadingColumns(
  model: PivotModel,
  fields: PivotTableFieldConfig[],
  labels: PivotTableLabels,
  formatValue?: PivotValueFormatter,
  columnSizing?: PivotTableColumnSizing,
): DataGridColumn<PivotRow>[] {
  const isSingleValue = model.values.length === 1;
  const isSingleValueField = new Set(model.values.map((value) => value.field)).size === 1;
  const columns: DataGridColumn<PivotRow>[] = model.rows.map((rowField) => {
    const field = fields.find((candidate) => candidate.field === rowField);
    return {
      id: rowField,
      header: field?.label ?? rowField,
      accessor: rowField,
      ...getColumnSize(180, columnSizing?.row),
      sortable: true,
      copyable: field?.copyable,
      valueTone: field?.valueTone,
      format: getPivotRowFieldCellFormat(field),
    };
  });

  columns.push({
    id: '_count',
    header: labels.countColumn,
    accessor: '_count',
    ...getColumnSize(92, columnSizing?.count),
    align: 'right',
    sortable: true,
    className: 'pg-metric-cell',
    format: (value) => formatMetricValue(value, createFormatContext('count', '_count'), formatValue),
  });

  for (const valueConfig of model.values) {
    const valueField = fields.find((field) => field.field === valueConfig.field);
    const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
    const id = getPivotTotalColumnId(suffix);
    const valueLabel = getValueLabel(valueConfig, fields, labels, !isSingleValueField);
    columns.push({
      id,
      header: isSingleValue ? labels.totalColumn : labels.totalColumnWithValue(valueLabel),
      accessor: id,
      ...getColumnSize(148, columnSizing?.total),
      align: 'right',
      sortable: true,
      className: 'pg-metric-cell',
      copyable: valueField?.copyable,
      valueTone: valueField?.valueTone,
      format: (value) => formatMetricValue(value, createFormatContext('total', id, valueConfig), formatValue),
    });
  }

  if (columns.length === 0) {
    columns.push({
      id: '__loading__',
      header: labels.loading,
      ...getColumnSize(160, columnSizing?.loading),
    });
  }

  return columns;
}

export function PivotTable(props: PivotTableProps) {
  const {
    loading = false,
    defaultPivotModel,
    pivotModel,
    onPivotModelChange,
    filters,
    onFiltersChange,
    entityName,
    formatValue,
    deferFilterUpdates,
    className,
    height = 520,
    columnSizing,
    drillDown: drillDownOptions,
    frozenColumnCount = 1,
    labels: labelOverrides,
  } = props;
  const drillDownViewMode = drillDownOptions?.mode ?? 'replace';
  const { pivot: pivotPagination, drillDown: drillDownPagination } = usePivotPagination(props.pagination, drillDownOptions?.pagination);
  const hasManagedPivotLoader = 'getPage' in props && typeof props.getPage === 'function';
  const managedPivotGetPage = hasManagedPivotLoader ? props.getPage : undefined;
  const drillDownGetPage = drillDownOptions && 'getPage' in drillDownOptions ? drillDownOptions.getPage : undefined;
  const drillDownRows = drillDownOptions && 'rows' in drillDownOptions ? drillDownOptions.rows : undefined;
  const drillDownLoading = drillDownOptions && 'loading' in drillDownOptions ? drillDownOptions.loading : undefined;
  const {
    page: managedPivotPage,
    sort: managedPivotSort,
    setPage: setManagedPivotPage,
    setSort: setManagedPivotSort,
    reset: resetManagedPivotState,
  } = useManagedPageState(pivotPagination.defaultPageSize);

  const labels = useMemo(() => resolvePivotTableLabels(labelOverrides), [labelOverrides]);
  const resolvedEntityName = entityName ?? labels.entityName;
  const clientMode = 'data' in props && props.data != null;
  const sourceData: RowData[] = clientMode ? props.data : [];
  const fields = useMemo<PivotTableFieldConfig[]>(
    () => autoDetectFields(sourceData, props.fields) as PivotTableFieldConfig[],
    [props.fields, sourceData],
  );
  const fallbackModel = useMemo(() => normalizePivotModel(defaultPivotModel ?? buildDefaultModel(fields)), [defaultPivotModel, fields]);
  const [model, setModel] = useControllableState(pivotModel, fallbackModel, onPivotModelChange);
  const normalizedModel = useMemo(() => normalizePivotModel(model), [model]);
  const [sourceFilters, setSourceFilters] = useControllableState(filters, [], onFiltersChange);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setRootRef = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);

  const resetManagedPivotPage = useCallback(() => {
    if (!hasManagedPivotLoader) return;
    resetManagedPivotState();
  }, [hasManagedPivotLoader, resetManagedPivotState]);

  const handleModelChange = useCallback(
    (nextModel: PivotModel) => {
      setModel(normalizePivotModel(nextModel));
      resetManagedPivotPage();
    },
    [resetManagedPivotPage, setModel],
  );

  const handleFiltersChange = useCallback(
    (nextFilters: typeof sourceFilters) => {
      setSourceFilters(nextFilters);
      resetManagedPivotPage();
    },
    [resetManagedPivotPage, setSourceFilters],
  );

  const handleManagedPivotPageChange = useCallback((state: PaginationState) => setManagedPivotPage(state), [setManagedPivotPage]);

  const handleManagedPivotSortChange = useCallback((sort: SortState | null) => setManagedPivotSort(sort), [setManagedPivotSort]);

  const managedPivot = useManagedPivotPage({
    enabled: hasManagedPivotLoader,
    getPage: managedPivotGetPage,
    model: normalizedModel,
    filters: sourceFilters,
    page: managedPivotPage,
    sort: managedPivotSort,
  });

  const { filteredData, result } = usePivotData({
    clientMode,
    sourceData,
    sourceFilters,
    model: normalizedModel,
    serverResult: clientMode ? null : hasManagedPivotLoader ? managedPivot.result : 'pivotResult' in props ? props.pivotResult : null,
  });
  const pivotTotalRows = hasManagedPivotLoader ? managedPivot.totalRows : pivotPagination.totalRows;
  const groupCount =
    hasManagedPivotLoader || pivotPagination.mode === 'server' ? (pivotTotalRows ?? result?.rows.length ?? 0) : (result?.rows.length ?? 0);
  const stats = {
    total: result?.totalSourceRecords ?? sourceData.length,
    filtered: result?.filteredSourceRecords ?? filteredData.length,
    groups: groupCount,
  };
  const isPivotLoading = loading || managedPivot.loading;

  const columns = useMemo(
    () =>
      result
        ? buildColumns(result, normalizedModel, fields, labels, formatValue, columnSizing)
        : isPivotLoading
          ? buildLoadingColumns(normalizedModel, fields, labels, formatValue, columnSizing)
          : [],
    [columnSizing, fields, formatValue, isPivotLoading, labels, normalizedModel, result],
  );

  const drillDown = usePivotDrillDown({
    clientMode,
    model: normalizedModel,
    result,
    filteredData,
    sourceFilters,
    onOpen: drillDownOptions?.onOpen,
    getPage: drillDownGetPage,
    defaultPageSize: drillDownPagination.defaultPageSize,
    controlledRows: drillDownRows,
    controlledLoading: drillDownLoading,
  });
  const handleDrillDownPaginationChange = useCallback(
    (state: PaginationState) => {
      if (!drillDown.activeRequest) return;
      drillDownPagination.onChange?.(state, drillDown.activeRequest);
    },
    [drillDown.activeRequest, drillDownPagination.onChange],
  );
  const activeDrillDown = drillDown.activeRequest;
  const activeDrillDownManagedPagination = drillDown.managedPagination;
  const activeDrillDownSort = drillDown.sort;
  const hasResult = result && result.rows.length > 0;
  const emptyMessage =
    clientMode && sourceData.length > 0 && filteredData.length === 0 ? labels.noMatchingRecords(resolvedEntityName) : labels.noPivotData;
  const pivotStats = (
    <div className="pg-stats" role="status" aria-label={labels.pivotStatistics}>
      <span>{labels.recordCount(stats.filtered, stats.total, resolvedEntityName)}</span>
      <span>{labels.groupCount(stats.groups)}</span>
    </div>
  );

  return (
    <div ref={setRootRef} className={['pg-root', className].filter(Boolean).join(' ')}>
      <PortalContainerContext.Provider value={portalContainer}>
        <PivotToolbar
          fields={fields}
          model={normalizedModel}
          onModelChange={handleModelChange}
          filters={sourceFilters}
          onFiltersChange={handleFiltersChange}
          labels={labels}
          deferFilterUpdates={deferFilterUpdates}
        />

        {drillDownViewMode === 'replace' && activeDrillDown ? (
          <DrillDownPanel
            request={activeDrillDown}
            rows={drillDown.rows}
            fields={fields}
            loading={drillDown.loading}
            entityName={resolvedEntityName}
            height={height}
            frozenColumnCount={frozenColumnCount}
            pagination={drillDownPagination.enabled}
            defaultPageSize={drillDownPagination.defaultPageSize}
            pageSizeOptions={drillDownPagination.pageSizeOptions}
            paginationMode={activeDrillDownManagedPagination ? 'server' : drillDownPagination.mode}
            paginationState={activeDrillDownManagedPagination?.state ?? drillDownPagination.state}
            totalRows={activeDrillDownManagedPagination?.totalRows ?? drillDownPagination.totalRows}
            onPaginationChange={activeDrillDownManagedPagination?.onChange ?? handleDrillDownPaginationChange}
            sortMode={activeDrillDownSort ? 'server' : undefined}
            sortState={activeDrillDownSort?.state}
            onSortStateChange={activeDrillDownSort?.onChange}
            labels={labels}
            renderHeader={drillDownOptions?.renderHeader}
            onClose={drillDown.close}
          />
        ) : (
          <div className="pg-view-frame" key="pivot">
            <DataGrid
              rows={hasResult ? result.rows : []}
              columns={columns}
              className="pg-pivot-grid"
              height={height}
              loading={isPivotLoading}
              getRowId={(row) => row.id}
              emptyMessage={emptyMessage}
              onCellClick={drillDownViewMode === 'none' ? undefined : drillDown.open}
              frozenColumnCount={frozenColumnCount}
              pagination={pivotPagination.enabled}
              defaultPaginationState={{ pageSize: pivotPagination.defaultPageSize }}
              pageSizeOptions={pivotPagination.pageSizeOptions}
              paginationMode={hasManagedPivotLoader ? 'server' : pivotPagination.mode}
              paginationState={hasManagedPivotLoader ? managedPivotPage : pivotPagination.state}
              totalRows={pivotTotalRows}
              onPaginationChange={hasManagedPivotLoader ? handleManagedPivotPageChange : pivotPagination.onChange}
              sortMode={hasManagedPivotLoader ? 'server' : undefined}
              sortState={hasManagedPivotLoader ? managedPivotSort : undefined}
              onSortStateChange={hasManagedPivotLoader ? handleManagedPivotSortChange : undefined}
              toolbarContent={pivotStats}
              labels={labels}
            />
          </div>
        )}

        {drillDownViewMode === 'inline' && activeDrillDown ? (
          <DrillDownPanel
            request={activeDrillDown}
            rows={drillDown.rows}
            fields={fields}
            loading={drillDown.loading}
            entityName={resolvedEntityName}
            height={320}
            frozenColumnCount={frozenColumnCount}
            pagination={drillDownPagination.enabled}
            defaultPageSize={drillDownPagination.defaultPageSize}
            pageSizeOptions={drillDownPagination.pageSizeOptions}
            paginationMode={activeDrillDownManagedPagination ? 'server' : drillDownPagination.mode}
            paginationState={activeDrillDownManagedPagination?.state ?? drillDownPagination.state}
            totalRows={activeDrillDownManagedPagination?.totalRows ?? drillDownPagination.totalRows}
            onPaginationChange={activeDrillDownManagedPagination?.onChange ?? handleDrillDownPaginationChange}
            sortMode={activeDrillDownSort ? 'server' : undefined}
            sortState={activeDrillDownSort?.state}
            onSortStateChange={activeDrillDownSort?.onChange}
            labels={labels}
            renderHeader={drillDownOptions?.renderHeader}
            onClose={drillDown.close}
          />
        ) : null}
      </PortalContainerContext.Provider>
    </div>
  );
}
