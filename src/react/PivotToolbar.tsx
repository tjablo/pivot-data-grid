import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ListFilter, Plus, Trash2, X } from 'lucide-react';

import type { PivotFieldConfig, PivotModel, SourceFilter } from '../core/types';
import { DatePicker } from './DatePicker';
import type { PivotTableLabels } from './labels';
import { pivotFilterService } from './PivotFilterService';
import { usePortalContainer } from './portalContext';
import { useDraftFilters } from './useDraftFilters';

const NONE_VALUE = '__pg_none__';

interface PivotToolbarProps {
  fields: PivotFieldConfig[];
  model: PivotModel;
  onModelChange: (model: PivotModel) => void;
  filters: SourceFilter[];
  onFiltersChange: (filters: SourceFilter[]) => void;
  labels: PivotTableLabels;
  deferFilterUpdates?: boolean;
}

function canUseAsDimension(field: PivotFieldConfig): boolean {
  return field.role === 'dimension' || field.role === 'all' || field.role == null;
}

function canUseAsValue(field: PivotFieldConfig): boolean {
  return field.role === 'value' || field.role === 'all' || field.role == null;
}

interface SelectControlItem {
  value: string;
  label: string;
}

interface SelectInputProps {
  ariaLabel: string;
  value: string;
  items: SelectControlItem[];
  onValueChange: (value: string) => void;
  triggerClassName?: string;
}

