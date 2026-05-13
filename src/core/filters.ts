import { getNestedValue, toFiniteNumber, toTimestamp } from './access';
import type { RowData, SourceFilter } from './types';

function isEmpty(value: unknown): boolean {
  return value == null || value === '';
}

function compareText(value: unknown, expected?: string): { actual: string; expected: string } {
  return {
    actual: String(value ?? '').toLowerCase(),
    expected: String(expected ?? '').toLowerCase(),
  };
}

function passesBetween(value: unknown, from?: string, to?: string): boolean {
  const numericValue = toFiniteNumber(value);
  const numericFrom = toFiniteNumber(from);
  const numericTo = toFiniteNumber(to);
  if (numericValue != null && numericFrom != null && numericTo != null) {
    return numericValue >= numericFrom && numericValue <= numericTo;
  }

  const timestampValue = toTimestamp(value);
  const timestampFrom = toTimestamp(from);
  const timestampTo = toTimestamp(to);
  return (
    timestampValue != null &&
    timestampFrom != null &&
    timestampTo != null &&
    timestampValue >= timestampFrom &&
    timestampValue <= timestampTo
  );
}

function passesFilter(row: RowData, filter: SourceFilter): boolean {
  const value = getNestedValue(row, filter.field);
  const { actual, expected } = compareText(value, filter.value);

  switch (filter.operator) {
    case 'contains':
      return actual.includes(expected);
    case 'equals':
      return actual === expected;
    case 'notEquals':
      return actual !== expected;
    case 'startsWith':
      return actual.startsWith(expected);
    case 'endsWith':
      return actual.endsWith(expected);
    case 'isEmpty':
      return isEmpty(value);
    case 'isNotEmpty':
      return !isEmpty(value);
    case 'greaterThan': {
      const left = toFiniteNumber(value);
      const right = toFiniteNumber(filter.value);
      return left != null && right != null && left > right;
    }
    case 'lessThan': {
      const left = toFiniteNumber(value);
      const right = toFiniteNumber(filter.value);
      return left != null && right != null && left < right;
    }
    case 'between': {
      return passesBetween(value, filter.value, filter.valueTo);
    }
    case 'after': {
      const left = toTimestamp(value);
      const right = toTimestamp(filter.value);
      return left != null && right != null && left > right;
    }
    case 'before': {
      const left = toTimestamp(value);
      const right = toTimestamp(filter.value);
      return left != null && right != null && left < right;
    }
    default:
      return true;
  }
}

export function applySourceFilters(data: RowData[], filters: SourceFilter[] = []): RowData[] {
  const activeFilters = filters.filter((filter) => {
    if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') return true;
    if (filter.operator === 'between') {
      return filter.value !== undefined && filter.value !== '' && filter.valueTo !== undefined && filter.valueTo !== '';
    }
    return filter.value !== undefined && filter.value !== '';
  });

  if (!activeFilters.length) return data;
  return data.filter((row) => activeFilters.every((filter) => passesFilter(row, filter)));
}
