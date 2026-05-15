import type { ReactNode } from 'react';
import { toBigNumber } from '../core/access';
import type { RowData } from '../core/types';
import type { DataGridCellTone, DataGridColumn } from './DataGrid.types';

export const DEFAULT_DATA_GRID_PAGE_SIZE_OPTIONS = [25, 50, 100];

function getSignedValueTone(value: unknown): DataGridCellTone | null {
  const numericValue = toBigNumber(value);
  if (numericValue == null) return null;
  if (numericValue.gt(0)) return 'positive';
  if (numericValue.lt(0)) return 'negative';
  return 'neutral';
}

export class DataGridModelService {
  getColumnWidth<T extends RowData>(column: DataGridColumn<T>): number {
    const baseWidth = column.width ?? column.minWidth ?? 160;
    const minWidth = column.minWidth ?? 0;
    const maxWidth = column.maxWidth ?? Number.POSITIVE_INFINITY;
    return Math.max(minWidth, Math.min(baseWidth, maxWidth));
  }

  getCellValue<T extends RowData>(row: T, column: DataGridColumn<T>): unknown {
    if (typeof column.accessor === 'function') return column.accessor(row);
    if (typeof column.accessor === 'string') return row[column.accessor];
    return row[column.id];
  }

  compareValues(left: unknown, right: unknown): number {
    if (left == null && right == null) return 0;
    if (left == null) return -1;
    if (right == null) return 1;

    const leftNumber = toBigNumber(left);
    const rightNumber = toBigNumber(right);
    if (leftNumber != null && rightNumber != null) return leftNumber.cmp(rightNumber);

    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
  }

  resolveCellTone<T extends RowData>(row: T, column: DataGridColumn<T>, value: unknown): DataGridCellTone | null {
    const valueTone = column.valueTone;
    if (!valueTone || valueTone === 'none') return null;
    if (valueTone === 'signed') return getSignedValueTone(value);
    return valueTone({ value, row, column }) ?? null;
  }

  fallbackVirtualItems(count: number, size: number, limit = count) {
    return Array.from({ length: Math.min(count, limit) }, (_, index) => ({
      key: index,
      index,
      start: index * size,
      end: (index + 1) * size,
      size,
      lane: 0,
    }));
  }

  fallbackHorizontalItems(widths: number[]) {
    let start = 0;
    return widths.map((size, index) => {
      const item = {
        key: index,
        index,
        start,
        end: start + size,
        size,
        lane: 0,
      };
      start += size;
      return item;
    });
  }

  normalizeFrozenColumnCount(count: number, columnCount: number): number {
    if (!Number.isFinite(count)) return 0;
    return Math.min(Math.max(0, Math.floor(count)), columnCount);
  }

  getColumnStarts(widths: number[]): number[] {
    let start = 0;
    return widths.map((width) => {
      const current = start;
      start += width;
      return current;
    });
  }

  normalizePageSizeOptions(options: number[] | undefined): number[] {
    const normalized = (options?.length ? options : DEFAULT_DATA_GRID_PAGE_SIZE_OPTIONS)
      .map((option) => Math.floor(option))
      .filter((option) => Number.isFinite(option) && option > 0);
    return Array.from(new Set(normalized)).sort((left, right) => left - right);
  }

  normalizePageSize(pageSize: number | undefined, options: number[]): number {
    const fallback = options[0] ?? DEFAULT_DATA_GRID_PAGE_SIZE_OPTIONS[0];
    if (!Number.isFinite(pageSize)) return fallback;
    const normalized = Math.floor(Number(pageSize));
    return normalized > 0 ? normalized : fallback;
  }

  getPageCount(totalRows: number, pageSize: number): number {
    return Math.max(1, Math.ceil(Math.max(0, totalRows) / pageSize));
  }

  normalizePageIndex(pageIndex: number | undefined, pageCount: number): number {
    if (!Number.isFinite(pageIndex)) return 0;
    return Math.min(Math.max(0, Math.floor(Number(pageIndex))), pageCount - 1);
  }

  getTooltipText(value: unknown, renderedValue: ReactNode): string {
    if (typeof renderedValue === 'string' || typeof renderedValue === 'number') return String(renderedValue);
    if (Array.isArray(renderedValue)) {
      return renderedValue
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : ''))
        .filter(Boolean)
        .join(' ');
    }
    if (value == null) return '';
    return String(value);
  }
}

export const dataGridModelService = new DataGridModelService();
