import { getNestedValue } from './access';
import type { FieldRole, FieldType, PivotFieldConfig, PivotModel, RowData } from './types';

function capitalizeLabel(field: string): string {
  return (field.split('.').pop() ?? field)
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (ch) => ch.toUpperCase())
    .trim();
}

function inferType(value: unknown): FieldType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && value.trim() !== '') return 'number';
    if (!Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  }
  return 'string';
}

function inferRole(type: FieldType): FieldRole {
  return type === 'number' ? 'value' : 'dimension';
}

function extractKeys(row: RowData, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(row)) {
    if (key.startsWith('_')) continue;
    const value = row[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      keys.push(...extractKeys(value as RowData, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

export function normalizeFields(fields: PivotFieldConfig[]): PivotFieldConfig[] {
  return fields.map((field) => ({
    ...field,
    label: field.label ?? capitalizeLabel(field.field),
    type: field.type ?? 'string',
    role: field.role ?? 'all',
  }));
}

export function autoDetectFields(data: RowData[], explicitFields?: PivotFieldConfig[]): PivotFieldConfig[] {
  if (explicitFields && explicitFields.length > 0) return normalizeFields(explicitFields);
  if (!data.length) return [];

  const sampleKeys = extractKeys(data[0]);
  return sampleKeys.map((field) => {
    const sampleValue = data.map((row) => getNestedValue(row, field)).find((value) => value != null);
    const type = inferType(sampleValue);
    return {
      field,
      label: capitalizeLabel(field),
      type,
      role: inferRole(type),
    };
  });
}

export function buildDefaultModel(fields: PivotFieldConfig[]): PivotModel {
  const normalized = normalizeFields(fields);
  const dimensions = normalized.filter((field) => field.role === 'dimension' || field.role === 'all');
  const values = normalized.filter((field) => field.role === 'value' || field.role === 'all');
  const numericValue = values.find((field) => field.type === 'number') ?? values[0];

  return {
    rows: dimensions[0] ? [dimensions[0].field] : [],
    columns: dimensions[1] ? [dimensions[1].field] : [],
    values: numericValue ? [{ field: numericValue.field, aggFunc: 'sum' }] : [],
  };
}
