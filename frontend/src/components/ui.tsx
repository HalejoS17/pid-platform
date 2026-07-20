import type {
  ReactNode,
} from 'react';

import {
  AlertTriangle,
  Database,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';

import {
  getApiErrorMessage,
} from '../lib/api';

interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  icon: ReactNode;

  tone?:
    | 'blue'
    | 'navy'
    | 'red'
    | 'green'
    | 'amber';
}

const toneClasses = {
  blue: {
    icon:
      'bg-blue-50 text-[#2570B8]',
    accent:
      'bg-[#2570B8]',
  },

  navy: {
    icon:
      'bg-indigo-50 text-[#0C1D63]',
    accent:
      'bg-[#0C1D63]',
  },

  red: {
    icon:
      'bg-red-50 text-[#FF2402]',
    accent:
      'bg-[#FF2402]',
  },

  green: {
    icon:
      'bg-emerald-50 text-emerald-600',
    accent:
      'bg-emerald-500',
  },

  amber: {
    icon:
      'bg-amber-50 text-amber-600',
    accent:
      'bg-amber-500',
  },
};

export function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = 'blue',
}: KpiCardProps) {
  const classes =
    toneClasses[tone];

  return (
    <article className="surface-card relative overflow-hidden p-5">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${classes.accent}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          {detail ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {detail}
            </p>
          ) : null}
        </div>

        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <section
      className={`surface-card min-w-0 p-5 ${className}`}
    >
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </header>

      {children}
    </section>
  );
}

interface PageHeaderProps {
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function PageHeader({
  title,
  description,
  onRefresh,
  refreshing = false,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2570B8]">
          PID Plataforma
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0C1D63] sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#2570B8] hover:text-[#2570B8] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            className={`size-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Actualizar
        </button>
      ) : null}
    </div>
  );
}

const statusClasses:
  Record<string, string> = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

  INACTIVE:
    'bg-slate-100 text-slate-600 ring-slate-500/20',

  DRAFT:
    'bg-amber-50 text-amber-700 ring-amber-600/20',

  APPROVED:
    'bg-blue-50 text-[#2570B8] ring-blue-600/20',

  PARTIALLY_RECEIVED:
    'bg-indigo-50 text-indigo-700 ring-indigo-600/20',

  RECEIVED:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

  POSTED:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',

  CANCELLED:
    'bg-red-50 text-[#FF2402] ring-red-600/20',

  VOIDED:
    'bg-red-50 text-[#FF2402] ring-red-600/20',

  IN:
    'bg-blue-50 text-[#2570B8] ring-blue-600/20',

  OUT:
    'bg-red-50 text-[#FF2402] ring-red-600/20',
};

const statusLabels:
  Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DRAFT: 'Borrador',
  APPROVED: 'Aprobada',

  PARTIALLY_RECEIVED:
    'Recepción parcial',

  RECEIVED: 'Recibida',
  POSTED: 'Publicada',
  CANCELLED: 'Cancelada',
  VOIDED: 'Anulada',
  IN: 'Entrada',
  OUT: 'Salida',
};

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusClasses[status] ??
        'bg-slate-100 text-slate-700 ring-slate-500/20'
      }`}
    >
      {statusLabels[status] ??
        status}
    </span>
  );
}

export function LoadingPanel() {
  return (
    <div className="surface-card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <LoaderCircle className="size-9 animate-spin text-[#2570B8]" />

      <div>
        <p className="font-semibold text-slate-900">
          Cargando información
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Consultando el backend y preparando los indicadores.
        </p>
      </div>
    </div>
  );
}

export function ErrorPanel({
  errors,
}: {
  errors: unknown[];
}) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#FF2402]" />

        <div>
          <p className="font-semibold text-red-900">
            No se pudo cargar toda la información
          </p>

          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map(
              (error, index) => (
                <li
                  key={`${getApiErrorMessage(error)}-${index}`}
                >
                  {getApiErrorMessage(
                    error,
                  )}
                </li>
              ),
            )}
          </ul>

          <p className="mt-2 text-xs text-red-600">
            Verifica que NestJS esté ejecutándose en el puerto 4000.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyPanel({
  title =
    'Todavía no hay datos',
  description =
    'Registra movimientos para comenzar a visualizar información.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
      <Database className="size-9 text-slate-400" />

      <p className="mt-3 font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}