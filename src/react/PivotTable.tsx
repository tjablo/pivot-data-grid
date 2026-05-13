import { useCallback, useMemo, useState } from 'react';
import { autoDetectFields, buildDefaultModel } from '../core/fields';
import { getPivotTotalColumnId, getPivotValueColumnId } from '../core/pivot';
import type { PivotFieldConfig, PivotModel, PivotResult, PivotRow, RowData } from '../core/types';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, PaginationState } from './DataGrid.types';
import { DrillDownPanel } from './DrillDownPanel';
import { type PivotTableLabels, resolvePivotTableLabels } from './labels';
import type { PivotTableProps } from './PivotTable.types';
import { PivotToolbar } from './PivotToolbar';
import { PortalContainerContext } from './portalContext';
import { useControllableState } from './useControllableState';
import { usePivotData } from './usePivotData';
import { usePivotDrillDown } from './usePivotDrillDown';
import { usePivotPagination } from './usePivotPagination';

function formatNumber(value: unknown, fallback?: (value: number | null, columnId: string) => string, columnId = '') {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return fallback ? fallback(numericValue, columnId) : numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildColumns(
  result: PivotResult,
  model: PivotModel,
  fields: PivotFieldConfig[],
  labels: PivotTableLabels,
  formatValue?: (value: number | null, columnId: string) => string,
): DataGridColumn<PivotRow>[] {
  const isSingleValue = model.values.length === 1;
  const columns: DataGridColumn<PivotRow>[] = model.rows.map((rowField) => {
    const field = fields.find((candidate) => candidate.field === rowField);
    return {
      id: rowField,
      header: field?.label ?? rowField,
      accessor: rowField,
      width: 180,
      sortable: true,
      copyable: field?.copyable,
      valueTone: field?.valueTone,
    };
  });

  columns.push({
    id: '_count',
    header: labels.countColumn,
    accessor: '_count',
    width: 92,
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
      const fieldLabel = valueField?.label ?? valueConfig.field;
      columns.push({
        id,
        header: isSingleValue ? pivotColumn.label : `${pivotColumn.label} (${fieldLabel})`,
        accessor: id,
        width: 148,
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
    const fieldLabel = valueField?.label ?? valueConfig.field;
    columns.push({
      id,
      header: isSingleValue ? labels.totalColumn : labels.totalColumnWithValue(fieldLabel),
      accessor: id,
      width: 148,
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
    drillDown: drillDownOptions,
    frozenColumnCount = 1,
    labels: labelOverrides,
  } = props;
  const drillDownViewMode = drillDownOptions?.mode ?? 'replace';
  const { pivot: pivotPagination, drillDown: drillDownPagination } = usePivotPagination(props.pagination, drillDownOptions?.pagination);

  const labels = useMemo(() => resolvePivotTableLabels(labelOverrides), [labelOverrides]);
  const resolvedEntityName = entityName ?? labels.entityName;
  const clientMode = 'data' in props && props.data != null;
  const sourceData: RowData[] = clientMode ? props.data : [];
  const fields = useMemo(() => autoDetectFields(sourceData, props.fields), [props.fields, sourceData]);
  const fallbackModel = useMemo(() => defaultPivotModel ?? buildDefaultModel(fields), [defaultPivotModel, fields]);
  const [model, setModel] = useControllableState(pivotModel, fallbackModel, onPivotModelChange);
  const [sourceFilters, setSourceFilters] = useControllableState(filters, [], onFiltersChange);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const setRootRef = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node);
  }, []);

  const { filteredData, result } = usePivotData({
    clientMode,
    sourceData,
    sourceFilters,
    model,
    serverResult: clientMode ? null : props.pivotResult,
  });
  const groupCount =
    pivotPagination.mode === 'server' ? (pivotPagination.totalRows ?? result?.rows.length ?? 0) : (result?.rows.length ?? 0);
  const stats = {
    total: result?.totalSourceRecords ?? sourceData.length,
    filtered: result?.filteredSourceRecords ?? filteredData.length,
    groups: groupCount,
  };

  const columns = useMemo(
    () => (result ? buildColumns(result, model, fields, labels, formatValue) : []),
    [fields, formatValue, labels, model, result],
  );

  const drillDown = usePivotDrillDown({
    clientMode,
    model,
    result,
    filteredData,
    sourceFilters,
    onOpen: drillDownOptions?.onOpen,
    onLoad: drillDownOptions?.onLoad,
    controlledRows: drillDownOptions?.rows,
    controlledLoading: drillDownOptions?.loading,
  });
  const handleDrillDownPaginationChange = useCallback(
    (state: PaginationState) => {
      if (!drillDown.activeRequest) return;
      drillDownPagination.onChange?.(state, drillDown.activeRequest);
    },
    [drillDown.activeRequest, drillDownPagination.onChange],
  );
  const activeDrillDown = drillDown.activeRequest;
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
          model={model}
          onModelChange={setModel}
          filters={sourceFilters}
          onFiltersChange={setSourceFilters}
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
            paginationMode={drillDownPagination.mode}
            paginationState={drillDownPagination.state}
            totalRows={drillDownPagination.totalRows}
            onPaginationChange={handleDrillDownPaginationChange}
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
              loading={loading}
              getRowId={(row) => row.id}
              emptyMessage={emptyMessage}
              onCellClick={drillDownViewMode === 'none' ? undefined : drillDown.open}
              frozenColumnCount={frozenColumnCount}
              pagination={pivotPagination.enabled}
              defaultPaginationState={{ pageSize: pivotPagination.defaultPageSize }}
              pageSizeOptions={pivotPagination.pageSizeOptions}
              paginationMode={pivotPagination.mode}
              paginationState={pivotPagination.state}
              totalRows={pivotPagination.totalRows}
              onPaginationChange={pivotPagination.onChange}
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
            paginationMode={drillDownPagination.mode}
            paginationState={drillDownPagination.state}
            totalRows={drillDownPagination.totalRows}
            onPaginationChange={handleDrillDownPaginationChange}
            labels={labels}
            onClose={drillDown.close}
          />
        ) : null}
      </PortalContainerContext.Provider>
    </div>
  );
}
