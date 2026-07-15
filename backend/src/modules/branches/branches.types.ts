import type { EntityStatus } from '../../generated/prisma/client';

export interface BranchRestaurantResponse {
  id: string;
  code: string;
  name: string;
}

export interface BranchResponse {
  id: string;
  restaurantId: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  timezone: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  restaurant: BranchRestaurantResponse;
}

export interface BranchesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BranchesPageResponse {
  data: BranchResponse[];
  meta: BranchesPagination;
}
