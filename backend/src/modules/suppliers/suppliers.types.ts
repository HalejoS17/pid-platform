import type {
  EntityStatus,
  ProductType,
  UnitDimension,
} from '../../generated/prisma/client';

export interface SupplierResponse {
  id: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  paymentTermsDays: number;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuppliersPageResponse {
  data: SupplierResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SupplierProductUnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
}

export interface SupplierProductSummary {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  baseUnitId: string;
  baseUnit: SupplierProductUnitSummary;
}

export interface SupplierProductResponse {
  id: string;
  supplierId: string;
  productId: string;
  purchaseUnitId: string;
  supplierSku: string | null;
  minimumOrderQuantity: string;
  leadTimeDays: number;
  isPreferred: boolean;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  product: SupplierProductSummary;
  purchaseUnit: SupplierProductUnitSummary;
  costCount: number;
}

export interface SupplierProductsPageResponse {
  data: SupplierProductResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SupplierProductCostResponse {
  id: string;
  supplierProductId: string;
  unitCost: string;
  currencyCode: string;
  taxIncluded: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notes: string | null;
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProductCostsPageResponse {
  data: SupplierProductCostResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
