const currencyFormatter =
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const compactCurrencyFormatter =
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });

const numberFormatter =
  new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 2,
  });

const dateFormatter =
  new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
  });

const dateTimeFormatter =
  new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function toNumber(
  value:
    | string
    | number
    | null
    | undefined,
): number {
  const result = Number(
    value ?? 0,
  );

  return Number.isFinite(result)
    ? result
    : 0;
}

export function formatCurrency(
  value: number,
): string {
  return currencyFormatter.format(
    value,
  );
}

export function formatCompactCurrency(
  value: number,
): string {
  return compactCurrencyFormatter.format(
    value,
  );
}

export function formatNumber(
  value: number,
): string {
  return numberFormatter.format(
    value,
  );
}

export function formatDate(
  value:
    | string
    | Date
    | null,
): string {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(
    new Date(value),
  );
}

export function formatDateTime(
  value:
    | string
    | Date
    | null,
): string {
  if (!value) {
    return '—';
  }

  return dateTimeFormatter.format(
    new Date(value),
  );
}