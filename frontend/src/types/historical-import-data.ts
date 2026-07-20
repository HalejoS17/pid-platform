export interface HistoricalInventoryItem {
  itemName: string;
  itemNormalized: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  averageUnitCost: number;
  inventoryValue: number;
  rotation90DaysPercent: number | null;
  lastMovementAt: string;
}

export interface HistoricalKardexItem {
  id: string;
  sourceRow: number;
  itemName: string;
  warehouseCode: string;
  movementDate: string;
  transactionType: string;
  documentNumber: string | null;
  direction: 'IN' | 'OUT';
  unitCode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  balanceQuantity: number;
  averageCost: number;
  supplierName: string | null;
}

export interface HistoricalInventoryResponse {
  data: HistoricalInventoryItem[];
  summary: {
    totalInventoryValue: number;
    withStock: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HistoricalKardexResponse {
  data: HistoricalKardexItem[];
  summary: {
    entryValue: number;
    outputValue: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}