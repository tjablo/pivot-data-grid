import { useCallback, useState } from 'react';
import type { SourceFilter } from '../core/types';
import { pivotFilterService } from './PivotFilterService';

interface UseDraftFiltersOptions {
  filters: SourceFilter[];
  deferUpdates: boolean;
  onFiltersChange: (filters: SourceFilter[]) => void;
}

export function useDraftFilters({ filters, deferUpdates, onFiltersChange }: UseDraftFiltersOptions): {
  activeFilters: SourceFilter[];
  filterMenuOpen: boolean;
  setFilterMenuOpen: (open: boolean) => void;
  updateFilters: (filters: SourceFilter[]) => void;
} {
  const [filterMenuOpen, setInternalFilterMenuOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const activeFilters = deferUpdates && filterMenuOpen ? draftFilters : filters;

  const commitDraftFilters = useCallback(() => {
    if (!deferUpdates || pivotFilterService.areEqual(filters, draftFilters)) return;
    onFiltersChange(draftFilters);
  }, [deferUpdates, draftFilters, filters, onFiltersChange]);

  const setFilterMenuOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setDraftFilters(filters);
        setInternalFilterMenuOpen(true);
        return;
      }

      commitDraftFilters();
      setInternalFilterMenuOpen(false);
    },
    [commitDraftFilters, filters],
  );

  const updateFilters = useCallback(
    (nextFilters: SourceFilter[]) => {
      if (deferUpdates) setDraftFilters(nextFilters);
      else onFiltersChange(nextFilters);
    },
    [deferUpdates, onFiltersChange],
  );

  return { activeFilters, filterMenuOpen, setFilterMenuOpen, updateFilters };
}
