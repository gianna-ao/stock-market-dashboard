import type { IntradayBar } from '../bars/intraday-bar.js';

/** The daily aggregate returned to the client. */
export interface DailyAggregate {
  /** Exchange-local calendar day, formatted YYYY-MM-DD. */
  day: string;
  /** Mean of the day's non-null bar lows (full precision). */
  lowAverage: number;
  /** Mean of the day's non-null bar highs (full precision). */
  highAverage: number;
  /** Sum of the day's non-null bar volumes. */
  volume: number;
}

/**
 * Groups 15-minute intraday bars by exchange-local day and computes, per day,
 * the average of bar lows, the average of bar highs, and the total volume.
 *
 * Low, high, and volume are handled independently: each average/sum uses only
 * that field's valid (non-null, finite) values, so one missing field does not
 * discard the others. A day is omitted if it has no valid lows or no valid highs,
 * because then at least one average would be undefined. Values are returned at
 * full precision; rounding is a presentation concern for the frontend.
 */
export function aggregateDailyData(
  bars: IntradayBar[],
  timeZone: string,
): DailyAggregate[] {
  // Group bars by their exchange-local calendar day.
  const barsByDay = new Map<string, IntradayBar[]>();
  for (const bar of bars) {
    const day = toExchangeDate(bar.timestamp, timeZone);
    const group = barsByDay.get(day);
    if (group) {
      group.push(bar);
    } else {
      barsByDay.set(day, [bar]);
    }
  }

  const aggregates: DailyAggregate[] = [];
  for (const [day, dayBars] of barsByDay) {
    const lows = dayBars.map((bar) => bar.low).filter(isFiniteNumber);
    const highs = dayBars.map((bar) => bar.high).filter(isFiniteNumber);
    const volumes = dayBars.map((bar) => bar.volume).filter(isFiniteNumber);

    // Need at least one valid low and one valid high to produce both averages.
    if (lows.length === 0 || highs.length === 0) {
      continue;
    }

    aggregates.push({
      day,
      lowAverage: average(lows),
      highAverage: average(highs),
      volume: sum(volumes),
    });
  }

  // Chronological order: YYYY-MM-DD strings sort lexically the same as by date.
  aggregates.sort((a, b) => a.day.localeCompare(b.day));
  return aggregates;
}

/** Narrows `number | null` to a usable, finite number (excludes null and NaN). */
function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return sum(values) / values.length;
}

/**
 * Formats an epoch-seconds timestamp as a YYYY-MM-DD calendar date in the given
 * IANA timezone. Uses Intl (built in, DST-aware) so the day boundary matches the
 * exchange's local date rather than UTC.
 */
function toExchangeDate(epochSeconds: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochSeconds * 1000));

  const get = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)!.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}
