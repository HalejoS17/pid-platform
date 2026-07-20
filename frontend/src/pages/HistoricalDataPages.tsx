import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StatusBadge,
} from '../components/ui';
import {
  useHistoricalInventory,
  useHistoricalKardex,
} from '../hooks/use-historical-import-data';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../lib/format';

function activePeriod() {
  const saved = localStorage.getItem(
    'pid.analytics.period',
  );

  if (saved) {
    try {
      const value = JSON.parse(saved) as {
        year?: number;
        month?: number;
      };

      if (value.year && value.month) {
        return {
          year: value.year,
          month: value.month,
        };
      }
    } catch {
      // Use demo period.
    }
  }

  return {
    year: 2024,
    month: 3,
  };
}

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        {formatNumber(total)} registros
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            onPageChange(page - 1)
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          {'Anterior'}
        </button>

        <span className="px-2 text-sm text-slate-600">
          {`Pagina ${page} de ${Math.max(totalPages, 1)}`}
        </span>

        <button
          type="button"
          disabled={
            totalPages === 0 ||
            page >= totalPages
          }
          onClick={() =>
            onPageChange(page + 1)
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
        >
          {'Siguiente'}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const period = activePeriod();
  const [page, setPage] = useState(1);
  const [search, setSearch] =
    useState('');

  const query = useHistoricalInventory({
    year: period.year,
    month: period.month,
    page,
    limit: 50,
    search,
  });

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={'Inventario hist\u00f3rico por bodega'}
        description={`Cierre importado de ${
          monthNames[period.month - 1]
        } ${period.year}. Los datos provienen del Kardex mensual.`}
        onRefresh={() => {
          void query.refetch();
        }}
        refreshing={query.isFetching}
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
              query.data?.meta.total ??
                0,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Valor visible
          </p>
          <p className="mt-2 text-2xl font-bold text-[#2570B8]">
            {formatCurrency(
              query.data?.summary
                .totalInventoryValue ??
                0,
            )}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-sm text-slate-500">
            Con existencia
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {formatNumber(
              query.data?.summary
                .withStock ?? 0,
            )}
          </p>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {'Existencias del cierre mensual'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {'El valor usa saldo positivo por costo promedio.'}
            </p>
          </div>

          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
                setPage(1);
              }}
              placeholder={'Buscar insumo o bodega'}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Insumo
                </th>
                <th className="px-4 py-3">
                  Bodega
                </th>
                <th className="px-4 py-3 text-right">
                  Existencia
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
                <th
                  className="px-4 py-3 text-right"
                  title="Costo de salidas de los ?ltimos 90 días dividido para el inventario promedio de hasta tres cierres mensuales."
                >
                  Rotación 90 días
                </th>
                <th className="px-4 py-3">
                  {'\u00daltimo movimiento'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(query.data?.data ?? []).map(
                (item) => (
                  <tr
                    key={`${item.warehouseCode}:${item.itemNormalized}`}
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3">
                      {item.warehouseCode}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatNumber(
                        item.quantityOnHand,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#2570B8]">
                      {formatNumber(
                        item.quantityAvailable,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(
                        item.averageUnitCost,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0C1D63]">
                      {formatCurrency(
                        item.inventoryValue,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.rotation90DaysPercent ===
                      null ? (
                        <span className="text-slate-400">
                          Sin cálculo
                        </span>
                      ) : (
                        <span
                          className={
                            item.rotation90DaysPercent >=
                            100
                              ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700'
                              : item.rotation90DaysPercent >=
                                  50
                                ? 'inline-flex rounded-full bg-blue-50 px-2.5 py-1 font-bold text-[#2570B8]'
                                : 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700'
                          }
                          title="La rotación puede superar el 100% cuando las salidas valorizadas son mayores que el inventario promedio."
                        >
                          {formatNumber(
                            item.rotation90DaysPercent,
                          ) + '%'}
                        </span>
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

          {(query.data?.data.length ?? 0) ===
          0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
              <Boxes className="size-9 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                {'No existen saldos para el filtro seleccionado'}
              </p>
            </div>
          ) : null}
        </div>

        <Pagination
          page={page}
          totalPages={
            query.data?.meta.totalPages ??
            0
          }
          total={
            query.data?.meta.total ?? 0
          }
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

export function MovementsPage() {
  const period = activePeriod();
  const [page, setPage] = useState(1);
  const [search, setSearch] =
    useState('');
  const [direction, setDirection] =
    useState<'ALL' | 'IN' | 'OUT'>(
      'ALL',
    );

  const query = useHistoricalKardex({
    year: period.year,
    month: period.month,
    page,
    limit: 50,
    search,
    direction,
  });

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={'Kardex hist\u00f3rico'}
        description={`Movimientos importados de ${
          monthNames[period.month - 1]
        } ${period.year}.`}
        onRefresh={() => {
          void query.refetch();
        }}
        refreshing={query.isFetching}
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
            Movimientos
          </p>
          <p className="mt-2 text-2xl font-bold text-[#0C1D63]">
            {formatNumber(
              query.data?.meta.total ??
                0,
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
              query.data?.summary
                .entryValue ?? 0,
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
              query.data?.summary
                .outputValue ?? 0,
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
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
                setPage(1);
              }}
              placeholder={'Buscar insumo, bodega, documento o proveedor'}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={direction}
            onChange={(event) => {
              setDirection(
                event.target
                  .value as
                  | 'ALL'
                  | 'IN'
                  | 'OUT',
              );
              setPage(1);
            }}
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
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Fecha
                </th>
                <th className="px-4 py-3">
                  Insumo
                </th>
                <th className="px-4 py-3">
                  Bodega
                </th>
                <th className="px-4 py-3">
                  Tipo
                </th>
                <th className="px-4 py-3">
                  {'Direcci\u00f3n'}
                </th>
                <th className="px-4 py-3 text-right">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-right">
                  Costo unitario
                </th>
                <th className="px-4 py-3 text-right">
                  Costo total
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
              {(query.data?.data ?? []).map(
                (item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(
                        item.movementDate,
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3">
                      {item.warehouseCode}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {item.transactionType}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          item.direction
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {`${formatNumber(
                        item.quantity,
                      )} ${item.unitCode}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(
                        item.unitCost,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(
                        item.totalCost,
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(
                        item.balanceQuantity,
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.documentNumber ??
                        item.supplierName ??
                        '\u2014'}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={
            query.data?.meta.totalPages ??
            0
          }
          total={
            query.data?.meta.total ?? 0
          }
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}