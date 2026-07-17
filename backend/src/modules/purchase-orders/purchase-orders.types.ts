import type {
  ProductType,
  PurchaseOrderStatus,
  UnitDimension,
} from '../../generated/prisma/client';

export interface PurchaseOrderSupplierSummary {
  id: string;
  code: string;
  legalName: string;
  tradeName: string | null;
}

export interface PurchaseOrderRestaurantSummary {
  id: string;
  code: string;
  name: string;
}

export interface PurchaseOrderBranchSummary {
  id: string;
  code: string;
  name: string;
  restaurant: PurchaseOrderRestaurantSummary;
}

export interface PurchaseOrderWarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: PurchaseOrderBranchSummary;
}

export interface PurchaseOrderUnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
}

export interface PurchaseOrderProductSummary {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  baseUnitId: string;
  baseUnit: PurchaseOrderUnitSummary;
}

export interface PurchaseOrderItemResponse {
  id: string;
  supplierProductId: string;
  productId: string;
  unitId: string;
  lineNumber: number;
  quantity: string;
  receivedQuantity: string;
  remainingQuantity: string;
  unitCost: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  supplierProduct: {
    id: string;
    supplierSku: string | null;
    isPreferred: boolean;
  };
  product: PurchaseOrderProductSummary;
  unit: PurchaseOrderUnitSummary;
}

export interface PurchaseOrderResponse {
  id: string;
  supplierId: string;
  warehouseId: string;
  number: string;
  orderDate: Date;
  expectedDate: Date | null;
  currencyCode: string;
  status: PurchaseOrderStatus;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: PurchaseOrderSupplierSummary;
  warehouse: PurchaseOrderWarehouseSummary;
  items: PurchaseOrderItemResponse[];
}

export interface PurchaseOrdersPageResponse {
  data: PurchaseOrderResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
