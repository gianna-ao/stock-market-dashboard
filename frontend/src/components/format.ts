/**
 * Display formatting helpers. The backend returns full-precision numbers; all
 * rounding/shortening for the UI happens here so the chart and table stay consistent.
 *
 * A fixed locale ('en-US') is used deliberately: it keeps formatting consistent for
 * every viewer and makes the output deterministic across machines and CI (the default
 * locale varies with the environment, which would otherwise change output and break
 * these functions' tests).
 */

const LOCALE = 'en-US';

/** Formats a price to exactly two decimal places, e.g. 333.1 -> "333.10". */
export function formatPrice(value: number): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formats a volume compactly, e.g. 1234567 -> "1.2M". */
export function formatVolume(value: number): string {
  return value.toLocaleString(LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

/**
 * Turns an ISO day ("2026-11-04") into a short label ("Nov 4") for axes and tables.
 * Parsed at local midnight so the calendar date is preserved regardless of time zone.
 * Falls back to the raw string if it can't be parsed.
 */
export function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }
  return date.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
}
