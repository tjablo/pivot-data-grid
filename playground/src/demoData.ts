import type { PivotFieldConfig, PivotModel, RowData } from '../../src';

const products = ['Notebook', 'Monitor', 'Keyboard', 'Dock', 'Headset', 'Webcam', 'Tablet', 'Router'];
const regions = ['AMER', 'EMEA', 'APAC', 'LATAM'];
const channels = ['Direct', 'Partner', 'Marketplace'];
const segments = ['SMB', 'Mid-market', 'Enterprise'];
const reps = ['Ada', 'Grace', 'Linus', 'Katherine', 'Margaret', 'Donald'];
const highPrecisionAmounts = [1250000.12345678, 9875432.87654321, -2500000.00000001, 42000000.12345678, 3333333.33333333];

export const fields: PivotFieldConfig[] = [
  { field: 'product', label: 'Product', role: 'dimension', type: 'string', copyable: true },
  { field: 'region', label: 'Region', role: 'dimension', type: 'string' },
  { field: 'channel', label: 'Channel', role: 'dimension', type: 'string' },
  { field: 'segment', label: 'Segment', role: 'dimension', type: 'string' },
  { field: 'salesRep.name', label: 'Sales rep', role: 'dimension', type: 'string', copyable: true },
  { field: 'amount', label: 'Amount', role: 'value', type: 'number', valueTone: 'signed' },
  { field: 'units', label: 'Units', role: 'value', type: 'number' },
  { field: 'orderedAt', label: 'Ordered at', role: 'filter-only', type: 'date' },
];

export const defaultPivotModel: PivotModel = {
  rows: ['product'],
  columns: ['region'],
  values: [{ field: 'amount', aggFunc: 'sum' }],
};

function pick<T>(items: T[], index: number, multiplier = 1): T {
  return items[(index * multiplier) % items.length];
}

export function formatPlaygroundNumber(value: unknown): string {
  if (value == null) return '-';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  const hasFraction = !Number.isInteger(numericValue);
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 8 : 0,
    maximumFractionDigits: hasFraction ? 8 : 0,
  });
}

export function createOrders(count = 1400): RowData[] {
  return Array.from({ length: count }, (_, index) => {
    const units = (index % 9) + 1;
    const base = 80 + (index % 17) * 23;
    const product = pick(products, index, 7);
    const region = pick(regions, index, 3);
    const segment = pick(segments, index, 5);
    const grossAmount = base * units + (segment === 'Enterprise' ? 420 : 0) + (region === 'APAC' ? 180 : 0);
    const standardAmount = product === 'Router' || index % 19 === 0 ? -Math.round(grossAmount * 0.72) : grossAmount;
    const amount = highPrecisionAmounts[index] ?? standardAmount;

    return {
      id: `ord-${String(index + 1).padStart(5, '0')}`,
      product,
      region,
      channel: pick(channels, index, 11),
      segment,
      amount,
      units,
      orderedAt: `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
      salesRep: {
        name: pick(reps, index, 13),
      },
    };
  });
}
