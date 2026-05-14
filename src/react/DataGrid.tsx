import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RowData } from '../core/types';
import type { DataGridCellTone, DataGridColumn, DataGridProps, PaginationState, SortState } from './DataGrid.types';
import { resolveDataGridLabels } from './labels';
import { usePortalContainer } from './portalContext';

const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100];
const COPY_FEEDBACK_DURATION_MS = 1200;

function getColumnWidth<T extends RowData>(column: DataGridColumn<T>): number {
  return column.width ?? column.minWidth ?? 160;
}

function getCellValue<T extends RowData>(row: T, column: DataGridColumn<T>): unknown {
  if (typeof column.accessor === 'function') return column.accessor(row);
  if (typeof column.accessor === 'string') return row[column.accessor];
  return row[column.id];
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  const leftNumber = typeof left === 'number' ? left : Number(left);
  const rightNumber = typeof right === 'number' ? right : Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function toToneNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmedValue)) return null;

  const numericValue = Number(trimmedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getSignedValueTone(value: unknown): DataGridCellTone | null {
  const numericValue = toToneNumber(value);
  if (numericValue == null) return null;
  if (numericValue > 0) return 'positive';
  if (numericValue < 0) return 'negative';
  return 'neutral';
}

function resolveCellTone<T extends RowData>(row: T, column: DataGridColumn<T>, value: unknown): DataGridCellTone | null {
  const valueTone = column.valueTone;
  if (!valueTone || valueTone === 'none') return null;
  if (valueTone === 'signed') return getSignedValueTone(value);
  return valueTone({ value, row, column }) ?? null;
}

function fallbackVirtualItems(count: number, size: number, limit = count) {
  return Array.from({ length: Math.min(count, limit) }, (_, index) => ({
    key: index,
    index,
    start: index * size,
    end: (index + 1) * size,
    size,
    lane: 0,
  }));
}

function fallbackHorizontalItems(widths: number[]) {
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

function normalizeFrozenColumnCount(count: number, columnCount: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.min(Math.max(0, Math.floor(count)), columnCount);
}

function getColumnStarts(widths: number[]): number[] {
  let start = 0;
  return widths.map((width) => {
    const current = start;
    start += width;
    return current;
  });
}

function normalizePageSizeOptions(options: number[] | undefined): number[] {
  const normalized = (options?.length ? options : DEFAULT_PAGE_SIZE_OPTIONS)
    .map((option) => Math.floor(option))
    .filter((option) => Number.isFinite(option) && option > 0);
  return Array.from(new Set(normalized)).sort((left, right) => left - right);
}

function normalizePageSize(pageSize: number | undefined, options: number[]): number {
  const fallback = options[0] ?? DEFAULT_PAGE_SIZE_OPTIONS[0];
  if (!Number.isFinite(pageSize)) return fallback;
  const normalized = Math.floor(Number(pageSize));
  return normalized > 0 ? normalized : fallback;
}

function getPageCount(totalRows: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, totalRows) / pageSize));
}

function normalizePageIndex(pageIndex: number | undefined, pageCount: number): number {
  if (!Number.isFinite(pageIndex)) return 0;
  return Math.min(Math.max(0, Math.floor(Number(pageIndex))), pageCount - 1);
}

function hasActiveTextSelection(): boolean {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return false;
  return Boolean(window.getSelection()?.toString());
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea fallback for restricted clipboard contexts.
    }
  }

  if (typeof document === 'undefined') return;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function getTooltipText(value: unknown, renderedValue: ReactNode): string {
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

function CellContent({ children, tooltip }: { children: ReactNode; tooltip: string }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || !tooltip) {
      setIsTruncated(false);
      return undefined;
    }

    const updateTruncation = () => {
      const nextIsTruncated = element.scrollWidth > element.clientWidth + 1;
      setIsTruncated((current) => (current === nextIsTruncated ? current : nextIsTruncated));
    };

    updateTruncation();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window === 'undefined') return undefined;
      window.addEventListener('resize', updateTruncation);
      return () => window.removeEventListener('resize', updateTruncation);
    }

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tooltip]);

  return (
    <div
      ref={contentRef}
      className="pg-grid-cell-content"
      data-truncated={isTruncated || undefined}
      title={isTruncated ? tooltip : undefined}
    >
      {children}
    </div>
  );
}

