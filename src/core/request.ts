import { normalizePivotModel } from './model';
import type { PivotModel, PivotRequest, SourceFilter } from './types';

export function createPivotRequest(
  model: PivotModel,
  filters: SourceFilter[] = [],
  options: { limit?: number; offset?: number } = {},
): PivotRequest {
  return {
    model: normalizePivotModel(model),
    filters,
    ...options,
  };
}
