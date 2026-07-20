import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from 'lucide-react';
import {
  useMemo,
  useState,
} from 'react';
import {
  ErrorPanel,
  PageHeader,
  StatusBadge,
} from '../components/ui';
import {
  downloadMonthlyImportReport,
  useMonthlyImportHistory,
  useProcessMonthlyImport,
} from '../hooks/use-monthly-imports';
import {
  downloadTextFile,
  getApiErrorReport,
} from '../lib/api';
import type { DownloadableApiErrorReport } from '../lib/api';
import {
  formatDateTime,
  formatNumber,
} from '../lib/format';
import type {
  MonthlyImportBatch,
} from '../types/monthly-imports';

const months = [
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

const currentYear = new Date().getFullYear();

interface FileFieldProps {
  label: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function FileField({
  label,
  description,
  file,
  onChange,
}: FileFieldProps) {
  return (
    <label className="surface-card group block cursor-pointer p-5 transition hover:border-[#2570B8] hover:shadow-lg">
      <input
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(event) =>
          onChange(
            event.target.files?.[0] ?? null,
          )
        }
      />

      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2570B8] transition group-hover:bg-[#2570B8] group-hover:text-white">
          <FileSpreadsheet className="size-6" />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {label}
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>

          <p
            className={`mt-3 truncate text-sm font-semibold ${
              file
                ? 'text-emerald-600'
                : 'text-[#2570B8]'
            }`}
          >
            {file
              ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : 'Seleccionar archivo .xlsx'}
          </p>
        </div>
      </div>
    </label>
  );
}

function controlValue(
  batch: MonthlyImportBatch,
  fileType: string,
  key: string,
): string {
  const file = batch.files?.find(
    (item) => item.type === fileType,
  );

  const value =
    file?.controlTotals?.[key];

  if (
    typeof value === 'number'
  ) {
    return new Intl.NumberFormat(
      'es-EC',
      {
        maximumFractionDigits: 2,
      },
    ).format(value);
  }

  return value === null ||
    value === undefined
    ? '—'
    : String(value);
}

export function MonthlyImportsPage() {
  const [year, setYear] =
    useState(2024);

  const [month, setMonth] =
    useState(3);

  const [kardex, setKardex] =
    useState<File | null>(null);

  const [recipes, setRecipes] =
    useState<File | null>(null);

  const [sales, setSales] =
    useState<File | null>(null);

  const [waiterSales, setWaiterSales] =
    useState<File | null>(null);

  const [lastBatch, setLastBatch] =
    useState<MonthlyImportBatch | null>(
      null,
    );

  const [lastFailureReport, setLastFailureReport] =
    useState<DownloadableApiErrorReport | null>(null);

  const history =
    useMonthlyImportHistory();

  const processImport =
    useProcessMonthlyImport();

  const years = useMemo(
    () =>
      Array.from(
        {
          length: Math.max(
            8,
            currentYear - 2020 + 2,
          ),
        },
        (_, index) => 2020 + index,
      ),
    [],
  );

  const allFilesReady =
    kardex !== null &&
    recipes !== null &&
    sales !== null &&
    waiterSales !== null;

  const submit = async () => {
    if (!kardex || !recipes || !sales || !waiterSales) {
      return;
    }

    setLastFailureReport(null);
    setLastBatch(null);

    try {
      const result = await processImport.mutateAsync({
        year,
        month,
        kardex,
        recipes,
        sales,
        waiterSales,
      });

      setLastBatch(result);

      await downloadMonthlyImportReport(
        result.id,
        `reporte-carga-${result.periodYear}-${String(
          result.periodMonth,
        ).padStart(2, '0')}-v${result.version}.txt`,
      );
    } catch (error: unknown) {
      const report = getApiErrorReport(error);

      if (report) {
        setLastFailureReport(report);
        downloadTextFile(report.content, report.filename);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carga mensual"
        description="Carga los cuatro reportes históricos del mismo periodo. La versión anterior del mes se conserva como reemplazada."
        onRefresh={() => {
          void history.refetch();
        }}
        refreshing={history.isFetching}
      />

      <ErrorPanel
        errors={[
          history.error,
          processImport.error,
        ].filter(Boolean)}
      />

      {lastFailureReport ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-red-900">
                Reporte de validación generado
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700">
                El TXT indica en qué archivo, hoja y encabezado se encontró el problema.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  lastFailureReport.content,
                  lastFailureReport.filename,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Download className="size-4" />
              Descargar TXT del error
            </button>
          </div>
        </section>
      ) : null}

      <section className="surface-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Año
            </span>
            <select
              value={year}
              onChange={(event) =>
                setYear(
                  Number(event.target.value),
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            >
              {years.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Mes
            </span>
            <select
              value={month}
              onChange={(event) =>
                setMonth(
                  Number(event.target.value),
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#2570B8] focus:ring-4 focus:ring-blue-100"
            >
              {months.map(
                (name, index) => (
                  <option
                    key={name}
                    value={index + 1}
                  >
                    {name}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <FileField
          label="Kardex"
          description="Movimientos, saldos y costos de inventario."
          file={kardex}
          onChange={setKardex}
        />

        <FileField
          label="Recetas"
          description="Componentes y costos por artículo."
          file={recipes}
          onChange={setRecipes}
        />

        <FileField
          label="Ventas"
          description="Detalle de artículos vendidos, impuestos y servicio."
          file={sales}
          onChange={setSales}
        />

        <FileField
          label="Ventas por mesero"
          description="Ranking y participación del personal."
          file={waiterSales}
          onChange={setWaiterSales}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          El proceso de marzo 2024 carga aproximadamente 47 mil filas y puede tardar entre varios segundos y algunos minutos.
        </p>

        <button
          type="button"
          disabled={
            !allFilesReady ||
            processImport.isPending
          }
          onClick={() => {
            void submit();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0C1D63] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#2570B8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processImport.isPending ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <UploadCloud className="size-5" />
          )}

          {processImport.isPending
            ? 'Procesando los cuatro archivos…'
            : 'Procesar carga mensual'}
        </button>
      </div>

      {lastBatch ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-emerald-900">
                Carga mensual completada
              </h2>

              <p className="mt-1 text-sm text-emerald-700">
                {months[lastBatch.periodMonth - 1]} {lastBatch.periodYear} · versión {lastBatch.version}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-emerald-700">
                    Filas válidas
                  </p>
                  <p className="font-bold text-emerald-950">
                    {formatNumber(lastBatch.validRows)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Ignoradas
                  </p>
                  <p className="font-bold text-emerald-950">
                    {formatNumber(lastBatch.ignoredRows)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Errores
                  </p>
                  <p className="font-bold text-emerald-950">
                    {formatNumber(lastBatch.errorRows)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Estado
                  </p>
                  <StatusBadge status={lastBatch.status} />
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    void downloadMonthlyImportReport(
                      lastBatch.id,
                      `reporte-carga-${lastBatch.periodYear}-${String(
                        lastBatch.periodMonth,
                      ).padStart(2, '0')}-v${lastBatch.version}.txt`,
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download className="size-4" />
                  Descargar reporte TXT
                </button>
              </div>

              <div className="mt-5 grid gap-3 border-t border-emerald-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-emerald-700">
                    Kardex · filas
                  </p>
                  <p className="font-semibold text-emerald-950">
                    {lastBatch.files?.find(
                      (file) => file.type === 'KARDEX',
                    )?.validRows ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Recetas · filas
                  </p>
                  <p className="font-semibold text-emerald-950">
                    {lastBatch.files?.find(
                      (file) => file.type === 'RECIPES',
                    )?.validRows ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Ventas netas control
                  </p>
                  <p className="font-semibold text-emerald-950">
                    ${controlValue(
                      lastBatch,
                      'SALES',
                      'subtotal',
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700">
                    Ventas mesero control
                  </p>
                  <p className="font-semibold text-emerald-950">
                    ${controlValue(
                      lastBatch,
                      'WAITER_SALES',
                      'totalAmount',
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">
            Historial de cargas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Solo la versión actual de cada mes alimenta los dashboards.
          </p>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Periodo
                </th>
                <th className="px-4 py-3">
                  Versión
                </th>
                <th className="px-4 py-3">
                  Estado
                </th>
                <th className="px-4 py-3 text-right">
                  Válidas
                </th>
                <th className="px-4 py-3 text-right">
                  Ignoradas
                </th>
                <th className="px-4 py-3 text-right">
                  Errores
                </th>
                <th className="px-4 py-3">
                  Finalizada
                </th>
                <th className="px-4 py-3">
                  Reporte
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(history.data?.data ?? []).map(
                (batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3 font-semibold text-[#0C1D63]">
                      {months[batch.periodMonth - 1]} {batch.periodYear}
                      {batch.isCurrent ? ' · actual' : ''}
                    </td>
                    <td className="px-4 py-3">
                      {batch.version}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(batch.validRows)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(batch.ignoredRows)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(batch.errorRows)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDateTime(batch.completedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          void downloadMonthlyImportReport(
                            batch.id,
                            `reporte-carga-${batch.periodYear}-${String(
                              batch.periodMonth,
                            ).padStart(2, '0')}-v${batch.version}.txt`,
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#2570B8] transition hover:border-[#2570B8]"
                      >
                        <Download className="size-4" />
                        TXT
                      </button>
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