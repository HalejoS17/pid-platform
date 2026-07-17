import type { EntityStatus } from '../../generated/prisma/client';

export interface WarehouseRestaurantResponse {
  id: string;
  code: string;
  name: string;
}

export interface WarehouseBranchResponse {
  id: string;
  restaurantId: string;
  code: string;
  name: string;
  restaurant: WarehouseRestaurantResponse;
}

export interface WarehouseResponse {
  id: string;
  branchId: string;
  code: string;
  name: string;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  branch: WarehouseBranchResponse;
}

export interface WarehousesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WarehousesPageResponse {
  data: WarehouseResponse[];
  meta: WarehousesPagination;
}
