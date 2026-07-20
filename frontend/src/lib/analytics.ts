import type {
  GoodsReceipt,
  InventoryBalance,
  InventoryMovement,
  PurchaseOrder,
} from '../types/api';

import {
  toNumber,
} from './format';

const dayMilliseconds =
  24 * 60 * 60 * 1000;

export interface DashboardAnalytics {
  totalInventoryValue: number;
  immobilizedCapital: number;

  turnover90Days: number;

  estimatedInventoryDays:
    | number
    | null;

  productsWithStock: number;
  zeroBalanceProducts: number;

  slowRotationProducts: number;
  productsWithoutOutputs: number;

  pendingPurchaseOrders: number;
  draftGoodsReceipts: number;

  warehouseValues: Array<{
    name: string;
    value: number;
  }>;

  monthLabels: string[];
  entryValues: number[];
  outputValues: number[];

  agingBuckets: Array<{
    name: string;
    value: number;
  }>;

  topImmobilized: Array<{
    name: string;
    value: number;
  }>;
}

function balanceKey(
  warehouseId: string,
  productId: string,
): string {
  return `${warehouseId}:${productId}`;
}

function daysBetween(
  older: Date,
  newer: Date,
): number {
  return Math.max(
    0,
    Math.floor(
      (
        newer.getTime() -
        older.getTime()
      ) / dayMilliseconds,
    ),
  );
}

function monthKey(
  date: Date,
): string {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, '0'),
  ].join('-');
}

function monthLabel(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    'es-EC',
    {
      month: 'short',
    },
  )
    .format(date)
    .replace('.', '');
}

