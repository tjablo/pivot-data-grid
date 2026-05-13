import { PivotTable, type RowData } from '../../../src';
import { defaultPivotModel, fields } from '../demoData';
import type { ThemeMode } from '../types';

interface ClientSidePivotExampleProps {
  orders: RowData[];
  theme: ThemeMode;
}

export function ClientSidePivotExample({ orders, theme }: ClientSidePivotExampleProps) {
  return (
    <PivotTable data={orders} fields={fields} defaultPivotModel={defaultPivotModel} entityName="orders" className={`theme-${theme}`} />
  );
}
