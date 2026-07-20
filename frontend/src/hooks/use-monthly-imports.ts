import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  PaginatedResponse,
} from '../types/api';
import type {
  MonthlyAnalytics,
  MonthlyAnalyticsFilters,
  MonthlyImportBatch,
} from '../types/monthly-imports';

export interface MonthlyImportUpload {
  year: number;
  month: number;
  kardex: File;
  recipes: File;
  sales: File;
  waiterSales: File;
}

export function useMonthlyImportHistory() {
  return useQuery({
    queryKey: [
      'monthly-imports',
      'history',
    ],

    queryFn: async () => {
      const response =
        await apiClient.get<
          PaginatedResponse<MonthlyImportBatch>
        >('/monthly-imports', {
          params: {
            page: 1,
            limit: 50,
          },
        });

      return response.data;
    },

    staleTime: 15_000,
  });
}

export function useProcessMonthlyImport() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: async (
      input:
        MonthlyImportUpload,
    ) => {
      const formData =
        new FormData();

      formData.append(
        'year',
        String(input.year),
      );

      formData.append(
        'month',
        String(input.month),
      );

      formData.append(
        'sourceSystem',
        'LEGACY_EXCEL',
      );

      formData.append(
        'kardex',
        input.kardex,
      );

      formData.append(
        'recipes',
        input.recipes,
      );

      formData.append(
        'sales',
        input.sales,
      );

      formData.append(
        'waiterSales',
        input.waiterSales,
      );

      const response =
        await apiClient.post<
          MonthlyImportBatch
        >(
          '/monthly-imports/process',
          formData,
          {
            headers: {
              'Content-Type':
                'multipart/form-data',
            },

            timeout: 300_000,
          },
        );

      return response.data;
    },

    onSuccess: async (
      batch,
    ) => {
      localStorage.setItem(
        'pid.analytics.period',
        JSON.stringify({
          year:
            batch.periodYear,
          month:
            batch.periodMonth,
        }),
      );

      await queryClient.invalidateQueries({
        queryKey: [
          'monthly-imports',
        ],
      });
    },
  });
}

export function useMonthlyAnalytics(
  year: number,
  month: number,
  filters:
    MonthlyAnalyticsFilters = {},
) {
  return useQuery({
    queryKey: [
      'monthly-imports',
      'analytics',
      year,
      month,
      filters,
    ],

    queryFn: async () => {
      const response =
        await apiClient.get<
          MonthlyAnalytics
        >(
          '/monthly-imports/analytics',
          {
            params: {
              year,
              month,
              group1:
                filters.group1 ||
                undefined,
              group2:
                filters.group2 ||
                undefined,
              article:
                filters.article ||
                undefined,
              ingredient:
                filters.ingredient ||
                undefined,
            },
          },
        );

      return response.data;
    },

    staleTime: 30_000,
    retry: false,
  });
}

export async function downloadMonthlyImportReport(
  batchId: string,
  filename?: string,
): Promise<void> {
  const response =
    await apiClient.get<Blob>(
      `/monthly-imports/${batchId}/report`,
      {
        responseType:
          'blob',
        timeout: 60_000,
      },
    );

  const url =
    URL.createObjectURL(
      response.data,
    );

  const anchor =
    document.createElement(
      'a',
    );

  anchor.href = url;
  anchor.download =
    filename ??
    `reporte-carga-${batchId}.txt`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}