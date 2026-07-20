import axios, { AxiosError } from 'axios';
import type { PaginatedResponse } from '../types/api';

type QueryValue = string | number | boolean | undefined;

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  code?: string;
  reportFileName?: string;
  reportText?: string;
}

export interface DownloadableApiErrorReport {
  filename: string;
  content: string;
}

const organizationId = import.meta.env.VITE_ORGANIZATION_ID;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    ...(organizationId
      ? {
          'x-organization-id': organizationId,
        }
      : {}),
  },
});

export async function fetchAllPages<T>(
  path: string,
  params: Record<string, QueryValue> = {},
): Promise<T[]> {
  const firstResponse = await apiClient.get<PaginatedResponse<T>>(path, {
    params: {
      ...params,
      page: 1,
      limit: 100,
    },
  });

  const records = [...firstResponse.data.data];

  for (
    let page = 2;
    page <= firstResponse.data.meta.totalPages;
    page += 1
  ) {
    const response = await apiClient.get<PaginatedResponse<T>>(path, {
      params: {
        ...params,
        page,
        limit: 100,
      },
    });

    records.push(...response.data.data);
  }

  return records;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;

    if (Array.isArray(body?.message)) {
      return body.message.join(' ');
    }

    if (typeof body?.message === 'string') {
      return body.message;
    }

    if (typeof body?.error === 'string') {
      return body.error;
    }

    if (!error.response) {
      return 'No se pudo conectar con el backend.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}

export function getApiErrorReport(
  error: unknown,
): DownloadableApiErrorReport | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  const body = error.response?.data as ApiErrorBody | undefined;

  if (
    body?.code !== 'MONTHLY_IMPORT_VALIDATION_FAILED' ||
    typeof body.reportText !== 'string' ||
    typeof body.reportFileName !== 'string'
  ) {
    return null;
  }

  return {
    filename: body.reportFileName,
    content: body.reportText,
  };
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF', content], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
