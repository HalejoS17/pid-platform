import type {
  EntityStatus,
  UnitDimension,
} from '../../generated/prisma/client';

export interface UnitOfMeasureResponse {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitsOfMeasurePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UnitsOfMeasurePageResponse {
  data: UnitOfMeasureResponse[];
  meta: UnitsOfMeasurePagination;
}
