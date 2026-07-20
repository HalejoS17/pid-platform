import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Search,
} from 'lucide-react';

import {
  useMemo,
  useState,
} from 'react';

import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StatusBadge,
} from '../components/ui';

import {
  useGoodsReceipts,
  useInventoryBalances,
  useInventoryMovements,
  usePurchaseOrders,
} from '../hooks/use-platform-data';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  toNumber,
} from '../lib/format';

export function InventoryPage() {
  const query =
    useInventoryBalances();

  const [
    search,
    setSearch,
  ] = useState('');

  const filtered =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return query.data ?? [];
      }

      return (
        query.data ?? []
      ).filter(
        (item) =>
          [
            item.product.code,
            item.product.name,
            item.warehouse.code,
            item.warehouse.name,
            item.warehouse.branch
              .name,
          ].some(
            (value) =>
              value
                .toLowerCase()
                .includes(
                  normalized,
                ),
          ),
      );
    }, [
      query.data,
      search,
    ]);

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  const totalValue =
    filtered.reduce(
      (total, item) =>
        total +
        toNumber(
          item.inventoryValue,
        ),
      0,
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario por bodega"

        description="Existencias, reservas, disponibilidad, costo promedio y valor monetario."

        onRefresh={() => {
          void query.refetch();
        }}

        refreshing={
          query.isFetching
        }
      />

      <ErrorPanel
        errors={
          query.error
            ? [query.error]
            : []
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Registros
          </p>

          <p className="mt-2 text-2xl font-bold text-[#0C1D63]">
            {formatNumber(
              filtered.length,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Valor visible
          </p>

          <p className="mt-2 text-2xl font-bold text-[#2570B8]">
            {formatCurrency(
              totalValue,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Con existencia
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {formatNumber(
              filtered.filter(
                (item) =>
                  toNumber(
                    item.quantityOnHand,
                  ) > 0,
              ).length,
            )}
          </p>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Existencias actuales
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Desplaza horizontalmente la tabla en celular.
            </p>
          </div>

          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}

              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }

              placeholder="Buscar producto o bodega"

              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Producto
                </th>

                <th className="px-4 py-3">
                  Bodega
                </th>

                <th className="px-4 py-3 text-right">
                  Existencia
                </th>

                <th className="px-4 py-3 text-right">
                  Reservado
                </th>

                <th className="px-4 py-3 text-right">
                  Disponible
                </th>

                <th className="px-4 py-3 text-right">
                  Costo promedio
                </th>

                <th className="px-4 py-3 text-right">
                  Valor
                </th>

                <th className="px-4 py-3">
                  Último movimiento
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {
                          item.product
                            .name
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          item.product
                            .code
                        }
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {
                          item.warehouse
                            .name
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          item.warehouse
                            .branch.name
                        }
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatNumber(
                        toNumber(
                          item.quantityOnHand,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatNumber(
                        toNumber(
                          item.quantityReserved,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right text-[#2570B8]">
                      {formatNumber(
                        toNumber(
                          item.quantityAvailable,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(
                        toNumber(
                          item.averageUnitCost,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-[#0C1D63]">
                      {formatCurrency(
                        toNumber(
                          item.inventoryValue,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(
                        item.lastMovementAt,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          {filtered.length ===
          0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
              <Boxes className="size-9 text-slate-300" />

              <p className="mt-3 font-semibold text-slate-700">
                No existen saldos para mostrar
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function MovementsPage() {
  const query =
    useInventoryMovements();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    direction,
    setDirection,
  ] = useState('ALL');

  const filtered =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return (
        query.data ?? []
      ).filter(
        (movement) => {
          const matchesDirection =
            direction ===
              'ALL' ||
            movement.direction ===
              direction;

          const matchesSearch =
            !normalized ||
            [
              movement.product
                .code,

              movement.product
                .name,

              movement.warehouse
                .name,

              movement.referenceNumber ??
                '',

              movement.type,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalized,
                  ),
            );

          return (
            matchesDirection &&
            matchesSearch
          );
        },
      );
    }, [
      direction,
      query.data,
      search,
    ]);

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  const entryValue =
    filtered
      .filter(
        (item) =>
          item.direction ===
          'IN',
      )
      .reduce(
        (total, item) =>
          total +
          toNumber(
            item.totalCost,
          ),
        0,
      );

  const outputValue =
    filtered
      .filter(
        (item) =>
          item.direction ===
          'OUT',
      )
      .reduce(
        (total, item) =>
          total +
          toNumber(
            item.totalCost,
          ),
        0,
      );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kardex de inventario"

        description="Entradas, salidas, ajustes, transferencias y recepciones."

        onRefresh={() => {
          void query.refetch();
        }}

        refreshing={
          query.isFetching
        }
      />

      <ErrorPanel
        errors={
          query.error
            ? [query.error]
            : []
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Movimientos visibles
          </p>

          <p className="mt-2 text-2xl font-bold text-[#0C1D63]">
            {formatNumber(
              filtered.length,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-[#2570B8]">
            <ArrowDownToLine className="size-4" />

            <p className="text-sm font-medium">
              Entradas
            </p>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#2570B8]">
            {formatCurrency(
              entryValue,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-[#FF2402]">
            <ArrowUpFromLine className="size-4" />

            <p className="text-sm font-medium">
              Salidas
            </p>
          </div>

          <p className="mt-2 text-2xl font-bold text-[#FF2402]">
            {formatCurrency(
              outputValue,
            )}
          </p>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}

              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }

              placeholder="Buscar producto, bodega o referencia"

              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={direction}

            onChange={(
              event,
            ) =>
              setDirection(
                event.target
                  .value,
              )
            }

            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">
              Todas
            </option>

            <option value="IN">
              Entradas
            </option>

            <option value="OUT">
              Salidas
            </option>
          </select>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Fecha
                </th>

                <th className="px-4 py-3">
                  Producto
                </th>

                <th className="px-4 py-3">
                  Bodega
                </th>

                <th className="px-4 py-3">
                  Tipo
                </th>

                <th className="px-4 py-3">
                  Dirección
                </th>

                <th className="px-4 py-3 text-right">
                  Cantidad base
                </th>

                <th className="px-4 py-3 text-right">
                  Costo
                </th>

                <th className="px-4 py-3 text-right">
                  Saldo posterior
                </th>

                <th className="px-4 py-3">
                  Referencia
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(
                (movement) => (
                  <tr
                    key={
                      movement.id
                    }
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(
                        movement.occurredAt,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {
                          movement
                            .product
                            .name
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          movement
                            .product
                            .code
                        }
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {
                        movement
                          .warehouse
                          .name
                      }
                    </td>

                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {
                        movement.type
                      }
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          movement
                            .direction
                        }
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatNumber(
                        toNumber(
                          movement.baseQuantity,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(
                        toNumber(
                          movement.totalCost,
                        ),
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {movement.balanceQuantityAfter
                        ? formatNumber(
                            toNumber(
                              movement.balanceQuantityAfter,
                            ),
                          )
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {movement.referenceNumber ??
                        movement.referenceType ??
                        '—'}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PurchaseOrdersPage() {
  const query =
    usePurchaseOrders();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    status,
    setStatus,
  ] = useState('ALL');

  const filtered =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return (
        query.data ?? []
      ).filter(
        (order) => {
          const matchesStatus =
            status === 'ALL' ||
            order.status ===
              status;

          const matchesSearch =
            !normalized ||
            [
              order.number,

              order.supplier
                .legalName,

              order.supplier
                .tradeName ?? '',

              order.warehouse
                .name,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalized,
                  ),
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      query.data,
      search,
      status,
    ]);

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de compra"

        description="Borradores, aprobaciones, recepciones parciales y órdenes completadas."

        onRefresh={() => {
          void query.refetch();
        }}

        refreshing={
          query.isFetching
        }
      />

      <ErrorPanel
        errors={
          query.error
            ? [query.error]
            : []
        }
      />

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}

              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }

              placeholder="Buscar orden, proveedor o bodega"

              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={status}

            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value,
              )
            }

            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">
              Todos los estados
            </option>

            <option value="DRAFT">
              Borrador
            </option>

            <option value="APPROVED">
              Aprobada
            </option>

            <option value="PARTIALLY_RECEIVED">
              Recepción parcial
            </option>

            <option value="RECEIVED">
              Recibida
            </option>

            <option value="CANCELLED">
              Cancelada
            </option>
          </select>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Orden
                </th>

                <th className="px-4 py-3">
                  Proveedor
                </th>

                <th className="px-4 py-3">
                  Bodega
                </th>

                <th className="px-4 py-3">
                  Fecha
                </th>

                <th className="px-4 py-3">
                  Esperada
                </th>

                <th className="px-4 py-3">
                  Estado
                </th>

                <th className="px-4 py-3 text-right">
                  Líneas
                </th>

                <th className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(
                (order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3 font-semibold text-[#0C1D63]">
                      {
                        order.number
                      }
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {
                          order
                            .supplier
                            .legalName
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          order
                            .supplier
                            .code
                        }
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {
                        order
                          .warehouse
                          .name
                      }
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(
                        order.orderDate,
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(
                        order.expectedDate,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          order.status
                        }
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      {
                        order.items
                          .length
                      }
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(
                        toNumber(
                          order.totalAmount,
                        ),
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function GoodsReceiptsPage() {
  const query =
    useGoodsReceipts();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    status,
    setStatus,
  ] = useState('ALL');

  const filtered =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      return (
        query.data ?? []
      ).filter(
        (receipt) => {
          const matchesStatus =
            status === 'ALL' ||
            receipt.status ===
              status;

          const matchesSearch =
            !normalized ||
            [
              receipt.number,

              receipt
                .purchaseOrder
                .number,

              receipt
                .purchaseOrder
                .supplier
                .legalName,

              receipt
                .supplierDocumentNumber ??
                '',

              receipt.warehouse
                .name,
            ].some(
              (value) =>
                value
                  .toLowerCase()
                  .includes(
                    normalized,
                  ),
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      query.data,
      search,
      status,
    ]);

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recepciones de mercadería"

        description="Recepciones en borrador, publicadas y anuladas."

        onRefresh={() => {
          void query.refetch();
        }}

        refreshing={
          query.isFetching
        }
      />

      <ErrorPanel
        errors={
          query.error
            ? [query.error]
            : []
        }
      />

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}

              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }

              placeholder="Buscar recepción, orden o proveedor"

              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={status}

            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value,
              )
            }

            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
          >
            <option value="ALL">
              Todos los estados
            </option>

            <option value="DRAFT">
              Borrador
            </option>

            <option value="POSTED">
              Publicada
            </option>

            <option value="VOIDED">
              Anulada
            </option>
          </select>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Recepción
                </th>

                <th className="px-4 py-3">
                  Orden
                </th>

                <th className="px-4 py-3">
                  Proveedor
                </th>

                <th className="px-4 py-3">
                  Bodega
                </th>

                <th className="px-4 py-3">
                  Fecha
                </th>

                <th className="px-4 py-3">
                  Estado
                </th>

                <th className="px-4 py-3 text-right">
                  Líneas
                </th>

                <th className="px-4 py-3 text-right">
                  Valor recibido
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(
                (receipt) => {
                  const total =
                    receipt.items.reduce(
                      (
                        sum,
                        item,
                      ) =>
                        sum +
                        toNumber(
                          item.totalCost,
                        ),
                      0,
                    );

                  return (
                    <tr
                      key={
                        receipt.id
                      }
                      className="hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0C1D63]">
                        {
                          receipt.number
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          receipt
                            .purchaseOrder
                            .number
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          receipt
                            .purchaseOrder
                            .supplier
                            .legalName
                        }
                      </td>

                      <td className="px-4 py-3">
                        {
                          receipt
                            .warehouse
                            .name
                        }
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(
                          receipt.receiptDate,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            receipt.status
                          }
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        {
                          receipt
                            .items
                            .length
                        }
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          total,
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}