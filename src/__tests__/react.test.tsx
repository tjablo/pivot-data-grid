import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { pivotData } from '../core/pivot';
import type { PivotFieldConfig, PivotMetricValue, PivotModel, RowData, SourceFilter } from '../core/types';
import { DataGrid } from '../react/DataGrid';
import { DataGridModelService } from '../react/DataGridModelService';
import { PivotTable } from '../react/PivotTable';
import type { PivotTableFieldConfig, PivotValueFormatContext } from '../react/PivotTable.types';

const rows: RowData[] = [
  { product: 'Laptop', region: 'EMEA', amount: 100, orderedAt: '2026-01-01' },
  { product: 'Laptop', region: 'AMER', amount: 200, orderedAt: '2026-01-02' },
  { product: 'Monitor', region: 'EMEA', amount: 50, orderedAt: '2026-01-03' },
];

const fields: PivotFieldConfig[] = [
  { field: 'product', label: 'Product', role: 'dimension', type: 'string' },
  { field: 'region', label: 'Region', role: 'dimension', type: 'string' },
  { field: 'amount', label: 'Amount', role: 'value', type: 'number', valueTone: 'signed' },
  { field: 'orderedAt', label: 'Ordered at', role: 'filter-only', type: 'date' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
}

describe('DataGrid', () => {
  it('sorts large numeric strings without losing precision', () => {
    const service = new DataGridModelService();

    expect(service.compareValues('9007199254740993', '9007199254740992')).toBe(1);
    expect(service.compareValues('9007199254740992', '9007199254740993')).toBe(-1);
    expect(service.compareValues('9007199254740993.1', '9007199254740993.01')).toBe(1);
  });

  it('renders rows, allows copyable cells, and sorts when a sortable header is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const gridRows = [...rows, { product: 'Refund', region: 'AMER', amount: -25, orderedAt: '2026-01-04' }];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <DataGrid
        rows={gridRows}
        showColumnMenu={false}
        frozenColumnCount={1}
        columns={[
          { id: 'product', header: 'Product', accessor: 'product', sortable: true, copyable: true },
          { id: 'amount', header: 'Amount', accessor: 'amount', sortable: true, align: 'right', copyable: true, valueTone: 'signed' },
        ]}
      />,
    );

    expect(screen.getAllByText('Laptop')).toHaveLength(2);
    expect(screen.getByRole('grid').closest('.pg-data-grid-shell')).toHaveClass('pg-root');
    expect(screen.getAllByText('Laptop')[0].closest('[role="gridcell"]')).toHaveClass('pg-grid-cell-frozen');
    expect(screen.getByText('100').closest('[role="gridcell"]')).toHaveClass('pg-grid-cell-tone-positive');
    expect(screen.getByText('-25').closest('[role="gridcell"]')).toHaveClass('pg-grid-cell-tone-negative');
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy cell value' })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Laptop'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copied' })).not.toHaveAttribute('title');
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy cell value' }).at(-1) as HTMLElement);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('-25'));

    const amountHeader = screen.getByRole('columnheader', { name: /Amount/ });
    expect(amountHeader.querySelector('.pg-sort-indicator')).toBeNull();

    fireEvent.click(amountHeader);
    expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(amountHeader.querySelector('.pg-sort-indicator')).not.toBeNull();

    fireEvent.click(amountHeader);
    expect(amountHeader).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(amountHeader);
    expect(amountHeader).toHaveAttribute('aria-sort', 'none');
    expect(amountHeader.querySelector('.pg-sort-indicator')).toBeNull();
  });

  it('shows a custom tooltip when grid text is truncated', async () => {
    const longHeader = 'Very long transaction header that should be truncated';
    const longValue = 'Very long transaction identifier that should be truncated';
    const rightEdgeValue = 'Right edge transaction value that should stay anchored';
    const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => 240,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 40,
    });
    HTMLElement.prototype.getBoundingClientRect = function getTestRect() {
      if (this.classList.contains('pg-data-grid-shell')) return rect(100, 200, 600, 520);
      if (this.dataset.gridTooltip === longHeader) return rect(170, 260, 130, 16);
      if (this.dataset.gridTooltip === longValue) return rect(132, 304, 220, 16);
      if (this.dataset.gridTooltip === rightEdgeValue) return rect(610, 304, 70, 16);
      return getBoundingClientRect.call(this);
    };

    try {
      render(
        <DataGrid
          rows={[{ id: longValue, edge: rightEdgeValue }]}
          columns={[
            { id: 'id', header: longHeader, accessor: 'id', width: 80 },
            { id: 'edge', header: 'Edge', accessor: 'edge', width: 80 },
          ]}
          showColumnMenu={false}
        />,
      );

      const header = screen.getByText(longHeader).closest('.pg-header-label');
      const content = screen.getByText(longValue).closest('.pg-grid-cell-content');
      await waitFor(() => expect(header).toHaveAttribute('data-truncated', 'true'));
      await waitFor(() => expect(content).toHaveAttribute('data-truncated', 'true'));
      expect(header).not.toHaveAttribute('title');
      expect(content).not.toHaveAttribute('title');

      fireEvent.mouseMove(screen.getByText(longHeader));
      const headerTooltip = await screen.findByRole('tooltip');
      expect(headerTooltip).toHaveTextContent(longHeader);
      expect(headerTooltip).toHaveStyle({ left: '70px', top: '52px', maxWidth: '420px' });
      expect(headerTooltip).toHaveAttribute('data-placement', 'top');
      expect(headerTooltip).toHaveAttribute('data-align', 'left');

      fireEvent.mouseLeave(screen.getByRole('grid'));
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

      fireEvent.mouseMove(screen.getByText(longValue));
      expect(await screen.findByRole('tooltip')).toHaveTextContent(longValue);

      fireEvent.mouseMove(screen.getByText(rightEdgeValue));
      const rightTooltip = await screen.findByRole('tooltip');
      expect(rightTooltip).toHaveTextContent(rightEdgeValue);
      expect(rightTooltip).toHaveStyle({ left: '580px', top: '96px', maxWidth: '420px' });
      expect(rightTooltip).toHaveAttribute('data-align', 'right');
    } finally {
      if (scrollWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor);
      else delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;

      if (clientWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
      else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;

      HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
    }
  });

  it('paginates rows and allows changing rows per page', async () => {
    render(
      <DataGrid
        rows={[
          { product: 'Alpha', amount: 10 },
          { product: 'Beta', amount: 20 },
          { product: 'Gamma', amount: 30 },
          { product: 'Delta', amount: 40 },
        ]}
        columns={[
          { id: 'product', header: 'Product', accessor: 'product' },
          { id: 'amount', header: 'Amount', accessor: 'amount', align: 'right' },
        ]}
        showColumnMenu={false}
        pagination
        defaultPaginationState={{ pageSize: 2 }}
        pageSizeOptions={[2, 3]}
      />,
    );

    expect(screen.getByText('Page 1 of 2 (4 rows)')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 2 (4 rows)')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    const pageSizeOption = await screen.findByRole('option', { name: '3' });
    expect(pageSizeOption.closest('.pg-data-grid-shell')).not.toBeNull();
    fireEvent.click(pageSizeOption);
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('uses default pagination settings when only pagination is enabled', () => {
    render(
      <DataGrid
        rows={Array.from({ length: 30 }, (_, index) => ({ id: `row-${index + 1}` }))}
        columns={[{ id: 'id', header: 'ID', accessor: 'id' }]}
        showColumnMenu={false}
        pagination
      />,
    );

    expect(screen.getByText('Page 1 of 2 (30 rows)')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveTextContent('25');
  });
});

describe('PivotTable', () => {
  it('renders a client-side pivot and opens drill-in rows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <PivotTable
        data={rows}
        fields={fields.map((field) => (field.field === 'amount' ? { ...field, copyable: true } : field))}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="orders"
      />,
    );

    expect(screen.getByText('3 orders')).toBeInTheDocument();
    expect(screen.getByText('2 groups')).toBeInTheDocument();

    const grid = screen.getByRole('grid');
    const amountCell = within(grid).getAllByRole('gridcell', { name: '200' })[0];
    expect(amountCell).toHaveClass('pg-grid-cell-tone-positive');
    fireEvent.click(within(amountCell).getByRole('button', { name: 'Copy cell value' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('200'));
    fireEvent.click(amountCell);

    const drilldown = await screen.findByRole('region', { name: 'Drilldown rows' });
    const drilldownGrid = within(drilldown).getByRole('grid');
    expect(screen.getByRole('heading', { name: 'Product: Laptop / Region: AMER' })).toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('columnheader', { name: 'Product' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('gridcell', { name: 'Laptop' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('gridcell', { name: 'AMER' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).getByRole('gridcell', { name: '200' })).toBeInTheDocument();
  });

  it('passes value formatter context for generated metric columns', () => {
    const formatValue = vi.fn((value: PivotMetricValue, columnId: string, context: PivotValueFormatContext) => {
      if (context.kind === 'count') return `count:${columnId}:${value}`;
      const scope = context.kind === 'value' ? context.pivotColumn?.label : 'total';
      return `${context.kind}:${scope}:${context.field}:${context.aggFunc}:${value}`;
    });

    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        formatValue={formatValue}
        pagination={false}
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'count:_count:2' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'value:AMER:amount:sum:200' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'total:total:amount:sum:300' })).toBeInTheDocument();
    expect(formatValue).toHaveBeenCalledWith(
      200,
      'pivot__AMER__amount',
      expect.objectContaining({
        aggFunc: 'sum',
        columnId: 'pivot__AMER__amount',
        field: 'amount',
        kind: 'value',
        pivotColumn: expect.objectContaining({ label: 'AMER' }),
        valueConfig: { field: 'amount', aggFunc: 'sum' },
      }),
    );
    expect(formatValue).toHaveBeenCalledWith(
      300,
      '_total__amount',
      expect.objectContaining({ aggFunc: 'sum', columnId: '_total__amount', field: 'amount', kind: 'total' }),
    );
    expect(formatValue).toHaveBeenCalledWith(2, '_count', expect.objectContaining({ columnId: '_count', kind: 'count' }));
  });

  it('renders custom field cells for pivot row fields and drilldown source fields', async () => {
    const renderProductField = vi.fn(({ value, location }) => (
      <span data-testid={`pivot-product-${String(value)}`}>SKU {String(value)} {location}</span>
    ));
    const renderAmountField = vi.fn(({ value, location }) => (
      <span data-testid={`source-amount-${String(value)}`}>source amount {String(value)} {location}</span>
    ));
    const richFields: PivotTableFieldConfig[] = fields.map((field) => {
      if (field.field === 'product') {
        return {
          ...field,
          renderFieldCell: renderProductField,
        };
      }
      if (field.field === 'amount') {
        return {
          ...field,
          renderFieldCell: renderAmountField,
        };
      }
      return field;
    });

    render(
      <PivotTable
        data={rows}
        fields={richFields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        pagination={false}
      />,
    );

    expect(screen.getByTestId('pivot-product-Laptop')).toBeInTheDocument();
    expect(renderProductField).toHaveBeenCalledWith(expect.objectContaining({ location: 'pivot-row', value: 'Laptop' }));
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell', { name: '200' })[0]).toBeInTheDocument();
    expect(screen.queryByTestId('source-amount-200')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('grid')).getAllByRole('gridcell', { name: '200' })[0]);

    const drilldown = await screen.findByRole('region', { name: 'Drilldown rows' });
    expect(within(drilldown).getByTestId('source-amount-200')).toBeInTheDocument();
    expect(renderAmountField).toHaveBeenCalledWith(expect.objectContaining({ location: 'drilldown', value: 200 }));
  });

  it('renders custom field cells for generated pivot column headers', () => {
    const renderProductField = vi.fn(({ value, location }) => (
      <span data-testid={`column-product-${String(value)}`}>Column {String(value)} {location}</span>
    ));
    const columnFields: PivotTableFieldConfig[] = fields.map((field) =>
      field.field === 'product'
        ? {
            ...field,
            renderFieldCell: renderProductField,
          }
        : field,
    );

    render(
      <PivotTable
        data={rows}
        fields={columnFields}
        defaultPivotModel={{
          rows: ['region'],
          columns: ['product'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        pagination={false}
      />,
    );

    expect(screen.getByTestId('column-product-Laptop')).toBeInTheDocument();
    expect(screen.getByTestId('column-product-Monitor')).toBeInTheDocument();
    expect(renderProductField).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'pivot-column',
        value: 'Laptop',
        pivotColumn: expect.objectContaining({ values: { product: 'Laptop' } }),
      }),
    );
  });

  it('allows field renderers to render different content for rows and pivot column headers', () => {
    const renderProductField = vi.fn(({ value, location }) => {
      if (location === 'pivot-row') {
        return <span data-testid={`row-product-icon-${String(value)}`}>Icon {String(value)}</span>;
      }

      return String(value);
    });
    const conditionalFields: PivotTableFieldConfig[] = fields.map((field) =>
      field.field === 'product'
        ? {
            ...field,
            renderFieldCell: renderProductField,
          }
        : field,
    );

    render(
      <PivotTable
        data={rows}
        fields={conditionalFields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['product'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        pagination={false}
      />,
    );

    expect(screen.getByTestId('row-product-icon-Laptop')).toBeInTheDocument();
    expect(screen.queryByTestId('column-product-icon-Laptop')).not.toBeInTheDocument();
    expect(renderProductField).toHaveBeenCalledWith(expect.objectContaining({ location: 'pivot-row', value: 'Laptop' }));
    expect(renderProductField).toHaveBeenCalledWith(expect.objectContaining({ location: 'pivot-column', value: 'Laptop' }));
  });

  it('renders a custom drilldown header', async () => {
    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        drillDown={{
          renderHeader: ({ parts, defaultTitle, defaultSubtitle, rowCount, entityName, loading }) => (
            <div data-testid="custom-drilldown-header">
              {defaultTitle} ({parts.map((part) => `${part.kind}:${part.label}:${part.value}`).join(', ')})
              <span>
                {defaultSubtitle}:{rowCount}:{entityName}:{String(loading)}
              </span>
            </div>
          ),
        }}
      />,
    );

    fireEvent.click(within(screen.getByRole('grid')).getAllByRole('gridcell', { name: '200' })[0]);

    const header = await screen.findByTestId('custom-drilldown-header');
    expect(header).toHaveTextContent('Product: Laptop / Region: AMER (row:Product:Laptop, column:Region:AMER)');
    expect(header).toHaveTextContent('1 records:1:records:false');
    expect(screen.queryByRole('heading', { name: 'Product: Laptop / Region: AMER' })).not.toBeInTheDocument();
  });

  it('renders and edits multiple value aggregations from the toolbar', async () => {
    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [
            { field: 'amount', aggFunc: 'sum' },
            { field: 'amount', aggFunc: 'min' },
            { field: 'amount', aggFunc: 'avg' },
          ],
        }}
        entityName="orders"
        pagination={false}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'AMER (Sum)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'AMER (Min)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'AMER (Avg)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total (Avg)' })).toBeInTheDocument();
    expect(screen.getByText('Amount - Sum')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();

    const valuesTrigger = screen.getByRole('button', { name: 'Values' });
    valuesTrigger.focus();
    fireEvent.keyDown(valuesTrigger, { key: 'Enter', code: 'Enter' });

    expect(screen.getByLabelText('Value field 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add value' }));

    expect(screen.getByLabelText('Value field 4')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'AMER (Count)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove value 2' }));

    expect(screen.queryByLabelText('Value field 4')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'AMER (Min)' })).not.toBeInTheDocument();
  });

  it('applies generated pivot column sizing', () => {
    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        columnSizing={{
          row: { minWidth: 210 },
          count: { minWidth: 120 },
          value: { minWidth: 220 },
          total: { minWidth: 240 },
        }}
        pagination={false}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Product' })).toHaveStyle({ width: '210px' });
    expect(screen.getByRole('columnheader', { name: '#' })).toHaveStyle({ width: '120px' });
    expect(screen.getByRole('columnheader', { name: 'AMER' })).toHaveStyle({ width: '220px' });
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveStyle({ width: '240px' });
  });

  it('renders a client-side pivot skeleton while raw rows are loading', async () => {
    const { container } = render(
      <PivotTable
        data={[]}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        loading
        entityName="orders"
        pagination={false}
      />,
    );

    await waitFor(() => expect(container.querySelectorAll('.pg-grid-skeleton-cell').length).toBeGreaterThan(0));
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument();
    expect(screen.queryByText('No data available for the selected pivot configuration.')).not.toBeInTheDocument();
  });

  it('updates pivot controls and applies source filters when the menu closes', async () => {
    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="orders"
        deferFilterUpdates
      />,
    );

    fireEvent.change(screen.getByLabelText('Rows'), { target: { value: 'region' } });
    expect(screen.getByLabelText('Rows')).toHaveValue('region');

    const filterTrigger = screen.getByRole('button', { name: 'Source data filters' });
    filterTrigger.focus();
    fireEvent.keyDown(filterTrigger, { key: 'Enter', code: 'Enter' });
    const filterMenuTitle = screen.getByText('Source data filters');
    expect(filterMenuTitle).toBeInTheDocument();
    expect(filterMenuTitle.closest('.pg-root')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.change(screen.getByLabelText('Filter value from'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Filter value to'), { target: { value: '2026-01-02' } });
    expect(screen.getByText('3 orders')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape', code: 'Escape' });
    expect(await screen.findByText('2 / 3 orders')).toBeInTheDocument();

    filterTrigger.focus();
    fireEvent.keyDown(filterTrigger, { key: 'Enter', code: 'Enter' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter' }));
    expect(screen.queryByLabelText('Filter value from')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape', code: 'Escape' });
    expect(await screen.findByText('3 orders')).toBeInTheDocument();
  });

  it('uses label overrides for built-in UI text', () => {
    render(
      <PivotTable
        data={rows}
        fields={fields}
        defaultPivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="zamówienia"
        labels={{
          rowField: 'Wiersze',
          sourceFilters: 'Filtry danych',
          addFilter: 'Dodaj filtr',
          filterValue: 'Wartość',
          recordCount: (filtered, total, entityName) => `${filtered}/${total} ${entityName}`,
          groupCount: (count) => `${count} grupy`,
        }}
      />,
    );

    expect(screen.getByLabelText('Wiersze')).toBeInTheDocument();
    expect(screen.getByText('3/3 zamówienia')).toBeInTheDocument();
    expect(screen.getByText('2 grupy')).toBeInTheDocument();

    const filterTrigger = screen.getByRole('button', { name: 'Filtry danych' });
    filterTrigger.focus();
    fireEvent.keyDown(filterTrigger, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Filtry danych')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dodaj filtr' })).toBeInTheDocument();
  });

  it('renders date range controls for filter-only date fields', async () => {
    function DateFilterHarness() {
      const [activeFilters, setActiveFilters] = useState<SourceFilter[]>([
        { id: 'date-range', field: 'orderedAt', operator: 'between', value: '2026-01-01', valueTo: '2026-01-02' },
      ]);

      return (
        <PivotTable
          data={rows}
          fields={fields}
          defaultPivotModel={{
            rows: ['product'],
            columns: ['region'],
            values: [{ field: 'amount', aggFunc: 'sum' }],
          }}
          filters={activeFilters}
          onFiltersChange={setActiveFilters}
          entityName="orders"
        />
      );
    }

    render(<DateFilterHarness />);

    expect(screen.getByText('2 / 3 orders')).toBeInTheDocument();

    const filterTrigger = screen.getByRole('button', { name: 'Source data filters' });
    filterTrigger.focus();
    fireEvent.keyDown(filterTrigger, { key: 'Enter', code: 'Enter' });

    expect(screen.getByLabelText('Filter value from')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Filter value to')).toHaveAttribute('type', 'text');

    const calendarTriggers = screen.getAllByRole('button', { name: 'Open calendar' });
    fireEvent.click(calendarTriggers[0]);
    expect(screen.getByRole('dialog', { name: 'Calendar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select January 3, 2026' }));
    await waitFor(() => expect(screen.getByLabelText('Filter value from')).toHaveValue('2026-01-03'));
  });

  it('uses controlled server mode drilldown rows', async () => {
    const pivotResult = pivotData(rows, {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    });
    render(
      <PivotTable
        pivotResult={pivotResult}
        fields={fields}
        pivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        drillDown={{ rows: [rows[1]] }}
        entityName="orders"
      />,
    );

    const grid = screen.getByRole('grid');
    fireEvent.click(within(grid).getAllByRole('gridcell', { name: '200' })[0]);

    const drilldown = await screen.findByRole('region', { name: 'Drilldown rows' });
    const drilldownGrid = within(drilldown).getByRole('grid');
    expect(within(drilldownGrid).queryByRole('columnheader', { name: 'Product' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).queryByRole('gridcell', { name: 'AMER' })).not.toBeInTheDocument();
    expect(within(drilldownGrid).getByRole('gridcell', { name: '200' })).toBeInTheDocument();
  });

  it('can disable drilldown through the scoped drillDown mode', () => {
    const pivotResult = pivotData(rows, {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    });
    const onOpen = vi.fn();

    render(
      <PivotTable
        pivotResult={pivotResult}
        fields={fields}
        pivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="orders"
        drillDown={{ mode: 'none', onOpen }}
      />,
    );

    fireEvent.click(within(screen.getByRole('grid')).getAllByRole('gridcell', { name: '200' })[0]);

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Drilldown rows' })).not.toBeInTheDocument();
  });

  it('supports backend pagination for server-mode pivot rows', () => {
    const model: PivotModel = {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    };
    const fullResult = pivotData([...rows, { product: 'Phone', region: 'APAC', amount: 80, orderedAt: '2026-01-04' }], model);
    const onPaginationChange = vi.fn();

    render(
      <PivotTable
        pivotResult={{ ...fullResult, rows: fullResult.rows.slice(0, 2) }}
        fields={fields}
        pivotModel={model}
        entityName="orders"
        pagination={{
          mode: 'server',
          totalRows: fullResult.rows.length,
          state: { pageIndex: 0, pageSize: 1 },
          onChange: onPaginationChange,
          pageSizeOptions: [1, 2],
        }}
      />,
    );

    const grid = screen.getByRole('grid');
    expect(screen.getByText('3 groups')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3 (3 rows)')).toBeInTheDocument();
    expect(within(grid).getByRole('gridcell', { name: 'Laptop' })).toBeInTheDocument();
    expect(within(grid).getByRole('gridcell', { name: 'Monitor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
  });

  it('loads managed backend pivot pages and requests server sorting', async () => {
    const model: PivotModel = {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    };
    const apiRows = [...rows, { product: 'Phone', region: 'APAC', amount: 80, orderedAt: '2026-01-04' }];
    const getPage = vi.fn(async ({ model, page, sort }) => {
      const fullResult = pivotData(apiRows, model);
      const sortedRows = sort
        ? [...fullResult.rows].sort((left, right) => {
            const direction = sort.direction === 'asc' ? 1 : -1;
            return String(left[sort.columnId]).localeCompare(String(right[sort.columnId])) * direction;
          })
        : fullResult.rows;

      return {
        result: {
          ...fullResult,
          rows: sortedRows.slice(page.pageIndex * page.pageSize, page.pageIndex * page.pageSize + page.pageSize),
          totalSourceRecords: apiRows.length,
          filteredSourceRecords: apiRows.length,
        },
        totalRows: fullResult.rows.length,
      };
    });

    render(
      <PivotTable
        getPage={getPage}
        fields={fields}
        pivotModel={model}
        entityName="orders"
        pagination={{
          defaultPageSize: 1,
          pageSizeOptions: [1, 2],
        }}
      />,
    );

    expect(await screen.findByText('Page 1 of 3 (3 rows)')).toBeInTheDocument();
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: { pageIndex: 0, pageSize: 1 }, sort: null }));
    expect(within(screen.getByRole('grid')).getByRole('gridcell', { name: 'Laptop' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: { pageIndex: 1, pageSize: 1 } })));
    expect(await within(screen.getByRole('grid')).findByRole('gridcell', { name: 'Monitor' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('columnheader', { name: /Product/ }));
    await waitFor(() =>
      expect(getPage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: { pageIndex: 0, pageSize: 1 },
          sort: { columnId: 'product', direction: 'asc' },
        }),
      ),
    );
  });

  it('waits until the filter menu closes before loading a managed backend filter page', async () => {
    const model: PivotModel = {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    };
    const getPage = vi.fn(async ({ model, filters }) => {
      const filteredRows =
        filters.length > 0 ? rows.filter((row) => String(row.orderedAt) >= '2026-01-01' && String(row.orderedAt) <= '2026-01-02') : rows;
      const result = pivotData(filteredRows, model);
      return {
        result,
        totalRows: result.rows.length,
      };
    });

    render(<PivotTable getPage={getPage} fields={fields} pivotModel={model} entityName="orders" pagination={false} />);

    await waitFor(() => expect(getPage).toHaveBeenCalled());
    const callsBeforeFilterEdit = getPage.mock.calls.length;

    const filterTrigger = screen.getByRole('button', { name: 'Source data filters' });
    filterTrigger.focus();
    fireEvent.keyDown(filterTrigger, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    fireEvent.change(screen.getByLabelText('Filter value from'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Filter value to'), { target: { value: '2026-01-02' } });

    expect(getPage).toHaveBeenCalledTimes(callsBeforeFilterEdit);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(callsBeforeFilterEdit + 1));
    expect(getPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: [expect.objectContaining({ field: 'orderedAt', value: '2026-01-01', valueTo: '2026-01-02' })],
      }),
    );
  });

  it('renders a pivot skeleton while the initial managed backend page is loading', async () => {
    const model: PivotModel = {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    };
    const getPage = vi.fn(() => new Promise<never>(() => undefined));
    const { container } = render(
      <PivotTable getPage={getPage} fields={fields} pivotModel={model} entityName="orders" pagination={false} />,
    );

    await waitFor(() => expect(container.querySelectorAll('.pg-grid-skeleton-cell').length).toBeGreaterThan(0));
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument();
  });

  it('supports backend pagination for server-mode drilldown rows', async () => {
    const pivotResult = pivotData(rows, {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    });
    const handleDrillDownPageChange = vi.fn();

    render(
      <PivotTable
        pivotResult={pivotResult}
        fields={fields}
        pivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="orders"
        pagination={false}
        drillDown={{
          rows: [rows[1], rows[2]],
          pagination: {
            mode: 'server',
            totalRows: 3,
            state: { pageIndex: 0, pageSize: 1 },
            pageSizeOptions: [1, 2],
            onChange: handleDrillDownPageChange,
          },
        }}
      />,
    );

    fireEvent.click(within(screen.getByRole('grid')).getAllByRole('gridcell', { name: '200' })[0]);

    const drilldown = await screen.findByRole('region', { name: 'Drilldown rows' });
    const grid = within(drilldown).getByRole('grid');
    expect(screen.getByText('Page 1 of 3 (3 rows)')).toBeInTheDocument();
    expect(within(grid).queryByRole('columnheader', { name: 'Product' })).not.toBeInTheDocument();
    expect(within(grid).queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument();
    expect(within(grid).getByRole('gridcell', { name: '50' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(handleDrillDownPageChange).toHaveBeenCalledWith(
      { pageIndex: 1, pageSize: 1 },
      expect.objectContaining({
        rowValues: { product: 'Laptop' },
        columnValues: { region: 'AMER' },
        valueField: 'amount',
      }),
    );
  });

  it('loads managed backend drilldown pages and ignores stale drilldown responses', async () => {
    const pivotResult = pivotData(rows, {
      rows: ['product'],
      columns: ['region'],
      values: [{ field: 'amount', aggFunc: 'sum' }],
    });
    const firstRequest = deferred<{ rows: RowData[]; totalRows: number }>();
    const secondRequest = deferred<{ rows: RowData[]; totalRows: number }>();
    const thirdRequest = deferred<{ rows: RowData[]; totalRows: number }>();
    const getPage = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)
      .mockReturnValueOnce(thirdRequest.promise);

    render(
      <PivotTable
        pivotResult={pivotResult}
        fields={fields}
        pivotModel={{
          rows: ['product'],
          columns: ['region'],
          values: [{ field: 'amount', aggFunc: 'sum' }],
        }}
        entityName="orders"
        pagination={false}
        drillDown={{
          mode: 'inline',
          getPage,
          pagination: {
            defaultPageSize: 1,
            pageSizeOptions: [1, 2],
          },
        }}
      />,
    );

    const pivotGrid = screen.getByRole('grid');
    fireEvent.click(within(pivotGrid).getAllByRole('gridcell', { name: '200' })[0]);
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(1));

    fireEvent.click(within(pivotGrid).getAllByRole('gridcell', { name: '100' })[0]);
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(2));
    expect(getPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: { pageIndex: 0, pageSize: 1 },
        request: expect.objectContaining({
          rowValues: { product: 'Laptop' },
          columnValues: { region: 'EMEA' },
          valueField: 'amount',
        }),
      }),
    );

    firstRequest.resolve({ rows: [rows[1]], totalRows: 2 });
    secondRequest.resolve({ rows: [rows[0]], totalRows: 2 });

    const drilldown = await screen.findByRole('region', { name: 'Drilldown rows' });
    await waitFor(() => expect(within(drilldown).getByRole('gridcell', { name: '100' })).toBeInTheDocument());
    expect(within(drilldown).queryByRole('gridcell', { name: '200' })).not.toBeInTheDocument();

    fireEvent.click(within(drilldown).getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(3));
    expect(getPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: { pageIndex: 1, pageSize: 1 } }));

    thirdRequest.resolve({ rows: [rows[1]], totalRows: 2 });
    await waitFor(() => expect(within(drilldown).getByRole('gridcell', { name: '200' })).toBeInTheDocument());
  });
});
