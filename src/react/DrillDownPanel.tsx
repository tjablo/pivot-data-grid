import { ArrowLeft } from 'lucide-react';
import { getNestedValue } from '../core/access';
import type { DrillDownRequest, PivotFieldConfig, RowData } from '../core/types';
import { DataGrid } from './DataGrid';
import type { DataGridColumn, PaginationMode, PaginationState } from './DataGrid.types';
import type { PivotTableLabels } from './labels';

interface DrillDownPanelProps {
  request: DrillDownRequest;
  rows: RowData[];
  fields: PivotFieldConfig[];
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
  labels: PivotTableLabels;
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

function getFieldLabel(fields: PivotFieldConfig[], field: string): string {
  return fields.find((candidate) => candidate.field === field)?.label ?? formatFallbackFieldName(field);
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
  labels,
  onClose,
}: DrillDownPanelProps) {
  const columns: DataGridColumn<RowData>[] = fields
    .filter((field) => field.role !== 'filter-only')
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
    }));

  const title = [
    ...Object.entries(request.rowValues).map(([field, value]) => `${getFieldLabel(fields, field)}: ${value}`),
    ...Object.entries(request.columnValues ?? {}).map(([field, value]) => `${getFieldLabel(fields, field)}: ${value}`),
  ].join(' / ');
  const visibleRowCount = totalRows ?? rows.length;

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
        labels={labels}
        toolbarContent={
          <div className="pg-drilldown-toolbar">
            <button className="pg-back-button" type="button" onClick={onClose}>
              <ArrowLeft className="pg-action-icon" aria-hidden />
              {labels.back}
            </button>
            <div className="pg-drilldown-title">
              <h3>{title}</h3>
              <p>{labels.drilldownRecordCount(loading ? labels.loading : visibleRowCount, entityName)}</p>
            </div>
          </div>
        }
      />
    </section>
  );
}
