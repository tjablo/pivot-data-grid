import { describe, expect, it } from 'vitest';
import { createDrillDownRequestFromCell, getDrillDownRows } from '../core/drilldown';
import { autoDetectFields, buildDefaultModel } from '../core/fields';
import { applySourceFilters } from '../core/filters';
import { getPivotValueColumnId, pivotData } from '../core/pivot';
import { createPivotRequest } from '../core/request';
import type { PivotModel, RowData } from '../core/types';

const rows: RowData[] = [
  { product: 'Laptop', region: 'EMEA', amount: 100, date: '2026-01-01', rep: { name: 'Ada' } },
  { product: 'Laptop', region: 'AMER', amount: 200, date: '2026-01-02', rep: { name: 'Grace' } },
  { product: 'Monitor', region: 'EMEA', amount: 50, date: '2026-01-03', rep: { name: 'Ada' } },
  { product: 'Monitor', region: 'AMER', amount: 70, date: '2026-01-04', rep: { name: 'Linus' } },
];

const model: PivotModel = {
  rows: ['product'],
  columns: ['region'],
  values: [{ field: 'amount', aggFunc: 'sum' }],
};

describe('field helpers', () => {
  it('auto-detects nested fields and builds a useful default model', () => {
    const fields = autoDetectFields(rows);
    expect(fields.map((field) => field.field)).toContain('rep.name');
    expect(fields.find((field) => field.field === 'amount')?.role).toBe('value');

    const defaultModel = buildDefaultModel(fields);
    expect(defaultModel.rows.length).toBeGreaterThan(0);
    expect(defaultModel.values[0]?.field).toBe('amount');
  });
});

describe('filters', () => {
  it('applies text, numeric, range, and date filters', () => {
    expect(applySourceFilters(rows, [{ id: '1', field: 'product', operator: 'contains', value: 'lap' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '1a', field: 'product', operator: 'equals', value: 'Laptop' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '1b', field: 'product', operator: 'notEquals', value: 'Laptop' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '1c', field: 'product', operator: 'startsWith', value: 'Lap' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '1d', field: 'product', operator: 'endsWith', value: 'tor' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '2', field: 'amount', operator: 'greaterThan', value: '80' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '2b', field: 'amount', operator: 'lessThan', value: '80' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '3', field: 'amount', operator: 'between', value: '60', valueTo: '150' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '4', field: 'date', operator: 'after', value: '2026-01-02' }])).toHaveLength(2);
    expect(applySourceFilters(rows, [{ id: '4b', field: 'date', operator: 'before', value: '2026-01-03' }])).toHaveLength(2);
    expect(
      applySourceFilters(rows, [{ id: '4c', field: 'date', operator: 'between', value: '2026-01-02', valueTo: '2026-01-03' }]),
    ).toHaveLength(2);
    expect(applySourceFilters([{ value: '' }, { value: 'x' }], [{ id: '5', field: 'value', operator: 'isEmpty' }])).toHaveLength(1);
    expect(applySourceFilters([{ value: '' }, { value: 'x' }], [{ id: '6', field: 'value', operator: 'isNotEmpty' }])).toHaveLength(1);
  });
});

describe('pivotData', () => {
  it('aggregates rows by row and column dimensions', () => {
    const result = pivotData(rows, model);
    const laptop = result.rows.find((row) => row.product === 'Laptop');
    const emea = result.columns.find((column) => column.label === 'EMEA');

    expect(result.rows).toHaveLength(2);
    expect(result.columns.map((column) => column.label)).toEqual(['AMER', 'EMEA']);
    expect(laptop?._count).toBe(2);
    expect(emea).toBeDefined();
    if (!emea) throw new Error('EMEA column not found');
    expect(laptop?.[getPivotValueColumnId(emea.id, 'amount')]).toBe(100);
  });

  it('supports avg, min, max, and count aggregations', () => {
    const result = pivotData(rows, {
      rows: ['region'],
      columns: [],
      values: [
        { field: 'amount', aggFunc: 'avg' },
        { field: 'amount', aggFunc: 'min' },
        { field: 'amount', aggFunc: 'max' },
        { field: 'amount', aggFunc: 'count' },
      ],
    });
    const emea = result.rows.find((row) => row.region === 'EMEA');

    expect(emea?.['_total__amount%3Aavg']).toBe(75);
    expect(emea?.['_total__amount%3Amin']).toBe(50);
    expect(emea?.['_total__amount%3Amax']).toBe(100);
    expect(emea?.['_total__amount%3Acount']).toBe(2);
  });
});

describe('drilldown', () => {
  it('creates a drilldown request from a metric cell and returns matching source rows', () => {
    const result = pivotData(rows, model);
    const laptop = result.rows.find((row) => row.product === 'Laptop');
    const amer = result.columns.find((column) => column.label === 'AMER');

    expect(laptop).toBeDefined();
    expect(amer).toBeDefined();
    if (!laptop || !amer) throw new Error('Expected pivot row or column not found');

    const request = createDrillDownRequestFromCell(model, result, laptop, getPivotValueColumnId(amer.id, 'amount'));

    expect(request).toEqual({
      rowValues: { product: 'Laptop' },
      rowField: 'product',
      rowValue: 'Laptop',
      columnValues: { region: 'AMER' },
      valueField: 'amount',
      colField: 'region',
      colValue: 'AMER',
    });
    expect(request).toBeDefined();
    if (!request) throw new Error('Drilldown request not created');
    expect(getDrillDownRows(rows, request)).toEqual([rows[1]]);
  });
});

describe('backend request helper', () => {
  it('creates a serializable pivot request', () => {
    expect(createPivotRequest(model, [{ id: 'f', field: 'region', operator: 'equals', value: 'EMEA' }], { limit: 50 })).toEqual({
      model,
      filters: [{ id: 'f', field: 'region', operator: 'equals', value: 'EMEA' }],
      limit: 50,
    });
  });
});
