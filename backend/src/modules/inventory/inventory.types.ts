import type {
  InventoryMovementDirection,
  InventoryMovementStatus,
  InventoryMovementType,
  ProductType,
  UnitDimension,
} from '../../generated/prisma/client';

export interface InventoryRestaurantSummary {
  id: string;
  code: string;
  name: string;
}

export interface InventoryBranchSummary {
  id: string;
  code: string;
  name: string;
  restaurant: InventoryRestaurantSummary;
}

export interface InventoryWarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: InventoryBranchSummary;
}

export interface InventoryUnitSummary {
  id: string;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  decimalPlaces: number;
}

export interface InventoryProductSummary {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  baseUnitId: string;
  baseUnit: InventoryUnitSummary;
}

export interface InventoryBalanceResponse {
  id: string;
  warehouseId: string;
  productId: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
  averageUnitCost: string;
  inventoryValue: string;
  version: number;
  lastMovementAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  warehouse: InventoryWarehouseSummary;
  product: InventoryProductSummary;
}

export interface InventoryBalancesPageResponse {
  data: InventoryBalanceResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryMovementResponse {
  id: string;
  warehouseId: string;
  productId: string;
  unitId: string;
  type: InventoryMovementType;
  direction: InventoryMovementDirection;
  status: InventoryMovementStatus;
  quantity: string;
  factorToBase: string;
  baseQuantity: string;
  unitCost: string;
  totalCost: string;
  balanceQuantityAfter: string | null;
  averageUnitCostAfter: string | null;
  occurredAt: Date;
  postedAt: Date | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  transferGroupId: string | null;
  idempotencyKey: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  warehouse: InventoryWarehouseSummary;
  product: InventoryProductSummary;
  unit: InventoryUnitSummary;
}

export interface InventoryMovementsPageResponse {
  data: InventoryMovementResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryTransferResponse {
  transferGroupId: string;
  sourceMovement: InventoryMovementResponse;
  destinationMovement: InventoryMovementResponse;
}
