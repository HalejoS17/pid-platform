import type {
  EntityStatus,
  ProductType,
  UnitDimension,
} from '../../generated/prisma/client';

export interface ProductCategorySummary {
  id: string;
  code: string;
  name: string;
}

export interface ProductUnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
}

export interface ProductResponse {
  id: string;
  categoryId: string;
  baseUnitId: string;
  code: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  type: ProductType;
  trackInventory: boolean;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  category: ProductCategorySummary;
  baseUnit: ProductUnitSummary;
}

export interface ProductsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductsPageResponse {
  data: ProductResponse[];
  meta: ProductsPagination;
}

export interface ProductUnitConversionResponse {
  id: string;
  productId: string;
  unitId: string;
  factorToBase: string;
  isPurchaseUnit: boolean;
  isRecipeUnit: boolean;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  unit: ProductUnitSummary;
}
