import type {
  GoodsReceiptStatus,
  ProductType,
  PurchaseOrderStatus,
  UnitDimension,
} from '../../generated/prisma/client';

export interface GoodsReceiptSupplierSummary {
  id: string;
  code: string;
  legalName: string;
  tradeName: string | null;
}

export interface GoodsReceiptRestaurantSummary {
  id: string;
  code: string;
  name: string;
}

export interface GoodsReceiptBranchSummary {
  id: string;
  code: string;
  name: string;
  restaurant: GoodsReceiptRestaurantSummary;
}

export interface GoodsReceiptWarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: GoodsReceiptBranchSummary;
}

export interface GoodsReceiptUnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
}

export interface GoodsReceiptProductSummary {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  baseUnitId: string;
  baseUnit: GoodsReceiptUnitSummary;
}

export interface GoodsReceiptItemResponse {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId: string;
  productId: string;
  unitId: string;
  lineNumber: number;
  quantity: string;
  factorToBase: string;
  baseQuantity: string;
  unitCost: string;
  baseUnitCost: string;
  totalCost: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrderItem: {
    id: string;
    lineNumber: number;
    quantity: string;
    receivedQuantity: string;
  };
  product: GoodsReceiptProductSummary;
  unit: GoodsReceiptUnitSummary;
}

export interface GoodsReceiptResponse {
  id: string;
  purchaseOrderId: string;
  warehouseId: string;
  number: string;
  supplierDocumentNumber: string | null;
  receiptDate: Date;
  status: GoodsReceiptStatus;
  idempotencyKey: string | null;
  notes: string | null;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder: {
    id: string;
    number: string;
    status: PurchaseOrderStatus;
    supplier: GoodsReceiptSupplierSummary;
  };
  warehouse: GoodsReceiptWarehouseSummary;
  items: GoodsReceiptItemResponse[];
}

export interface GoodsReceiptsPageResponse {
  data: GoodsReceiptResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
