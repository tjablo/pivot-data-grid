import { useCallback, useState } from 'react';
import type { PaginationState, SortState } from './DataGrid.types';

interface ManagedPageState {
  defaultPageSize: number;
  page: PaginationState;
  sort: SortState | null;
}

function getEffectivePage(state: ManagedPageState, defaultPageSize: number): PaginationState {
  return state.defaultPageSize === defaultPageSize ? state.page : { pageIndex: 0, pageSize: defaultPageSize };
}

function getEffectiveSort(state: ManagedPageState, defaultPageSize: number): SortState | null {
  return state.defaultPageSize === defaultPageSize ? state.sort : null;
}

export function useManagedPageState(defaultPageSize: number): {
  page: PaginationState;
  sort: SortState | null;
  setPage: (state: PaginationState) => void;
  setSort: (sort: SortState | null) => void;
  reset: () => void;
} {
  const [state, setState] = useState<ManagedPageState>({
    defaultPageSize,
    page: { pageIndex: 0, pageSize: defaultPageSize },
    sort: null,
  });
  const page = getEffectivePage(state, defaultPageSize);
  const sort = getEffectiveSort(state, defaultPageSize);

  const setPage = useCallback(
    (nextPage: PaginationState) => {
      setState((current) => ({
        defaultPageSize,
        page: nextPage,
        sort: getEffectiveSort(current, defaultPageSize),
      }));
    },
    [defaultPageSize],
  );

  const reset = useCallback(() => {
    setState((current) => {
      const currentPage = getEffectivePage(current, defaultPageSize);
      return {
        defaultPageSize,
        page: currentPage.pageIndex === 0 ? currentPage : { pageIndex: 0, pageSize: currentPage.pageSize },
        sort: null,
      };
    });
  }, [defaultPageSize]);

  const setSort = useCallback(
    (nextSort: SortState | null) => {
      setState((current) => {
        const currentPage = getEffectivePage(current, defaultPageSize);
        return {
          defaultPageSize,
          page: currentPage.pageIndex === 0 ? currentPage : { pageIndex: 0, pageSize: currentPage.pageSize },
          sort: nextSort,
        };
      });
    },
    [defaultPageSize],
  );

  return { page, sort, setPage, setSort, reset };
}