export function DataGrid<T extends RowData>({
  rows,
  columns,
  getRowId,
  height = 520,
  rowHeight = 36,
  headerHeight = 40,
  overscan = 8,
  className,
  style,
  loading = false,
  emptyMessage,
  showColumnMenu = true,
  initialHiddenColumnIds = [],
  sortState,
  onSortStateChange,
  sortMode = 'client',
  onCellClick,
  toolbarContent,
  skeletonRowCount = 9,
  frozenColumnCount = 0,
  pagination = false,
  paginationState,
  defaultPaginationState,
  pageSizeOptions,
  paginationMode = 'client',
  totalRows,
  onPaginationChange,
  labels: labelOverrides,
}: DataGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inheritedPortalContainer = usePortalContainer();
  const [localPortalContainer, setLocalPortalContainer] = useState<HTMLDivElement | null>(null);
  const portalContainer = inheritedPortalContainer ?? localPortalContainer;
  const setShellRef = useCallback((node: HTMLDivElement | null) => {
    setLocalPortalContainer(node);
  }, []);
  const labels = useMemo(() => resolveDataGridLabels(labelOverrides), [labelOverrides]);
  const normalizedPageSizeOptions = useMemo(() => normalizePageSizeOptions(pageSizeOptions), [pageSizeOptions]);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hiddenColumnIds, setHiddenColumnIds] = useState(() => new Set(initialHiddenColumnIds));
  const [internalSort, setInternalSort] = useState<SortState | null>(null);
  const [copiedCellKey, setCopiedCellKey] = useState<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(() => ({
    pageIndex: Math.max(0, Math.floor(defaultPaginationState?.pageIndex ?? 0)),
    pageSize: normalizePageSize(defaultPaginationState?.pageSize, normalizedPageSizeOptions),
  }));
  const activeSort = sortState === undefined ? internalSort : sortState;
  const isServerSort = sortMode === 'server';

  const visibleColumns = useMemo(() => columns.filter((column) => !hiddenColumnIds.has(column.id)), [columns, hiddenColumnIds]);

  const sortedRows = useMemo(() => {
    if (!activeSort || isServerSort) return rows;
    const sortColumn = columns.find((column) => column.id === activeSort.columnId);
    if (!sortColumn) return rows;

    return [...rows].sort((left, right) => {
      const direction = activeSort.direction === 'asc' ? 1 : -1;
      return compareValues(getCellValue(left, sortColumn), getCellValue(right, sortColumn)) * direction;
    });
  }, [activeSort, columns, isServerSort, rows]);

  const activePagination = paginationState ?? internalPagination;
  const isServerPagination = paginationMode === 'server';
  const rowCountForPagination = Math.max(0, isServerPagination ? (totalRows ?? sortedRows.length) : sortedRows.length);
  const activePageSize = normalizePageSize(activePagination.pageSize, normalizedPageSizeOptions);
  const pageCount = getPageCount(rowCountForPagination, activePageSize);
  const activePageIndex = normalizePageIndex(activePagination.pageIndex, pageCount);
  const pageStart = activePageIndex * activePageSize;
  const visibleRows = useMemo(
    () => (pagination && !isServerPagination ? sortedRows.slice(pageStart, pageStart + activePageSize) : sortedRows),
    [activePageSize, isServerPagination, pageStart, pagination, sortedRows],
  );
  const rowIndexOffset = pagination && !isServerPagination ? pageStart : 0;

  const setPaginationState = (nextState: PaginationState) => {
    const nextPageSize = normalizePageSize(nextState.pageSize, normalizedPageSizeOptions);
    const nextPageCount = getPageCount(rowCountForPagination, nextPageSize);
    const normalizedState = {
      pageIndex: normalizePageIndex(nextState.pageIndex, nextPageCount),
      pageSize: nextPageSize,
    };

    if (paginationState === undefined) setInternalPagination(normalizedState);
    onPaginationChange?.(normalizedState);
  };

  const baseColumnWidths = useMemo(() => visibleColumns.map(getColumnWidth), [visibleColumns]);
  const baseTotalWidth = baseColumnWidths.reduce((total, width) => total + width, 0);
  const columnWidths = useMemo(() => {
    if (!visibleColumns.length || viewportWidth <= baseTotalWidth) return baseColumnWidths;

    const extraWidth = viewportWidth - baseTotalWidth;
    const extraPerColumn = extraWidth / visibleColumns.length;
    return baseColumnWidths.map((width, index) => {
      const maxWidth = visibleColumns[index]?.maxWidth;
      const stretchedWidth = width + extraPerColumn;
      return maxWidth ? Math.min(stretchedWidth, maxWidth) : stretchedWidth;
    });
  }, [baseColumnWidths, baseTotalWidth, viewportWidth, visibleColumns]);
  const totalWidth = Math.max(
    columnWidths.reduce((total, width) => total + width, 0),
    viewportWidth,
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setViewportWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => columnWidths[index] ?? 160,
    overscan: 2,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: remeasure when computed column widths change.
  useEffect(() => {
    columnVirtualizer.measure();
  }, [columnVirtualizer, columnWidths]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset scroll position when the active page changes.
  useEffect(() => {
    if (pagination) rowVirtualizer.scrollToIndex(0);
  }, [activePageIndex, activePageSize, pagination, rowVirtualizer]);

  useEffect(
    () => () => {
      if (copyFeedbackTimeoutRef.current) window.clearTimeout(copyFeedbackTimeoutRef.current);
    },
    [],
  );

  const measuredRows = rowVirtualizer.getVirtualItems();
  const measuredColumns = columnVirtualizer.getVirtualItems();
  const virtualRows = measuredRows.length ? measuredRows : fallbackVirtualItems(visibleRows.length, rowHeight, overscan);
  const virtualColumns = measuredColumns.length ? measuredColumns : fallbackHorizontalItems(columnWidths);
  const columnStarts = useMemo(() => getColumnStarts(columnWidths), [columnWidths]);
  const normalizedFrozenColumnCount = normalizeFrozenColumnCount(frozenColumnCount, visibleColumns.length);
  const renderedColumns = useMemo(() => {
    const frozenColumns = fallbackHorizontalItems(columnWidths.slice(0, normalizedFrozenColumnCount));
    const scrollColumns = virtualColumns.filter((column) => column.index >= normalizedFrozenColumnCount);
    return [...frozenColumns, ...scrollColumns];
  }, [columnWidths, normalizedFrozenColumnCount, virtualColumns]);
  const skeletonRows = fallbackVirtualItems(skeletonRowCount, rowHeight, skeletonRowCount);

  const setSort = (column: DataGridColumn<T>) => {
    if (!column.sortable) return;
    const nextSort: SortState | null =
      activeSort?.columnId === column.id
        ? activeSort.direction === 'asc'
          ? { columnId: column.id, direction: 'desc' }
          : null
        : { columnId: column.id, direction: 'asc' };

    if (sortState === undefined) setInternalSort(nextSort);
    onSortStateChange?.(nextSort);
    if (pagination) setPaginationState({ pageIndex: 0, pageSize: activePageSize });
  };

  const setPageSize = (pageSize: string) => {
    setPaginationState({ pageIndex: 0, pageSize: Number(pageSize) });
  };

  const toggleColumn = (columnId: string, checked: boolean) => {
    setHiddenColumnIds((current) => {
      const next = new Set(current);
      if (checked) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const renderCell = (row: T, column: DataGridColumn<T>) => {
    if (column.cell) return column.cell(row);
    const value = getCellValue(row, column);
    return column.format ? column.format(value, row) : String(value ?? '');
  };

  const getCopyValue = (row: T, column: DataGridColumn<T>, value: unknown) => {
    if (column.copyValue) return column.copyValue(value, row);
    return String(value ?? '');
  };

  const handleCellInteraction = (row: T, rowIndex: number, column: DataGridColumn<T>, value: unknown) => {
    if (hasActiveTextSelection()) return;
    onCellClick?.({ row, rowIndex, column, value });
  };

  const handleCellKeyDown = (event: KeyboardEvent<HTMLDivElement>, row: T, rowIndex: number, column: DataGridColumn<T>, value: unknown) => {
    if (!onCellClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    handleCellInteraction(row, rowIndex, column, value);
  };

  const handleCopyClick = (event: MouseEvent<HTMLButtonElement>, text: string, cellKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    void copyTextToClipboard(text).then(() => {
      setCopiedCellKey(cellKey);
      if (copyFeedbackTimeoutRef.current) window.clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopiedCellKey((current) => (current === cellKey ? null : current));
        copyFeedbackTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    });
  };

  return (
    <div ref={setShellRef} className={clsx('pg-root', 'pg-data-grid-shell', className)} style={style}>
      {(showColumnMenu && columns.length > 0) || toolbarContent ? (
        <div className="pg-grid-actions">
          {toolbarContent ? <div className="pg-grid-toolbar-content">{toolbarContent}</div> : <div />}
          {showColumnMenu && columns.length > 0 ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="pg-button pg-columns-button" type="button">
                {labels.columnMenu}
                <ChevronDown className="pg-button-icon" aria-hidden />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal container={portalContainer ?? undefined}>
                <DropdownMenu.Content className="pg-menu" align="end" sideOffset={10}>
                  {columns.map((column) => (
                    <DropdownMenu.CheckboxItem
                      key={column.id}
                      className="pg-menu-item"
                      checked={!hiddenColumnIds.has(column.id)}
                      onCheckedChange={(checked) => toggleColumn(column.id, Boolean(checked))}
                    >
                      <DropdownMenu.ItemIndicator className="pg-menu-indicator">
                        <Check className="pg-check-icon" aria-hidden />
                      </DropdownMenu.ItemIndicator>
                      {column.header}
                    </DropdownMenu.CheckboxItem>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="pg-data-grid"
        style={{ height }}
        role="grid"
        aria-rowcount={pagination ? rowCountForPagination : sortedRows.length}
        aria-colcount={visibleColumns.length}
        aria-busy={loading || undefined}
      >
        <div className="pg-grid-header" style={{ height: headerHeight, width: totalWidth }}>
          {renderedColumns.map((virtualColumn) => {
            const column = visibleColumns[virtualColumn.index];
            const isSorted = activeSort?.columnId === column.id;
            const sortDirection = isSorted ? activeSort?.direction : null;
            const isFrozen = virtualColumn.index < normalizedFrozenColumnCount;
            return (
              <button
                key={column.id}
                type="button"
                role="columnheader"
                className={clsx('pg-grid-header-cell', column.headerClassName, {
                  'pg-grid-header-cell-frozen': isFrozen,
                })}
                style={{
                  width: virtualColumn.size,
                  height: headerHeight,
                  ...(isFrozen ? { left: columnStarts[virtualColumn.index] ?? 0 } : { transform: `translateX(${virtualColumn.start}px)` }),
                  justifyContent: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start',
                }}
                onClick={() => setSort(column)}
                aria-sort={sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <span className="pg-header-label">{column.header}</span>
                {sortDirection ? (
                  <span
                    className={clsx('pg-sort-indicator', {
                      'pg-sort-indicator-active': Boolean(sortDirection),
                    })}
                    aria-hidden="true"
                  >
                    {sortDirection === 'asc' ? <ArrowUp className="pg-sort-icon" /> : <ArrowDown className="pg-sort-icon" />}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className="pg-grid-body"
          style={{
            height: loading ? skeletonRowCount * rowHeight : rowVirtualizer.getTotalSize(),
            width: totalWidth,
          }}
        >
          {loading
            ? skeletonRows.map((virtualRow) => (
                <div
                  key={`skeleton-${virtualRow.index}`}
                  className="pg-grid-row pg-grid-skeleton-row"
                  role="row"
                  aria-rowindex={virtualRow.index + 1}
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: totalWidth,
                  }}
                >
                  {renderedColumns.map((virtualColumn) => {
                    const isFrozen = virtualColumn.index < normalizedFrozenColumnCount;
                    return (
                      <div
                        key={`skeleton-${virtualRow.index}-${virtualColumn.index}`}
                        role="gridcell"
                        className={clsx('pg-grid-cell pg-grid-skeleton-cell', {
                          'pg-grid-cell-frozen': isFrozen,
                        })}
                        style={{
                          width: virtualColumn.size,
                          height: virtualRow.size,
                          ...(isFrozen
                            ? { left: columnStarts[virtualColumn.index] ?? 0 }
                            : { transform: `translateX(${virtualColumn.start}px)` }),
                        }}
                      >
                        <span className="pg-skeleton-block" />
                      </div>
                    );
                  })}
                </div>
              ))
            : virtualRows.map((virtualRow) => {
                const row = visibleRows[virtualRow.index];
                const rowIndex = rowIndexOffset + virtualRow.index;
                const rowId = getRowId?.(row, rowIndex) ?? rowIndex;
                return (
                  <div
                    key={rowId}
                    className="pg-grid-row"
                    role="row"
                    aria-rowindex={rowIndex + 1}
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: totalWidth,
                    }}
                  >
                    {renderedColumns.map((virtualColumn) => {
                      const column = visibleColumns[virtualColumn.index];
                      const value = getCellValue(row, column);
                      const isFrozen = virtualColumn.index < normalizedFrozenColumnCount;
                      const canCopy = Boolean(column.copyable || column.copyValue);
                      const copyValue = canCopy ? getCopyValue(row, column, value) : '';
                      const cellTone = resolveCellTone(row, column, value);
                      const cellKey = `${rowId}:${column.id}`;
                      const isCopied = copiedCellKey === cellKey;
                      const renderedCell = renderCell(row, column);
                      const tooltip = getTooltipText(value, renderedCell);
                      return (
                        <div
                          key={`${rowId}-${column.id}`}
                          role="gridcell"
                          className={clsx(
                            'pg-grid-cell',
                            column.className,
                            {
                              'pg-grid-cell-right': column.align === 'right',
                              'pg-grid-cell-center': column.align === 'center',
                              'pg-grid-cell-clickable': Boolean(onCellClick),
                              'pg-grid-cell-copyable': canCopy,
                              'pg-grid-cell-copy-confirmed': isCopied,
                              'pg-grid-cell-frozen': isFrozen,
                            },
                            cellTone ? `pg-grid-cell-tone-${cellTone}` : undefined,
                          )}
                          tabIndex={onCellClick ? 0 : undefined}
                          style={{
                            width: virtualColumn.size,
                            height: virtualRow.size,
                            ...(isFrozen
                              ? { left: columnStarts[virtualColumn.index] ?? 0 }
                              : { transform: `translateX(${virtualColumn.start}px)` }),
                          }}
                          onClick={() => handleCellInteraction(row, rowIndex, column, value)}
                          onKeyDown={(event) => handleCellKeyDown(event, row, rowIndex, column, value)}
                        >
                          <CellContent tooltip={tooltip}>{renderedCell}</CellContent>
                          {canCopy ? (
                            <button
                              className={clsx('pg-copy-button', {
                                'pg-copy-button-copied': isCopied,
                              })}
                              type="button"
                              aria-label={isCopied ? labels.copiedCellValue : labels.copyCellValue}
                              title={isCopied ? labels.copiedCellValue : labels.copyCellValue}
                              onClick={(event) => handleCopyClick(event, copyValue, cellKey)}
                            >
                              {isCopied ? <Check className="pg-copy-icon" aria-hidden /> : <Copy className="pg-copy-icon" aria-hidden />}
                            </button>
                          ) : null}
                          {isCopied ? (
                            <span className="pg-copy-status" role="status">
                              {labels.copiedCellValue}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
        </div>

        {!loading && visibleRows.length === 0 ? <div className="pg-grid-empty">{emptyMessage ?? labels.noRows}</div> : null}
      </div>

      {pagination ? (
        <nav className="pg-pagination" aria-label={labels.pagination}>
          <div className="pg-pagination-page-size">
            <span>{labels.rowsPerPage}</span>
            <Select.Root value={String(activePageSize)} onValueChange={setPageSize}>
              <Select.Trigger className="pg-select-trigger pg-pagination-select-trigger" aria-label={labels.rowsPerPage}>
                <Select.Value />
                <Select.Icon className="pg-select-icon">
                  <ChevronDown className="pg-control-icon" aria-hidden />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal container={portalContainer ?? undefined}>
                <Select.Content className="pg-select-content pg-pagination-select-content" position="popper" sideOffset={8}>
                  <Select.Viewport className="pg-select-viewport">
                    {normalizedPageSizeOptions.map((option) => (
                      <Select.Item className="pg-select-item" key={option} value={String(option)}>
                        <Select.ItemText>{option}</Select.ItemText>
                        <Select.ItemIndicator className="pg-select-indicator">
                          <Check className="pg-check-icon" aria-hidden />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <span className="pg-pagination-status">{labels.paginationPageStatus(activePageIndex + 1, pageCount, rowCountForPagination)}</span>
          <div className="pg-pagination-controls">
            <button
              className="pg-pagination-button"
              type="button"
              aria-label={labels.paginationPreviousPage}
              disabled={activePageIndex === 0}
              onClick={() => setPaginationState({ pageIndex: activePageIndex - 1, pageSize: activePageSize })}
            >
              <ChevronLeft className="pg-action-icon" aria-hidden />
            </button>
            <button
              className="pg-pagination-button"
              type="button"
              aria-label={labels.paginationNextPage}
              disabled={activePageIndex >= pageCount - 1}
              onClick={() => setPaginationState({ pageIndex: activePageIndex + 1, pageSize: activePageSize })}
            >
              <ChevronRight className="pg-action-icon" aria-hidden />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
