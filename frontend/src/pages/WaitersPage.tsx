import { AxiosError } from 'axios';
import type { EChartsOption } from 'echarts';
import {
  ChevronDown,
  Medal,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { EChart } from '../components/EChart';
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
} from '../components/ui';
import { useMonthlyAnalytics } from '../hooks/use-monthly-imports';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from '../lib/format';
import type { MonthlyAnalyticsFilters } from '../types/monthly-imports';

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

const selectClass =
  'w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/20';

function initialPeriod() {
  const saved = localStorage.getItem('pid.analytics.period');

  if (saved) {
    try {
      const parsed = JSON.parse(saved) as {
        year?: number;
        month?: number;
      };

      if (parsed.year && parsed.month) {
        return {
          year: parsed.year,
          month: parsed.month,
        };
      }
    } catch {
      // Se utiliza el periodo inicial.
    }
  }

  return {
    year: 2024,
    month: 3,
  };
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#0C1D63]">{value}</p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2570B8]">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

export function WaitersPage() {
  const [period, setPeriod] = useState(initialPeriod);
  const [filters, setFilters] = useState<MonthlyAnalyticsFilters>({});
  const [selectedWaiter, setSelectedWaiter] = useState('');

  const query = useMonthlyAnalytics(period.year, period.month, filters);
  const data = query.data;

  const waiterPerformance = useMemo(
    () => data?.waiterPerformance ?? [],
    [data],
  );

  const selectedWaiterData =
    waiterPerformance.find((waiter) => waiter.name === selectedWaiter) ??
    waiterPerformance[0];

  const totalSales = waiterPerformance.reduce(
    (total, waiter) => total + waiter.sales,
    0,
  );

  const totalQuantity = waiterPerformance.reduce(
    (total, waiter) => total + waiter.quantity,
    0,
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const updatePeriod = (next: { year: number; month: number }) => {
    setPeriod(next);
    setFilters({});
    setSelectedWaiter('');
    localStorage.setItem('pid.analytics.period', JSON.stringify(next));
  };

  const salesByWaiterOption = useMemo<EChartsOption>(
    () => ({
      color: ['#0C1D63'],
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      grid: {
        left: 12,
        right: 24,
        top: 18,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: string | number) =>
            formatCompactCurrency(Number(value)),
        },
        splitLine: {
          lineStyle: {
            color: '#EEF2F7',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: waiterPerformance
          .slice(0, 15)
          .map((waiter) => waiter.name)
          .reverse(),
        axisLabel: {
          color: '#475569',
          width: 150,
          overflow: 'truncate',
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          type: 'bar',
          data: waiterPerformance
            .slice(0, 15)
            .map((waiter) => waiter.sales)
            .reverse(),
          barMaxWidth: 25,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
          },
        },
      ],
    }),
    [waiterPerformance],
  );

  const shareOption = useMemo<EChartsOption>(
    () => ({
      color: [
        '#0C1D63',
        '#2570B8',
        '#10B981',
        '#F59E0B',
        '#FF2402',
        '#64748B',
      ],
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>{c} ({d}%)',
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: {
          color: '#475569',
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '43%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: '#FFFFFF',
            borderWidth: 4,
            borderRadius: 8,
          },
          label: {
            formatter: '{b}\n{d}%',
            color: '#334155',
          },
          data: waiterPerformance.slice(0, 10).map((waiter) => ({
            name: waiter.name,
            value: waiter.sales,
          })),
        },
      ],
    }),
    [waiterPerformance],
  );

  const selectedArticlesOption = useMemo<EChartsOption>(
    () => ({
      color: ['#2570B8'],
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      grid: {
        left: 12,
        right: 20,
        top: 12,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: string | number) =>
            formatCompactCurrency(Number(value)),
        },
        splitLine: {
          lineStyle: {
            color: '#EEF2F7',
          },
        },
      },
      yAxis: {
        type: 'category',
        data:
          selectedWaiterData?.topArticles
            .slice(0, 10)
            .map((article) => article.name)
            .reverse() ?? [],
        axisLabel: {
          color: '#475569',
          width: 170,
          overflow: 'truncate',
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          type: 'bar',
          data:
            selectedWaiterData?.topArticles
              .slice(0, 10)
              .map((article) => article.sales)
              .reverse() ?? [],
          barMaxWidth: 24,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
          },
        },
      ],
    }),
    [selectedWaiterData],
  );

  const isNotFound =
    query.error instanceof AxiosError && query.error.response?.status === 404;

  if (query.isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Análisis de meseros"
        description="Ventas, participación y detalle de artículos comercializados por cada integrante."
        onRefresh={() => {
          void query.refetch();
        }}
        refreshing={query.isFetching}
      />

      <details
        open
        className="group overflow-hidden rounded-2xl bg-[#0C1D63] shadow-lg"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-white marker:hidden">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <UsersRound className="size-5" />
            </div>

            <div>
              <h2 className="font-bold">Parámetros del análisis</h2>
              <p className="text-sm text-blue-100">
                Despliega o contrae los filtros de meseros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0C1D63]">
                {activeFilterCount} activos
              </span>
            ) : null}

            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </div>
        </summary>

        <div className="border-t border-white/15 px-5 pb-5 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-semibold text-white">
                Año
              </span>
              <select
                value={period.year}
                onChange={(event) =>
                  updatePeriod({
                    ...period,
                    year: Number(event.target.value),
                  })
                }
                className={selectClass}
              >
                {Array.from({ length: 10 }, (_, index) => 2020 + index).map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-white">
                Mes
              </span>
              <select
                value={period.month}
                onChange={(event) =>
                  updatePeriod({
                    ...period,
                    month: Number(event.target.value),
                  })
                }
                className={selectClass}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-white">
                Grupo 1
              </span>
              <select
                value={filters.group1 ?? ''}
                onChange={(event) => {
                  setFilters({
                    group1: event.target.value || undefined,
                  });
                  setSelectedWaiter('');
                }}
                className={selectClass}
              >
                <option value="">Todos los grupos</option>
                {(data?.filterOptions.groups1 ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-white">
                Grupo 2
              </span>
              <select
                value={filters.group2 ?? ''}
                onChange={(event) => {
                  setFilters((current) => ({
                    group1: current.group1,
                    group2: event.target.value || undefined,
                  }));
                  setSelectedWaiter('');
                }}
                className={selectClass}
              >
                <option value="">Todos los subgrupos</option>
                {(data?.filterOptions.groups2 ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold text-white">
                Plato o artículo
              </span>
              <select
                value={filters.article ?? ''}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    article: event.target.value || undefined,
                  }));
                  setSelectedWaiter('');
                }}
                className={selectClass}
              >
                <option value="">Todos los artículos</option>
                {(data?.filterOptions.articles ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                disabled={activeFilterCount === 0}
                onClick={() => {
                  setFilters({});
                  setSelectedWaiter('');
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw className="size-4" />
                Restablecer filtros
              </button>
            </div>
          </div>
        </div>
      </details>

      {isNotFound ? (
        <EmptyPanel
          title="El periodo todavía no fue cargado"
          description="Carga los cuatro reportes mensuales antes de consultar el análisis de meseros."
        />
      ) : (
        <ErrorPanel errors={query.error ? [query.error] : []} />
      )}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Ventas de meseros"
              value={formatCurrency(totalSales)}
              detail="Suma del total vendido por todos los meseros dentro del filtro."
              icon={<ReceiptText className="size-5" />}
            />

            <SummaryCard
              label="Meseros con ventas"
              value={formatNumber(waiterPerformance.length)}
              detail="Integrantes con actividad comercial registrada."
              icon={<UsersRound className="size-5" />}
            />

            <SummaryCard
              label="Cantidad vendida"
              value={formatNumber(totalQuantity)}
              detail="Unidades reportadas en el archivo de ventas por mesero."
              icon={<ShoppingBag className="size-5" />}
            />

            <SummaryCard
              label="Líder del periodo"
              value={waiterPerformance[0]?.name ?? 'Sin información'}
              detail={
                waiterPerformance[0]
                  ? formatCurrency(waiterPerformance[0].sales)
                  : 'No existen ventas para el filtro.'
              }
              icon={<Trophy className="size-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-slate-900">Ventas por mesero</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Comparación del valor total comercializado.
                </p>
              </div>
              <div className="p-4">
                <EChart option={salesByWaiterOption} height={430} />
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  Participación en ventas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Distribución porcentual del total entre los principales meseros.
                </p>
              </div>
              <div className="p-4">
                <EChart option={shareOption} height={430} />
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-5 border-b border-slate-100 bg-slate-50 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Consultar detalle individual
                </span>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedWaiterData?.name ?? ''}
                    onChange={(event) => setSelectedWaiter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
                  >
                    {waiterPerformance.map((waiter) => (
                      <option key={waiter.name} value={waiter.name}>
                        {waiter.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              {selectedWaiterData ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#0C1D63] px-4 py-2.5 text-sm font-semibold text-white">
                  <Medal className="size-4 text-amber-300" />
                  Posición #{selectedWaiterData.rank}
                </div>
              ) : null}
            </div>

            {selectedWaiterData ? (
              <>
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Vendido
                    </p>
                    <p className="mt-2 text-xl font-bold text-[#0C1D63]">
                      {formatCurrency(selectedWaiterData.sales)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Participación
                    </p>
                    <p className="mt-2 text-xl font-bold text-emerald-700">
                      {(selectedWaiterData.share * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cantidad
                    </p>
                    <p className="mt-2 text-xl font-bold text-[#0C1D63]">
                      {formatNumber(selectedWaiterData.quantity)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Artículos distintos
                    </p>
                    <p className="mt-2 text-xl font-bold text-amber-700">
                      {selectedWaiterData.differentArticles}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 border-t border-slate-100 p-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <article>
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-900">
                        Principales artículos vendidos
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Artículos con mayor aporte a la venta del mesero.
                      </p>
                    </div>
                    <EChart option={selectedArticlesOption} height={390} />
                  </article>

                  <article className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-[#0C1D63] text-xs uppercase tracking-wide text-white">
                          <tr>
                            <th className="px-4 py-3">Artículo</th>
                            <th className="px-4 py-3 text-right">Cantidad</th>
                            <th className="px-4 py-3 text-right">Venta</th>
                            <th className="px-4 py-3 text-right">
                              Participación
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {selectedWaiterData.topArticles.map((article) => (
                            <tr
                              key={article.name}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {article.name}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatNumber(article.quantity)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#0C1D63]">
                                {formatCurrency(article.sales)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {(article.share * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <EmptyPanel
                title="Sin información de meseros"
                description="No existen ventas para los filtros seleccionados."
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