function SelectInput({ ariaLabel, value, items, onValueChange, triggerClassName }: SelectInputProps) {
  const portalContainer = usePortalContainer();

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className={['pg-select-trigger', triggerClassName].filter(Boolean).join(' ')} aria-label={ariaLabel}>
        <Select.Value />
        <Select.Icon className="pg-select-icon">
          <ChevronDown className="pg-control-icon" aria-hidden />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer ?? undefined}>
        <Select.Content className="pg-select-content" position="popper" sideOffset={8}>
          <Select.Viewport className="pg-select-viewport">
            {items.map((item) => (
              <Select.Item className="pg-select-item" key={item.value} value={item.value}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator className="pg-select-indicator">
                  <Check className="pg-check-icon" aria-hidden />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

interface SelectControlProps extends Omit<SelectInputProps, 'ariaLabel' | 'triggerClassName'> {
  label: string;
  compact?: boolean;
}

function SelectControl({ label, value, items, onValueChange, compact = false }: SelectControlProps) {
  return (
    <div className={compact ? 'pg-control pg-control-small' : 'pg-control'}>
      <span>{label}</span>
      <SelectInput ariaLabel={label} value={value} items={items} onValueChange={onValueChange} />
    </div>
  );
}

function fieldItems(fields: PivotFieldConfig[], includeNone = false, noneLabel = ''): SelectControlItem[] {
  const items = fields.map((field) => ({
    value: field.field,
    label: field.label ?? field.field,
  }));
  return includeNone ? [{ value: NONE_VALUE, label: noneLabel }, ...items] : items;
}

export function PivotToolbar({
  fields,
  model,
  onModelChange,
  filters,
  onFiltersChange,
  labels,
  deferFilterUpdates = true,
}: PivotToolbarProps) {
  const portalContainer = usePortalContainer();
  const dimensionFields = fields.filter(canUseAsDimension);
  const valueFields = fields.filter(canUseAsValue);
  const filterFields = fields;
  const valueConfig = model.values[0] ?? { field: valueFields[0]?.field ?? '', aggFunc: 'sum' as const };
  const { activeFilters, filterMenuOpen, setFilterMenuOpen, updateFilters } = useDraftFilters({
    deferUpdates: deferFilterUpdates,
    filters,
    onFiltersChange,
  });

  const setRow = (field: string) => onModelChange({ ...model, rows: field ? [field] : [] });
  const setColumn = (field: string) => onModelChange({ ...model, columns: field && field !== NONE_VALUE ? [field] : [] });
  const setValueField = (field: string) => onModelChange({ ...model, values: [{ ...valueConfig, field }] });
  const setAgg = (aggFunc: typeof valueConfig.aggFunc) => onModelChange({ ...model, values: [{ ...valueConfig, aggFunc }] });

  const addFilter = () => {
    const firstField = filterFields.find((field) => field.role === 'filter-only') ?? filterFields[0];
    if (!firstField) return;
    updateFilters([
      ...activeFilters,
      {
        id: `filter-${Date.now()}`,
        field: firstField.field,
        operator: pivotFilterService.getDefaultOperator(firstField),
        value: '',
        valueTo: '',
      },
    ]);
  };

  const clearFilters = () => updateFilters([]);
  const filterFieldItems = fieldItems(filterFields);

  return (
    <div className="pg-toolbar" role="toolbar" aria-label={labels.pivotControls}>
      <SelectControl
        label={labels.rowField}
        value={model.rows[0] ?? dimensionFields[0]?.field ?? ''}
        items={fieldItems(dimensionFields)}
        onValueChange={setRow}
      />

      <SelectControl
        label={labels.columnField}
        value={model.columns[0] ?? NONE_VALUE}
        items={fieldItems(dimensionFields, true, labels.none)}
        onValueChange={setColumn}
      />

      <SelectControl label={labels.valueField} value={valueConfig.field} items={fieldItems(valueFields)} onValueChange={setValueField} />

      <SelectControl
        label={labels.aggregation}
        value={valueConfig.aggFunc}
        compact
        items={[
          { value: 'sum', label: labels.aggregations.sum },
          { value: 'count', label: labels.aggregations.count },
          { value: 'avg', label: labels.aggregations.avg },
          { value: 'min', label: labels.aggregations.min },
          { value: 'max', label: labels.aggregations.max },
        ]}
        onValueChange={(value) => setAgg(value as typeof valueConfig.aggFunc)}
      />

      <div className="pg-toolbar-spacer" />

      <DropdownMenu.Root modal={false} open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="pg-icon-button pg-filter-menu-trigger" type="button" aria-label={labels.sourceFilters}>
            <ListFilter className="pg-action-icon" aria-hidden />
            {activeFilters.length > 0 ? (
              <span className="pg-filter-count" aria-hidden="true">
                {activeFilters.length}
              </span>
            ) : null}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={portalContainer ?? undefined}>
          <DropdownMenu.Content className="pg-filter-menu-content" align="end" sideOffset={12}>
            <div className="pg-filter-menu-header">
              <span>{labels.sourceFilters}</span>
              <button className="pg-filter-clear" type="button" onClick={clearFilters} disabled={activeFilters.length === 0}>
                <Trash2 className="pg-action-icon" aria-hidden />
                {labels.clearAllFilters}
              </button>
            </div>

            <div className="pg-filter-menu-body">
              {activeFilters.length > 0 ? (
                activeFilters.map((filter) => {
                  const filterField = filterFields.find((field) => field.field === filter.field);
                  const operators = pivotFilterService.getOperatorsForField(filterField);
                  const inputType = pivotFilterService.getInputType(filterField);
                  const operator = operators.includes(filter.operator)
                    ? filter.operator
                    : pivotFilterService.getDefaultOperator(filterField);
                  const isRangeFilter = pivotFilterService.usesSecondValueInput(operator);
                  const isDateFilter = filterField?.type === 'date';
                  const datePickerLabels = {
                    calendar: labels.datePickerCalendar,
                    openCalendar: labels.datePickerOpenCalendar,
                    previousMonth: labels.datePickerPreviousMonth,
                    nextMonth: labels.datePickerNextMonth,
                    selectDate: labels.datePickerSelectDate,
                    selectedDate: labels.datePickerSelectedDate,
                  };

                  return (
                    <div className="pg-filter-row" key={filter.id}>
                      <button
                        className="pg-filter-row-action"
                        type="button"
                        aria-label={labels.removeFilter}
                        onClick={() => updateFilters(activeFilters.filter((candidate) => candidate.id !== filter.id))}
                      >
                        <X className="pg-action-icon" aria-hidden />
                      </button>

                      <div className="pg-filter-field">
                        <span>{labels.filterColumn}</span>
                        <SelectInput
                          ariaLabel={labels.filterColumnAria}
                          value={filter.field}
                          items={filterFieldItems}
                          triggerClassName="pg-filter-select"
                          onValueChange={(value) => {
                            const nextField = filterFields.find((field) => field.field === value);
                            updateFilters(
                              pivotFilterService.update(activeFilters, filter.id, {
                                field: value,
                                operator: pivotFilterService.getDefaultOperator(nextField),
                                value: '',
                                valueTo: '',
                              }),
                            );
                          }}
                        />
                      </div>

                      <div className="pg-filter-field">
                        <span>{labels.filterOperator}</span>
                        <SelectInput
                          ariaLabel={labels.filterOperatorAria}
                          value={operator}
                          items={operators.map((operatorItem) => ({
                            value: operatorItem,
                            label: labels.filterOperators[operatorItem],
                          }))}
                          triggerClassName="pg-filter-select"
                          onValueChange={(value) =>
                            updateFilters(
                              pivotFilterService.update(activeFilters, filter.id, { operator: value as SourceFilter['operator'] }),
                            )
                          }
                        />
                      </div>

                      {pivotFilterService.usesValueInput(operator) ? (
                        <div className="pg-filter-field pg-filter-value-field">
                          <span>{isRangeFilter ? labels.filterValueFrom : labels.filterValue}</span>
                          {isDateFilter ? (
                            <DatePicker
                              ariaLabel={isRangeFilter ? labels.filterValueFromAria : labels.filterValueAria}
                              value={filter.value ?? ''}
                              placeholder={isRangeFilter ? labels.filterValueFrom : labels.filterValue}
                              labels={datePickerLabels}
                              onValueChange={(value) => updateFilters(pivotFilterService.update(activeFilters, filter.id, { value }))}
                            />
                          ) : (
                            <input
                              aria-label={isRangeFilter ? labels.filterValueFromAria : labels.filterValueAria}
                              type={inputType}
                              value={filter.value ?? ''}
                              placeholder={isRangeFilter ? labels.filterValueFrom : labels.filterValue}
                              onChange={(event) =>
                                updateFilters(pivotFilterService.update(activeFilters, filter.id, { value: event.target.value }))
                              }
                            />
                          )}
                        </div>
                      ) : (
                        <div className="pg-filter-value-placeholder" aria-hidden="true">
                          {labels.noFilterValue}
                        </div>
                      )}

                      {pivotFilterService.usesSecondValueInput(operator) ? (
                        <div className="pg-filter-field pg-filter-value-field">
                          <span>{labels.filterValueTo}</span>
                          {isDateFilter ? (
                            <DatePicker
                              ariaLabel={labels.filterValueToAria}
                              value={filter.valueTo ?? ''}
                              placeholder={labels.filterValueTo}
                              labels={datePickerLabels}
                              onValueChange={(value) =>
                                updateFilters(pivotFilterService.update(activeFilters, filter.id, { valueTo: value }))
                              }
                            />
                          ) : (
                            <input
                              aria-label={labels.filterValueToAria}
                              type={inputType}
                              value={filter.valueTo ?? ''}
                              placeholder={labels.filterValueTo}
                              onChange={(event) =>
                                updateFilters(pivotFilterService.update(activeFilters, filter.id, { valueTo: event.target.value }))
                              }
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="pg-filter-empty">{labels.noSourceFilters}</div>
              )}

              <button className="pg-filter-add" type="button" onClick={addFilter} disabled={filterFields.length === 0}>
                <Plus className="pg-action-icon" aria-hidden />
                {labels.addFilter}
              </button>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {deferFilterUpdates ? <span className="pg-toolbar-status" aria-hidden="true" /> : null}
    </div>
  );
}
