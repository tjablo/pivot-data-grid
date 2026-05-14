import { getNestedValue, stringifyValue, toFiniteNumber } from './access';
import { normalizePivotValues } from './model';
import type { AggregationFn, PivotColumnKey, PivotModel, PivotResult, PivotRow, PivotValueConfig, RowData } from './types';

const KEY_SEPARATOR = '\u001f';
const PIVOT_PREFIX = 'pivot__';
const TOTAL_PREFIX = '_total__';

interface AggregateState {
  count: number;
  sum: number;
  min: number | null;
  max: number | null;
}

interface GroupState {
  rowValues: Record<string, string>;
  count: number;
  totals: Map<string, AggregateState>;
  columns: Map<string, Map<string, AggregateState>>;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

function decode(value: string): string {
  return decodeURIComponent(value);
}

function createAggregateState(): AggregateState {
  return { count: 0, sum: 0, min: null, max: null };
}

function addAggregate(state: AggregateState, value: unknown, aggFunc: AggregationFn): void {
  if (aggFunc === 'count') {
    state.count += 1;
    return;
  }

  const numericValue = toFiniteNumber(value);
  if (numericValue == null) return;

  state.count += 1;
  state.sum += numericValue;
  state.min = state.min == null ? numericValue : Math.min(state.min, numericValue);
  state.max = state.max == null ? numericValue : Math.max(state.max, numericValue);
}

function readAggregate(state: AggregateState | undefined, aggFunc: AggregationFn): number | null {
  if (!state) return null;
  switch (aggFunc) {
    case 'count':
      return state.count;
    case 'sum':
      return state.count ? state.sum : null;
    case 'avg':
      return state.count ? state.sum / state.count : null;
    case 'min':
      return state.min;
    case 'max':
      return state.max;
    default:
      return null;
  }
}

function buildValues(row: RowData, fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field, stringifyValue(getNestedValue(row, field))]));
}

function makeKey(values: Record<string, string>, fields: string[]): string {
  return fields.map((field) => values[field] ?? '').join(KEY_SEPARATOR);
}

function makeLabel(values: Record<string, string>, fields: string[]): string {
  return fields
    .map((field) => values[field])
    .filter(Boolean)
    .join(' / ');
}

function valueKey(value: PivotValueConfig): string {
  return `${value.field}:${value.aggFunc}`;
}

function ensureAggregate(map: Map<string, AggregateState>, key: string): AggregateState {
  let state = map.get(key);
  if (!state) {
    state = createAggregateState();
    map.set(key, state);
  }
  return state;
}

function addValueAggregates(map: Map<string, AggregateState>, row: RowData, values: PivotValueConfig[]): void {
  for (const valueConfig of values) {
    const state = ensureAggregate(map, valueKey(valueConfig));
    addAggregate(state, getNestedValue(row, valueConfig.field), valueConfig.aggFunc);
  }
}

export function getPivotValueColumnId(columnKey: string, valueField: string): string {
  return `${PIVOT_PREFIX}${encode(columnKey)}__${encode(valueField)}`;
}

export function getPivotTotalColumnId(valueField: string): string {
  return `${TOTAL_PREFIX}${encode(valueField)}`;
}

export function isPivotValueColumnId(columnId: string): boolean {
  return columnId.startsWith(PIVOT_PREFIX);
}

export function isPivotTotalColumnId(columnId: string): boolean {
  return columnId.startsWith(TOTAL_PREFIX);
}

export function parsePivotValueColumnId(columnId: string): { columnKey: string; valueField: string } | null {
  if (!isPivotValueColumnId(columnId)) return null;
  const parts = columnId.slice(PIVOT_PREFIX.length).split('__');
  if (parts.length < 2) return null;
  return {
    columnKey: decode(parts.slice(0, -1).join('__')),
    valueField: decode(parts[parts.length - 1]),
  };
}

export function parsePivotTotalColumnId(columnId: string): { valueField: string } | null {
  if (!isPivotTotalColumnId(columnId)) return null;
  return { valueField: decode(columnId.slice(TOTAL_PREFIX.length)) };
}

export function pivotData(data: RowData[], model: PivotModel): PivotResult {
  const rowFields = model.rows.filter(Boolean);
  const columnFields = model.columns.filter(Boolean);
  const valueFields = normalizePivotValues(model.values);
  const groups = new Map<string, GroupState>();
  const columnMap = new Map<string, PivotColumnKey>();

  for (const row of data) {
    const rowValues = buildValues(row, rowFields);
    const rowKey = makeKey(rowValues, rowFields) || '__all_rows__';
    const columnValues = buildValues(row, columnFields);
    const columnKey = makeKey(columnValues, columnFields);

    let group = groups.get(rowKey);
    if (!group) {
      group = {
        rowValues,
        count: 0,
        totals: new Map<string, AggregateState>(),
        columns: new Map<string, Map<string, AggregateState>>(),
      };
      groups.set(rowKey, group);
    }

    group.count += 1;
    addValueAggregates(group.totals, row, valueFields);

    if (columnFields.length) {
      if (!columnMap.has(columnKey)) {
        columnMap.set(columnKey, {
          id: columnKey,
          label: makeLabel(columnValues, columnFields),
          values: columnValues,
        });
      }

      let columnAggregates = group.columns.get(columnKey);
      if (!columnAggregates) {
        columnAggregates = new Map<string, AggregateState>();
        group.columns.set(columnKey, columnAggregates);
      }
      addValueAggregates(columnAggregates, row, valueFields);
    }
  }

  const columns = Array.from(columnMap.values()).sort((left, right) => left.label.localeCompare(right.label));
  const isSingleValue = valueFields.length === 1;
  const rows: PivotRow[] = Array.from(groups.entries()).map(([groupKey, group]) => {
    const output: PivotRow = {
      id: groupKey,
      _groupKey: groupKey,
      _count: group.count,
    };

    for (const field of rowFields) output[field] = group.rowValues[field] ?? null;

    for (const column of columns) {
      const columnAggregates = group.columns.get(column.id);
      for (const valueConfig of valueFields) {
        const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
        output[getPivotValueColumnId(column.id, suffix)] = readAggregate(columnAggregates?.get(valueKey(valueConfig)), valueConfig.aggFunc);
      }
    }

    for (const valueConfig of valueFields) {
      const suffix = isSingleValue ? valueConfig.field : `${valueConfig.field}:${valueConfig.aggFunc}`;
      output[getPivotTotalColumnId(suffix)] = readAggregate(group.totals.get(valueKey(valueConfig)), valueConfig.aggFunc);
    }

    return output;
  });

  rows.sort((left, right) => String(left[rowFields[0]] ?? '').localeCompare(String(right[rowFields[0]] ?? '')));

  return {
    rows,
    columns,
    columnValues: columns.map((column) => column.label),
    rowFields,
    columnFields,
    valueFields,
    totalSourceRecords: data.length,
    filteredSourceRecords: data.length,
  };
}
