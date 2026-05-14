import { DataGrid, type DataGridColumn, type RowData } from '../../../src';
import { formatPlaygroundNumber } from '../demoData';
import type { ThemeMode } from '../types';

const rawColumns: DataGridColumn<RowData>[] = [
  { id: 'id', header: 'Order', accessor: 'id', width: 120, sortable: true, copyable: true },
  { id: 'product', header: 'Product', accessor: 'product', width: 160, sortable: true, copyable: true },
  { id: 'region', header: 'Region', accessor: 'region', width: 110, sortable: true },
  { id: 'channel', header: 'Channel', accessor: 'channel', width: 150, sortable: true },
  { id: 'segment', header: 'Segment', accessor: 'segment', width: 150, sortable: true },
  { id: 'salesRep.name', header: 'Sales rep', accessor: (row) => (row.salesRep as { name: string }).name, width: 150, sortable: true },
  {
    id: 'amount',
    header: 'Amount',
    accessor: 'amount',
    width: 190,
    align: 'right',
    sortable: true,
    valueTone: 'signed',
    format: formatPlaygroundNumber,
  },
  { id: 'orderedAt', header: 'Ordered at', accessor: 'orderedAt', width: 130, sortable: true },
];

interface DataGridExampleProps {
  orders: RowData[];
  theme: ThemeMode;
}

export function DataGridExample({ orders, theme }: DataGridExampleProps) {
  return (
    <div className={`pg-root raw-grid-shell theme-${theme}`}>
      <DataGrid rows={orders} columns={rawColumns} getRowId={(row) => String(row.id)} height={640} pagination />
    </div>
  );
}
