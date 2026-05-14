import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RowData } from '../core/types';
import type { DataGridColumn, DataGridProps, PaginationState, SortState } from './DataGrid.types';
import { dataGridBrowserService } from './DataGridBrowserService';
import { dataGridModelService } from './DataGridModelService';
import { resolveDataGridLabels } from './labels';
import { usePortalContainer } from './portalContext';
import { useElementWidth } from './useElementWidth';
import { useFloatingTooltip } from './useFloatingTooltip';
import { isElementTruncated, useIsTruncated } from './useIsTruncated';
import { useTimedCellFeedback } from './useTimedCellFeedback';

const COPY_FEEDBACK_DURATION_MS = 1200;

interface TruncatedContentProps {
  children: ReactNode;
  tooltip: string;
}

function CellContent({ children, tooltip }: TruncatedContentProps) {
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const isTruncated = useIsTruncated(contentRef, tooltip);

  return (
    <div className="pg-grid-cell-content" data-truncated={isTruncated || undefined}>
      <span ref={contentRef} className="pg-truncated-content" data-grid-tooltip={tooltip || undefined}>
        {children}
      </span>
    </div>
  );
}

function HeaderContent({ children, tooltip }: TruncatedContentProps) {
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const isTruncated = useIsTruncated(contentRef, tooltip);

  return (
    <span className="pg-header-label" data-truncated={isTruncated || undefined}>
      <span ref={contentRef} className="pg-truncated-content" data-grid-tooltip={tooltip || undefined}>
        {children}
      </span>
    </span>
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
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inheritedPortalContainer = usePortalContainer();
  const [localPortalContainer, setLocalPortalContainer] = useState<HTMLDivElement | null>(null);
  const portalContainer = inheritedPortalContainer ?? localPortalContainer;
  const setShellRef = useCallback((node: HTMLDivElement | null) => {
    shellRef.current = node;
    setLocalPortalContainer(node);
  }, []);
  const labels = useMemo(() => resolveDataGridLabels(labelOverrides), [labelOverrides]);
  const { tooltip, showTooltip, hideTooltip } = useFloatingTooltip();
  const tooltipAnchorRef = useRef<HTMLElement | null>(null);
  const normalizedPageSizeOptions = useMemo(() => dataGridModelService.normalizePageSizeOptions(pageSizeOptions), [pageSizeOptions]);
  const viewportWidth = useElementWidth(scrollRef);
  const [hiddenColumnIds, setHiddenColumnIds] = useState(() => new Set(initialHiddenColumnIds));
  const [internalSort, setInternalSort] = useState<SortState | null>(null);
  const { activeKey: copiedCellKey, showFeedback: showCopyFeedback } = useTimedCellFeedback(COPY_FEEDBACK_DURATION_MS);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(() => ({
    pageIndex: Math.max(0, Math.floor(defaultPaginationState?.pageIndex ?? 0)),
    pageSize: dataGridModelService.normalizePageSize(defaultPaginationState?.pageSize, normalizedPageSizeOptions),
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
      return (
        dataGridModelService.compareValues(
          dataGridModelService.getCellValue(left, sortColumn),
          dataGridModelService.getCellValue(right, sortColumn),
        ) * direction
      );
    });
  }, [activeSort, columns, isServerSort, rows]);

  const activePagination = paginationState ?? internalPagination;
  const isServerPagination = paginationMode === 'server';
  const rowCountForPagination = Math.max(0, isServerPagination ? (totalRows ?? sortedRows.length) : sortedRows.length);
  const activePageSize = dataGridModelService.normalizePageSize(activePagination.pageSize, normalizedPageSizeOptions);
  const pageCount = dataGridModelService.getPageCount(rowCountForPagination, activePageSize);
  const activePageIndex = dataGridModelService.normalizePageIndex(activePagination.pageIndex, pageCount);
  const pageStart = activePageIndex * activePageSize;
  const visibleRows = useMemo(
    () => (pagination && !isServerPagination ? sortedRows.slice(pageStart, pageStart + activePageSize) : sortedRows),
    [activePageSize, isServerPagination, pageStart, pagination, sortedRows],
  );
  const rowIndexOffset = pagination && !isServerPagination ? pageStart : 0;

  const setPaginationState = (nextState: PaginationState) => {
    const nextPageSize = dataGridModelService.normalizePageSize(nextState.pageSize, normalizedPageSizeOptions);
    const nextPageCount = dataGridModelService.getPageCount(rowCountForPagination, nextPageSize);
    const normalizedState = {
      pageIndex: dataGridModelService.normalizePageIndex(nextState.pageIndex, nextPageCount),
      pageSize: nextPageSize,
    };

    if (paginationState === undefined) setInternalPagination(normalizedState);
    onPaginationChange?.(normalizedState);
  };

  const baseColumnWidths = useMemo(() => visibleColumns.map((column) => dataGridModelService.getColumnWidth(column)), [visibleColumns]);
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

  useEffect(() => {
    const widthKey = columnWidths.join('|');
    if (widthKey || columnWidths.length === 0) columnVirtualizer.measure();
  }, [columnVirtualizer, columnWidths]);

  useEffect(() => {
    const pageKey = `${activePageIndex}:${activePageSize}`;
    if (pagination && pageKey) rowVirtualizer.scrollToIndex(0);
  }, [activePageIndex, activePageSize, pagination, rowVirtualizer]);

  const measuredRows = rowVirtualizer.getVirtualItems();
  const measuredColumns = columnVirtualizer.getVirtualItems();
  const virtualRows = measuredRows.length
    ? measuredRows
    : dataGridModelService.fallbackVirtualItems(visibleRows.length, rowHeight, overscan);
  const virtualColumns = measuredColumns.length ? measuredColumns : dataGridModelService.fallbackHorizontalItems(columnWidths);
  const columnStarts = useMemo(() => dataGridModelService.getColumnStarts(columnWidths), [columnWidths]);
  const normalizedFrozenColumnCount = dataGridModelService.normalizeFrozenColumnCount(frozenColumnCount, visibleColumns.length);
  const renderedColumns = useMemo(() => {
    const frozenColumns = dataGridModelService.fallbackHorizontalItems(columnWidths.slice(0, normalizedFrozenColumnCount));
    const scrollColumns = virtualColumns.filter((column) => column.index >= normalizedFrozenColumnCount);
    return [...frozenColumns, ...scrollColumns];
  }, [columnWidths, normalizedFrozenColumnCount, virtualColumns]);
  const skeletonRows = dataGridModelService.fallbackVirtualItems(skeletonRowCount, rowHeight, skeletonRowCount);

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
    const value = dataGridModelService.getCellValue(row, column);
    return column.format ? column.format(value, row) : String(value ?? '');
  };

  const getCopyValue = (row: T, column: DataGridColumn<T>, value: unknown) => {
    if (column.copyValue) return column.copyValue(value, row);
    return String(value ?? '');
  };

  const handleCellInteraction = (row: T, rowIndex: number, column: DataGridColumn<T>, value: unknown) => {
    if (dataGridBrowserService.hasActiveTextSelection()) return;
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
    void dataGridBrowserService.copyTextToClipboard(text).then(() => {
      showCopyFeedback(cellKey);
    });
  };

  const closeTooltip = useCallback(() => {
    tooltipAnchorRef.current = null;
    hideTooltip();
  }, [hideTooltip]);

  const handleGridMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        closeTooltip();
        return;
      }

      const anchor = target.closest<HTMLElement>('[data-grid-tooltip]');
      const tooltipText = anchor?.dataset.gridTooltip;
      if (!anchor || !tooltipText || !scrollRef.current?.contains(anchor) || !isElementTruncated(anchor)) {
        closeTooltip();
        return;
      }

      if (tooltipAnchorRef.current === anchor) return;
      tooltipAnchorRef.current = anchor;
      showTooltip(tooltipText, anchor, shellRef.current);
    },
    [closeTooltip, showTooltip],
  );

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
        onMouseMove={handleGridMouseMove}
        onMouseLeave={closeTooltip}
        onScroll={closeTooltip}
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
                <HeaderContent tooltip={dataGridModelService.getTooltipText(column.header, column.header)}>{column.header}</HeaderContent>
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
                      const value = dataGridModelService.getCellValue(row, column);
                      const isFrozen = virtualColumn.index < normalizedFrozenColumnCount;
                      const canCopy = Boolean(column.copyable || column.copyValue);
                      const copyValue = canCopy ? getCopyValue(row, column, value) : '';
                      const cellTone = dataGridModelService.resolveCellTone(row, column, value);
                      const cellKey = `${rowId}:${column.id}`;
                      const isCopied = copiedCellKey === cellKey;
                      const renderedCell = renderCell(row, column);
                      const tooltip = dataGridModelService.getTooltipText(value, renderedCell);
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
                              onClick={(event) => handleCopyClick(event, copyValue, cellKey)}
                            >
                              {isCopied ? <Check className="pg-copy-icon" aria-hidden /> : <Copy className="pg-copy-icon" aria-hidden />}
                            </button>
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

      {tooltip ? (
        <div
          className="pg-grid-tooltip"
          role="tooltip"
          data-placement={tooltip.placement}
          data-align={tooltip.align}
          style={{ left: tooltip.left, top: tooltip.top, maxWidth: tooltip.maxWidth }}
        >
          {tooltip.text}
        </div>
      ) : null}

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