export function buildAnalytics(
  balances: InventoryBalance[],
  movements: InventoryMovement[],
  purchaseOrders: PurchaseOrder[],
  goodsReceipts: GoodsReceipt[],
): DashboardAnalytics {
  const now = new Date();

  const postedOutputs =
    movements.filter(
      (movement) =>
        movement.status ===
          'POSTED' &&
        movement.direction ===
          'OUT',
    );

  const lastOutputByBalance =
    new Map<string, Date>();

  for (
    const movement of postedOutputs
  ) {
    const key = balanceKey(
      movement.warehouseId,
      movement.productId,
    );

    const movementDate =
      new Date(
        movement.occurredAt,
      );

    const current =
      lastOutputByBalance.get(
        key,
      );

    if (
      !current ||
      movementDate.getTime() >
        current.getTime()
    ) {
      lastOutputByBalance.set(
        key,
        movementDate,
      );
    }
  }

  let totalInventoryValue = 0;
  let immobilizedCapital = 0;

  let productsWithStock = 0;
  let zeroBalanceProducts = 0;

  let slowRotationProducts = 0;
  let productsWithoutOutputs = 0;

  const warehouseMap =
    new Map<string, number>();

  const immobilizedMap =
    new Map<string, number>();

  const agingMap =
    new Map<string, number>([
      ['0–30 días', 0],
      ['31–60 días', 0],
      ['61–90 días', 0],
      [
        'Más de 90 / sin salidas',
        0,
      ],
    ]);

  for (const balance of balances) {
    const quantity =
      toNumber(
        balance.quantityOnHand,
      );

    const inventoryValue =
      toNumber(
        balance.inventoryValue,
      );

    totalInventoryValue +=
      inventoryValue;

    warehouseMap.set(
      balance.warehouse.name,
      (
        warehouseMap.get(
          balance.warehouse.name,
        ) ?? 0
      ) + inventoryValue,
    );

    if (quantity > 0) {
      productsWithStock += 1;
    } else {
      zeroBalanceProducts += 1;
    }

    if (quantity <= 0) {
      continue;
    }

    const key = balanceKey(
      balance.warehouseId,
      balance.productId,
    );

    const lastOutput =
      lastOutputByBalance.get(
        key,
      );

    const daysWithoutOutput =
      lastOutput
        ? daysBetween(
            lastOutput,
            now,
          )
        : null;

    let agingBucket =
      'Más de 90 / sin salidas';

    if (
      daysWithoutOutput !== null
    ) {
      if (
        daysWithoutOutput <= 30
      ) {
        agingBucket =
          '0–30 días';
      } else if (
        daysWithoutOutput <= 60
      ) {
        agingBucket =
          '31–60 días';
      } else if (
        daysWithoutOutput <= 90
      ) {
        agingBucket =
          '61–90 días';
      }
    }

    agingMap.set(
      agingBucket,
      (
        agingMap.get(
          agingBucket,
        ) ?? 0
      ) + inventoryValue,
    );

    const hasNoOutputs =
      daysWithoutOutput === null;

    const hasSlowRotation =
      daysWithoutOutput !== null &&
      daysWithoutOutput >= 60;

    const isImmobilized =
      hasNoOutputs ||
      (
        daysWithoutOutput ?? 0
      ) >= 60;

    if (hasNoOutputs) {
      productsWithoutOutputs += 1;
    }

    if (hasSlowRotation) {
      slowRotationProducts += 1;
    }

    if (isImmobilized) {
      immobilizedCapital +=
        inventoryValue;

      const productName =
        `${balance.product.code} · ${balance.product.name}`;

      immobilizedMap.set(
        productName,
        (
          immobilizedMap.get(
            productName,
          ) ?? 0
        ) + inventoryValue,
      );
    }
  }

  const ninetyDaysAgo =
    new Date(
      now.getTime() -
        90 * dayMilliseconds,
    );

  const outputCost90Days =
    postedOutputs
      .filter(
        (movement) =>
          new Date(
            movement.occurredAt,
          ).getTime() >=
          ninetyDaysAgo.getTime(),
      )
      .reduce(
        (total, movement) =>
          total +
          toNumber(
            movement.totalCost,
          ),
        0,
      );

  const turnover90Days =
    totalInventoryValue > 0
      ? outputCost90Days /
        totalInventoryValue
      : 0;

  const estimatedInventoryDays =
    turnover90Days > 0
      ? 90 / turnover90Days
      : null;

  const months =
    Array.from(
      {
        length: 6,
      },
      (_, index) => {
        const date =
          new Date(
            now.getFullYear(),
            now.getMonth() -
              (5 - index),
            1,
          );

        return {
          key: monthKey(date),
          label:
            monthLabel(date),
        };
      },
    );

  const entryMap =
    new Map<string, number>();

  const outputMap =
    new Map<string, number>();

  for (
    const movement of movements
  ) {
    if (
      movement.status !==
      'POSTED'
    ) {
      continue;
    }

    const key = monthKey(
      new Date(
        movement.occurredAt,
      ),
    );

    if (
      !months.some(
        (month) =>
          month.key === key,
      )
    ) {
      continue;
    }

    const value =
      toNumber(
        movement.totalCost,
      );

    const targetMap =
      movement.direction === 'IN'
        ? entryMap
        : outputMap;

    targetMap.set(
      key,
      (
        targetMap.get(key) ?? 0
      ) + value,
    );
  }

  return {
    totalInventoryValue,
    immobilizedCapital,

    turnover90Days,
    estimatedInventoryDays,

    productsWithStock,
    zeroBalanceProducts,

    slowRotationProducts,
    productsWithoutOutputs,

    pendingPurchaseOrders:
      purchaseOrders.filter(
        (order) =>
          [
            'DRAFT',
            'APPROVED',
            'PARTIALLY_RECEIVED',
          ].includes(
            order.status,
          ),
      ).length,

    draftGoodsReceipts:
      goodsReceipts.filter(
        (receipt) =>
          receipt.status ===
          'DRAFT',
      ).length,

    warehouseValues: [
      ...warehouseMap.entries(),
    ]
      .map(
        ([name, value]) => ({
          name,
          value,
        }),
      )
      .sort(
        (left, right) =>
          right.value -
          left.value,
      ),

    monthLabels:
      months.map(
        (month) =>
          month.label,
      ),

    entryValues:
      months.map(
        (month) =>
          entryMap.get(
            month.key,
          ) ?? 0,
      ),

    outputValues:
      months.map(
        (month) =>
          outputMap.get(
            month.key,
          ) ?? 0,
      ),

    agingBuckets: [
      ...agingMap.entries(),
    ].map(
      ([name, value]) => ({
        name,
        value,
      }),
    ),

    topImmobilized: [
      ...immobilizedMap.entries(),
    ]
      .map(
        ([name, value]) => ({
          name,
          value,
        }),
      )
      .sort(
        (left, right) =>
          right.value -
          left.value,
      )
      .slice(0, 8),
  };
}