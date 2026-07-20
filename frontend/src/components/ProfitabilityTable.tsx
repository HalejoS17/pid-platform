import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Medal,
} from 'lucide-react';
import { formatCurrency } from '../lib/format';
import type { MonthlyAnalytics } from '../types/monthly-imports';

type ProfitabilityItem = MonthlyAnalytics['mostProfitableArticles'][number];

function RankBadge({
  rank,
  mode,
}: {
  rank: number;
  mode: 'MOST' | 'LEAST';
}) {
  const topStyle =
    rank === 1
      ? 'bg-amber-100 text-amber-700'
      : rank === 2
        ? 'bg-slate-200 text-slate-700'
        : rank === 3
          ? 'bg-orange-100 text-orange-700'
          : 'bg-blue-50 text-[#2570B8]';

  const lowStyle =
    rank <= 3
      ? 'bg-red-50 text-[#FF2402]'
      : 'bg-amber-50 text-amber-700';

  return (
    <span
      className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${
        mode === 'MOST' ? topStyle : lowStyle
      }`}
    >
      {rank <= 3 && mode === 'MOST' ? (
        <Medal className="size-4" />
      ) : (
        rank
      )}
    </span>
  );
}

function MarginBadge({
  item,
  mode,
}: {
  item: ProfitabilityItem;
  mode: 'MOST' | 'LEAST';
}) {
  const positive = item.marginPercent >= 0;

  return (
    <span
      className={
        positive
          ? mode === 'MOST'
            ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700'
            : 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700'
          : 'inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-[#FF2402]'
      }
    >
      {positive ? (
        <ArrowUpRight className="size-3.5" />
      ) : (
        <ArrowDownRight className="size-3.5" />
      )}
      {(item.marginPercent * 100).toFixed(1)}%
    </span>
  );
}

export function ProfitabilityTable({
  items,
  mode,
}: {
  items: MonthlyAnalytics['mostProfitableArticles'];
  mode: 'MOST' | 'LEAST';
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-slate-500">
        No existen platos con receta homologada para el filtro seleccionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <article
            key={item.name}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <RankBadge rank={index + 1} mode={mode} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold leading-5 text-slate-900">
                    {item.name}
                  </h4>
                  <MarginBadge item={item} mode={mode} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Ventas
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#0C1D63]">
                      {formatCurrency(item.sales)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Costo
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-700">
                      {formatCurrency(item.cost)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Margen
                    </p>
                    <p
                      className={
                        item.margin >= 0
                          ? 'mt-1 text-xs font-bold text-emerald-700'
                          : 'mt-1 text-xs font-bold text-[#FF2402]'
                      }
                    >
                      {formatCurrency(item.margin)}
                    </p>
                  </div>
                </div>

                {item.cost < 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    <AlertTriangle className="size-4" />
                    Costo negativo: revisar la receta o el origen del costo.
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-[#0C1D63] text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-4">Posición</th>
              <th className="px-4 py-4">Plato</th>
              <th className="px-4 py-4 text-right">Ventas netas</th>
              <th className="px-4 py-4 text-right">Costo estimado</th>
              <th className="px-4 py-4 text-right">Margen estimado</th>
              <th className="px-4 py-4 text-right">Margen %</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr
                key={item.name}
                className="transition hover:bg-blue-50/40"
              >
                <td className="px-4 py-4">
                  <RankBadge rank={index + 1} mode={mode} />
                </td>

                <td className="px-4 py-4">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  {item.cost < 0 ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#FF2402]">
                      <AlertTriangle className="size-3.5" />
                      Revisar costo negativo
                    </div>
                  ) : null}
                </td>

                <td className="px-4 py-4 text-right font-semibold text-[#0C1D63]">
                  {formatCurrency(item.sales)}
                </td>

                <td
                  className={
                    item.cost < 0
                      ? 'px-4 py-4 text-right font-semibold text-[#FF2402]'
                      : 'px-4 py-4 text-right text-slate-700'
                  }
                >
                  {formatCurrency(item.cost)}
                </td>

                <td
                  className={
                    item.margin >= 0
                      ? 'px-4 py-4 text-right font-bold text-emerald-700'
                      : 'px-4 py-4 text-right font-bold text-[#FF2402]'
                  }
                >
                  {formatCurrency(item.margin)}
                </td>

                <td className="px-4 py-4 text-right">
                  <MarginBadge item={item} mode={mode} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        Rentabilidad estimada a partir de ventas netas y costos de recetas
        homologadas. Los costos negativos se muestran como observaciones para
        revisión.
      </div>
    </>
  );
}
