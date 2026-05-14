import type { PivotModel, PivotValueConfig } from './types';

function valueConfigKey(value: PivotValueConfig): string {
  return `${value.field}:${value.aggFunc}`;
}

export function normalizePivotValues(values: PivotValueConfig[]): PivotValueConfig[] {
  const seen = new Set<string>();
  const normalized: PivotValueConfig[] = [];

  for (const value of values) {
    if (!value.field || !value.aggFunc) continue;
    const key = valueConfigKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }

  return normalized;
}

export function normalizePivotModel(model: PivotModel): PivotModel {
  return {
    ...model,
    values: normalizePivotValues(model.values),
  };
}
