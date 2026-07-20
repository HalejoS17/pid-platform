import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  HistoricalInventoryResponse,
  HistoricalKardexResponse,
} from '../types/historical-import-data';

interface HistoricalQuery {
  year: number;
  month: number;
  page: number;
  limit: number;
  search: string;
}

interface HistoricalKardexQuery extends HistoricalQuery {
  direction: 'ALL' | 'IN' | 'OUT';
}

export function useHistoricalInventory(
  query: HistoricalQuery,
) {
  return useQuery({
    queryKey: [
      'monthly-imports',
      'historical-inventory',
      query,
    ],
    queryFn: async () => {
      const response =
        await apiClient.get<HistoricalInventoryResponse>(
          '/monthly-imports/inventory',
          {
            params: query,
          },
        );

      return response.data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useHistoricalKardex(
  query: HistoricalKardexQuery,
) {
  return useQuery({
    queryKey: [
      'monthly-imports',
      'historical-kardex',
      query,
    ],
    queryFn: async () => {
      const response =
        await apiClient.get<HistoricalKardexResponse>(
          '/monthly-imports/kardex',
          {
            params: query,
          },
        );

      return response.data;
    },
    placeholderData: (previous) => previous,
  });
}