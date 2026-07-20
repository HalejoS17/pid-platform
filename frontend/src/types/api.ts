export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface UnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: string;
  decimalPlaces: number;
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  baseUnitId: string;
  baseUnit: UnitSummary;
}

export interface RestaurantSummary {
  id: string;
  code: string;
  name: string;
}

export interface BranchSummary {
  id: string;
  code: string;
  name: string;
  restaurant: RestaurantSummary;
}

export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: BranchSummary;
}

export interface InventoryBalance {
  id: string;
  warehouseId: string;
  productId: string;

  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;

  averageUnitCost: string;
  inventoryValue: string;

  version: number;

  lastMovementAt: string | null;
  createdAt: string;
  updatedAt: string;

  warehouse: WarehouseSummary;
  product: ProductSummary;
}

export interface InventoryMovement {
  id: string;
  warehouseId: string;
  productId: string;
  unitId: string;

  type: string;
  direction: 'IN' | 'OUT';
  status: 'DRAFT' | 'POSTED' | 'VOIDED';

  quantity: string;
  factorToBase: string;
  baseQuantity: string;

  unitCost: string;
  totalCost: string;

  balanceQuantityAfter: string | null;
  averageUnitCostAfter: string | null;

  occurredAt: string;
  postedAt: string | null;

  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;

  transferGroupId: string | null;
  idempotencyKey: string | null;
  notes: string | null;

  createdAt: string;
  updatedAt: string;

  warehouse: WarehouseSummary;
  product: ProductSummary;
  unit: UnitSummary;
}

export interface SupplierSummary {
  id: string;
  code: string;
  legalName: string;
  tradeName: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: string;
  receivedQuantity: string;
  remainingQuantity: string;
  unitCost: string;
  lineTotal: string;

  product: ProductSummary;
  unit: UnitSummary;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  warehouseId: string;

  number: string;
  orderDate: string;
  expectedDate: string | null;
  currencyCode: string;

  status:
    | 'DRAFT'
    | 'APPROVED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';

  subtotal: string;
  taxAmount: string;
  totalAmount: string;

  notes: string | null;

  approvedAt: string | null;
  cancelledAt: string | null;
  closedAt: string | null;

  createdAt: string;
  updatedAt: string;

  supplier: SupplierSummary;
  warehouse: WarehouseSummary;
  items: PurchaseOrderItem[];
}

export interface GoodsReceipt {
  id: string;
  purchaseOrderId: string;
  warehouseId: string;

  number: string;
  supplierDocumentNumber: string | null;
  receiptDate: string;

  status:
    | 'DRAFT'
    | 'POSTED'
    | 'VOIDED';

  idempotencyKey: string | null;
  notes: string | null;

  postedAt: string | null;
  voidedAt: string | null;

  createdAt: string;
  updatedAt: string;

  purchaseOrder: {
    id: string;
    number: string;
    status: PurchaseOrder['status'];
    supplier: SupplierSummary;
  };

  warehouse: WarehouseSummary;

  items: Array<{
    id: string;
    productId: string;
    quantity: string;
    totalCost: string;
    product: ProductSummary;
    unit: UnitSummary;
  }>;
}