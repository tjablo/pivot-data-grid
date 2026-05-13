import type { RowData } from './types';

export const EMPTY_VALUE_LABEL = 'N/A';

export function getNestedValue(row: RowData, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') return undefined;
    return (current as RowData)[segment];
  }, row);
}

export function stringifyValue(value: unknown): string {
  if (value == null || value === '') return EMPTY_VALUE_LABEL;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
