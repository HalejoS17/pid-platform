import type { EntityStatus } from '../../generated/prisma/client';

export interface RestaurantResponse {
  id: string;
  code: string;
  name: string;
  status: EntityStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RestaurantsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RestaurantsPageResponse {
  data: RestaurantResponse[];
  meta: RestaurantsPagination;
}
