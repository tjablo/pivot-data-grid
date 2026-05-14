import type { PivotFieldConfig, SourceFilter } from '../core/types';

const OPERATORS: SourceFilter['operator'][] = [
  'contains',
  'equals',
  'notEquals',
  'startsWith',
  'endsWith',
  'greaterThan',
  'lessThan',
  'between',
  'after',
  'before',
  'isEmpty',
  'isNotEmpty',
];

const DATE_OPERATORS: SourceFilter['operator'][] = ['between', 'after', 'before', 'equals', 'isEmpty', 'isNotEmpty'];
const NUMBER_OPERATORS: SourceFilter['operator'][] = ['between', 'greaterThan', 'lessThan', 'equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
const BOOLEAN_OPERATORS: SourceFilter['operator'][] = ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];

export class PivotFilterService {
  areEqual(left: SourceFilter[], right: SourceFilter[]): boolean {
    if (left.length !== right.length) return false;
    return left.every((filter, index) => {
      const candidate = right[index];
      return (
        candidate &&
        filter.id === candidate.id &&
        filter.field === candidate.field &&
        filter.operator === candidate.operator &&
        filter.value === candidate.value &&
        filter.valueTo === candidate.valueTo
      );
    });
  }

  update(filters: SourceFilter[], id: string, patch: Partial<SourceFilter>): SourceFilter[] {
    return filters.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter));
  }

  usesValueInput(operator: SourceFilter['operator']): boolean {
    return operator !== 'isEmpty' && operator !== 'isNotEmpty';
  }

  usesSecondValueInput(operator: SourceFilter['operator']): boolean {
    return operator === 'between';
  }

  getDefaultOperator(field?: PivotFieldConfig): SourceFilter['operator'] {
    if (field?.type === 'date') return 'between';
    if (field?.type === 'number') return 'between';
    if (field?.type === 'boolean') return 'equals';
    return 'contains';
  }

  getOperatorsForField(field?: PivotFieldConfig): SourceFilter['operator'][] {
    if (field?.type === 'date') return DATE_OPERATORS;
    if (field?.type === 'number') return NUMBER_OPERATORS;
    if (field?.type === 'boolean') return BOOLEAN_OPERATORS;
    return OPERATORS;
  }

  getInputType(field?: PivotFieldConfig): 'number' | 'text' {
    if (field?.type === 'number') return 'number';
    return 'text';
  }
}

export const pivotFilterService = new PivotFilterService();
