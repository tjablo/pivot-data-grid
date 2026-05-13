import { getNestedValue, stringifyValue } from './access';
import { isPivotTotalColumnId, parsePivotTotalColumnId, parsePivotValueColumnId } from './pivot';
import type { DrillDownRequest, PivotModel, PivotResult, PivotRow, RowData } from './types';

function rowValuesFromPivotRow(model: PivotModel, row: PivotRow): Record<string, string> {
  return Object.fromEntries(model.rows.filter(Boolean).map((field) => [field, stringifyValue(row[field])]));
}

export function createDrillDownRequestFromCell(
  model: PivotModel,
  result: PivotResult,
  row: PivotRow,
  columnId: string,
): DrillDownRequest | null {
  const rowValues = rowValuesFromPivotRow(model, row);
  const firstRowField = model.rows[0];
  const base: DrillDownRequest = {
    rowValues,
    rowField: firstRowField,
    rowValue: firstRowField ? rowValues[firstRowField] : undefined,
  };

  if (columnId === '_count') return base;

  const total = parsePivotTotalColumnId(columnId);
  if (total || isPivotTotalColumnId(columnId)) {
    return { ...base, valueField: total?.valueField };
  }

  const parsed = parsePivotValueColumnId(columnId);
  if (!parsed) return null;

  const column = result.columns.find((candidate) => candidate.id === parsed.columnKey);
  if (!column) return null;
  const firstColumnField = model.columns[0];

  return {
    ...base,
    columnValues: column.values,
    valueField: parsed.valueField,
    colField: firstColumnField,
    colValue: firstColumnField ? column.values[firstColumnField] : undefined,
  };
}

export function getDrillDownRows(data: RowData[], request: DrillDownRequest): RowData[] {
  return data.filter((row) => {
    for (const [field, expected] of Object.entries(request.rowValues)) {
      if (stringifyValue(getNestedValue(row, field)) !== expected) return false;
    }

    for (const [field, expected] of Object.entries(request.columnValues ?? {})) {
      if (stringifyValue(getNestedValue(row, field)) !== expected) return false;
    }

    return true;
  });
}
