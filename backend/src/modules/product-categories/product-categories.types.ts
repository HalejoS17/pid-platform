import type { EntityStatus } from '../../generated/prisma/client';

export interface ProductCategoryResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategoriesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductCategoriesPageResponse {
  data: ProductCategoryResponse[];
  meta: ProductCategoriesPagination;
}
