import { Globe2, Package } from 'lucide-react';
import { useMemo } from 'react';
import { PivotTable, type PivotTableFieldConfig, type RowData } from '../../../src';
import { defaultPivotModel, fields, formatPlaygroundNumber } from '../demoData';
import type { ThemeMode } from '../types';

interface ClientSidePivotExampleProps {
  orders: RowData[];
  theme: ThemeMode;
}

export function ClientSidePivotExample({ orders, theme }: ClientSidePivotExampleProps) {
  const decoratedFields = useMemo<PivotTableFieldConfig[]>(
    () =>
      fields.map((field) => {
        if (field.field === 'product') {
          return {
            ...field,
            renderFieldCell: ({ value, location }) => (
              <span className="field-chip field-chip-product" data-location={location}>
                <Package className="field-chip-icon" aria-hidden />
                <span>{String(value)}</span>
              </span>
            ),
          };
        }

        if (field.field === 'region') {
          return {
            ...field,
            renderFieldCell: ({ value, location }) => (
              <span className="field-chip field-chip-region" data-location={location}>
                <Globe2 className="field-chip-icon" aria-hidden />
                <span>{String(value)}</span>
              </span>
            ),
          };
        }

        return field;
      }),
    [],
  );

  return (
    <PivotTable
      data={orders}
      fields={decoratedFields}
      defaultPivotModel={defaultPivotModel}
      formatValue={formatPlaygroundNumber}
      entityName="orders"
      className={`theme-${theme}`}
    />
  );
}
