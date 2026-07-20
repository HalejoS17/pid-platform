import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  fetchAllPages,
} from '../lib/api';

import type {
  GoodsReceipt,
  InventoryBalance,
  InventoryMovement,
  PurchaseOrder,
} from '../types/api';

const commonOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: false,
};

export function useInventoryBalances() {
  return useQuery({
    queryKey: [
      'platform',
      'inventory-balances',
    ],

    queryFn: () =>
      fetchAllPages<
        InventoryBalance
      >(
        '/inventory/balances',
        {
          includeZero: true,
        },
      ),

    ...commonOptions,
  });
}

export function useInventoryMovements() {
  return useQuery({
    queryKey: [
      'platform',
      'inventory-movements',
    ],

    queryFn: () =>
      fetchAllPages<
        InventoryMovement
      >(
        '/inventory/movements',
      ),

    ...commonOptions,
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: [
      'platform',
      'purchase-orders',
    ],

    queryFn: () =>
      fetchAllPages<
        PurchaseOrder
      >(
        '/purchase-orders',
      ),

    ...commonOptions,
  });
}

export function useGoodsReceipts() {
  return useQuery({
    queryKey: [
      'platform',
      'goods-receipts',
    ],

    queryFn: () =>
      fetchAllPages<
        GoodsReceipt
      >(
        '/goods-receipts',
      ),

    ...commonOptions,
  });
}

export function useDashboardData() {
  const balances =
    useInventoryBalances();

  const movements =
    useInventoryMovements();

  const purchaseOrders =
    usePurchaseOrders();

  const goodsReceipts =
    useGoodsReceipts();

  const queryClient =
    useQueryClient();

  return {
    balances,
    movements,
    purchaseOrders,
    goodsReceipts,

    isLoading:
      balances.isLoading ||
      movements.isLoading ||
      purchaseOrders.isLoading ||
      goodsReceipts.isLoading,

    isFetching:
      balances.isFetching ||
      movements.isFetching ||
      purchaseOrders.isFetching ||
      goodsReceipts.isFetching,

    errors: [
      balances.error,
      movements.error,
      purchaseOrders.error,
      goodsReceipts.error,
    ].filter(
      (error): error is Error =>
        error instanceof Error,
    ),

    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: [
          'platform',
        ],
      }),
  };
}