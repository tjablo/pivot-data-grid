import { getNestedValue } from '../core/access';
import type { DrillDownRequest, RowData } from '../core/types';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, PaginationMode, PaginationState, SortMode, SortState } from './DataGrid.types';
import { ArrowLeft } from './icons';
import type { PivotTableLabels } from './labels';
import type { PivotTableDrillDownHeaderPart, PivotTableDrillDownHeaderRenderer, PivotTableFieldConfig } from './PivotTable.types';

interface DrillDownPanelProps {
  request: DrillDownRequest;
  rows: RowData[];
  fields: PivotTableFieldConfig[];
  loading?: boolean;
  entityName: string;
  height?: number | string;
  frozenColumnCount?: number;
  pagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  paginationMode?: PaginationMode;
  paginationState?: PaginationState;
  totalRows?: number;
  onPaginationChange?: (state: PaginationState) => void;
  sortMode?: SortMode;
  sortState?: SortState | null;
  onSortStateChange?: (state: SortState | null) => void;
  labels: PivotTableLabels;
  renderHeader?: PivotTableDrillDownHeaderRenderer;
  onClose: () => void;
}

function formatFallbackFieldName(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFieldLabel(fields: PivotTableFieldConfig[], field: string): string {
  return fields.find((candidate) => candidate.field === field)?.label ?? formatFallbackFieldName(field);
}

function buildHeaderParts(fields: PivotTableFieldConfig[], request: DrillDownRequest): PivotTableDrillDownHeaderPart[] {
  return [
    ...Object.entries(request.rowValues).map(([field, value]) => ({
      kind: 'row' as const,
      field,
      label: getFieldLabel(fields, field),
      value,
    })),
    ...Object.entries(request.columnValues ?? {}).map(([field, value]) => ({
      kind: 'column' as const,
      field,
      label: getFieldLabel(fields, field),
      value,
    })),
  ];
}

export function DrillDownPanel({
  request,
  rows,
  fields,
  loading,
  entityName,
  height = 520,
  frozenColumnCount = 1,
  pagination = true,
  defaultPageSize = 25,
  pageSizeOptions = [25, 50, 100],
  paginationMode = 'client',
  paginationState,
  totalRows,
  onPaginationChange,
  sortMode,
  sortState,
  onSortStateChange,
  labels,
  renderHeader,
  onClose,
}: DrillDownPanelProps) {
  const scopedFields = new Set([...Object.keys(request.rowValues), ...Object.keys(request.columnValues ?? {})]);
  const columns: DataGridColumn<RowData>[] = fields
    .filter((field) => field.role !== 'filter-only' && !scopedFields.has(field.field))
    .slice(0, 12)
    .map((field) => ({
      id: field.field,
      header: field.label ?? field.field,
      accessor: (row) => getNestedValue(row, field.field),
      width: 160,
      align: field.type === 'number' ? 'right' : undefined,
      sortable: true,
      className: field.type === 'number' ? 'pg-metric-cell' : undefined,
      copyable: field.copyable,
      valueTone: field.valueTone,
      format: field.renderFieldCell ? (value, row) => field.renderFieldCell?.({ value, row, field, location: 'drilldown' }) : undefined,
    }));

  const headerParts = buildHeaderParts(fields, request);
  const title = headerParts.map((part) => `${part.label}: ${part.value}`).join(' / ');
  const visibleRowCount = totalRows ?? rows.length;
  const isLoading = Boolean(loading);
  const subtitle = labels.drilldownRecordCount(isLoading ? labels.loading : visibleRowCount, entityName);
  const headerContent = renderHeader
    ? renderHeader({
        request,
        parts: headerParts,
        defaultTitle: title,
        defaultSubtitle: subtitle,
        rowCount: visibleRowCount,
        entityName,
        loading: isLoading,
      })
    : null;

  return (
    <section className="pg-drilldown pg-view-frame" aria-label={labels.drilldownRows}>
      <DataGrid
        rows={rows}
        columns={columns}
        className="pg-drilldown-grid"
        height={height}
        loading={loading}
        getRowId={(_, index) => index}
        emptyMessage={labels.noDrilldownRows}
        frozenColumnCount={frozenColumnCount}
        pagination={pagination}
        defaultPaginationState={{ pageSize: defaultPageSize }}
        pageSizeOptions={pageSizeOptions}
        paginationMode={paginationMode}
        paginationState={paginationState}
        totalRows={totalRows}
        onPaginationChange={onPaginationChange}
        sortMode={sortMode}
        sortState={sortState}
        onSortStateChange={onSortStateChange}
        labels={labels}
        toolbarContent={
          <div className="pg-drilldown-toolbar">
            <button className="pg-back-button" type="button" onClick={onClose}>
              <ArrowLeft className="pg-action-icon" aria-hidden />
              {labels.back}
            </button>
            <div className="pg-drilldown-title">
              {renderHeader ? (
                headerContent
              ) : (
                <>
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </>
              )}
            </div>
          </div>
        }
      />
    </section>
  );
}
