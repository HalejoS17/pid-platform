export type MonthlyImportStatus =
  "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" | "REPLACED";

export interface MonthlyImportFile {
  id: string;
  type: "KARDEX" | "RECIPES" | "SALES" | "WAITER_SALES";
  originalName: string;
  sha256: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  ignoredRows: number;
  errorRows: number;
  controlTotals: Record<string, unknown> | null;
  createdAt: string;
}

export interface MonthlyImportError {
  id: string;
  fileType: MonthlyImportFile["type"];
  sourceRow: number;
  message: string;
  rawData: Record<string, unknown> | null;
}

export interface MonthlyImportBatch {
  id: string;
  periodYear: number;
  periodMonth: number;
  version: number;
  isCurrent: boolean;
  status: MonthlyImportStatus;
  sourceSystem: string;
  totalRows: number;
  validRows: number;
  ignoredRows: number;
  errorRows: number;
  summary: Record<string, unknown> | null;
  failureMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  files?: MonthlyImportFile[];
  errors?: MonthlyImportError[];
}

export interface MonthlyAnalyticsFilters {
  group1?: string;
  group2?: string;
  article?: string;
  ingredient?: string;
}

export interface MonthlyAnalytics {
  period: {
    year: number;
    month: number;
  };

  importBatch: {
    id: string;
    version: number;
    status: MonthlyImportStatus;
    completedAt: string | null;
  };

  appliedFilters: {
    group1: string | null;
    group2: string | null;
    article: string | null;
    ingredient: string | null;
  };

  filterOptions: {
    groups1: string[];
    groups2: string[];
    articles: string[];
    ingredients: string[];
  };

  filterSummary: {
    salesLines: number;
    waiterLines: number;
    inventoryItems: number;
    inventoryScope:
      | "ALL_INVENTORY"
      | "INGREDIENTS_FROM_SELECTED_DISHES"
      | "SELECTED_INGREDIENT";
  };

  breakdown: {
    dimension: "GROUP_1" | "GROUP_2" | "ARTICLE";
    label: string;
  };

  kpis: {
    netSales: number;
    grossBilled: number;
    taxAmount: number;
    serviceAmount: number;
    estimatedCostOfSales: number;
    estimatedGrossMargin: number;
    estimatedGrossMarginPercent: number;
    recipeCoveragePercent: number;
    inventoryValue: number;
    immobilizedCapital: number;
    rotation90Days: number;
    inventoryDays: number | null;
    slowRotationProducts: number;
    noOutputProducts: number;
  };

  salesByGroup: Array<{
    name: string;
    sales: number;
    cost: number;
    margin: number;
    marginPercent: number;
  }>;

  salesByDay: Array<{
    date: string;
    sales: number;
  }>;

  topArticles: Array<{
    name: string;
    sales: number;
  }>;

  mostProfitableArticles: Array<{
    name: string;
    sales: number;
    cost: number;
    margin: number;
    marginPercent: number;
  }>;

  leastProfitableArticles: Array<{
    name: string;
    sales: number;
    cost: number;
    margin: number;
    marginPercent: number;
  }>;

  waiterPerformance: Array<{
    rank: number;
    name: string;
    sales: number;
    share: number;
    quantity: number;
    differentArticles: number;
    topArticles: Array<{
      name: string;
      sales: number;
      quantity: number;
      share: number;
    }>;
  }>;

  waiterRanking: Array<{
    rank: number;
    name: string;
    sales: number;
    share: number;
  }>;

  inventoryByWarehouse: Array<{
    name: string;
    value: number;
  }>;

  inventoryAging: Array<{
    name: string;
    value: number;
  }>;

  topInventory: Array<{
    itemName: string;
    warehouseCode: string;
    quantity: number;
    averageCost: number;
    value: number;
    lastOutputAt: string | null;
    daysWithoutOutput: number | null;
    isImmobilized: boolean;
  }>;

  topImmobilized: MonthlyAnalytics["topInventory"];

  monthlyInventoryValues: Array<{
    year: number;
    month: number;
    value: number;
  }>;

  controls: Record<string, unknown> | null;
}
