import { useCallback, useMemo, useState } from 'react';
import { autoDetectFields, buildDefaultModel } from '../core/fields';
import { normalizePivotModel } from '../core/model';
import { getPivotTotalColumnId, getPivotValueColumnId } from '../core/pivot';
import type { PivotFieldConfig, PivotModel, PivotResult, PivotRow, RowData } from '../core/types';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, PaginationState, SortState } from './DataGrid.types';
import { DrillDownPanel } from './DrillDownPanel';
import { type PivotTableLabels, resolvePivotTableLabels } from './labels';
import type { PivotTableColumnSize, PivotTableColumnSizing, PivotTableProps } from './PivotTable.types';
import { PivotToolbar } from './PivotToolbar';
import { PortalContainerContext } from './portalContext';
import { useControllableState } from './useControllableState';
import { useManagedPageState } from './useManagedPageState';
import { useManagedPivotPage } from './useManagedPivotPage';
import { usePivotData } from './usePivotData';
import { usePivotDrillDown } from './usePivotDrillDown';
import { usePivotPagination } from './usePivotPagination';

function formatNumber(value: unknown, fallback?: (value: number | null, columnId: string) => string, columnId = '') {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return fallback ? fallback(numericValue, columnId) : numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getValueLabel(
  valueConfig: PivotModel['values'][number],
  fields: PivotFieldConfig[],
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

function buildColumns(
  result: PivotResult,
  model: PivotModel,
  fields: PivotFieldConfig[],
  labels: PivotTableLabels,
  formatValue?: (value: number | null, columnId: string) => string,
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
    format: (value) => formatNumber(value, formatValue, '_count'),
  });

  for (const pivotColumn of result.columns) {
    for (const valueConfig of model.values) {
      const valueField = fields.find((field) => field.field === valueConfig.field);
      const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
      const id = getPivotValueColumnId(pivotColumn.id, suffix);
      const valueLabel = getValueLabel(valueConfig, fields, labels, !isSingleValueField);
      columns.push({
        id,
        header: isSingleValue ? pivotColumn.label : `${pivotColumn.label} (${valueLabel})`,
        accessor: id,
        ...getColumnSize(148, columnSizing?.value),
        align: 'right',
        sortable: true,
        className: 'pg-metric-cell',
        copyable: valueField?.copyable,
        valueTone: valueField?.valueTone,
        format: (value) => formatNumber(value, formatValue, id),
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
      format: (value) => formatNumber(value, formatValue, id),
    });
  }

  return columns;
}

function buildLoadingColumns(
  model: PivotModel,
  fields: PivotFieldConfig[],
  labels: PivotTableLabels,
  formatValue?: (value: number | null, columnId: string) => string,
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
    format: (value) => formatNumber(value, formatValue, '_count'),
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
      format: (value) => formatNumber(value, formatValue, id),
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
  const fields = useMemo(() => autoDetectFields(sourceData, props.fields), [props.fields, sourceData]);
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
            onClose={drillDown.close}
          />
        ) : null}
      </PortalContainerContext.Provider>
    </div>
  );
}
