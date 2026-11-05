import type { IntradayBar } from '../bars/intraday-bar.js';

/** The daily aggregate returned to the client. */
export interface DailyAggregate {
  /** Exchange-local calendar day, formatted YYYY-MM-DD. */
  day: string;
  /** Mean of the day's non-null bar lows (full precision). */
  lowAverage: number;
  /** Mean of the day's non-null bar highs (full precision). */
  highAverage: number;
  /** Sum of the day's non-null bar volumes; null when no bar reported volume. */
  volume: number | null;
}

/**
 * Groups 15-minute intraday bars by exchange-local day and computes, per day,
 * the average of bar lows, the average of bar highs, and the total volume.
 *
 * Low, high, and volume are handled independently: each average/sum uses only
 * that field's valid (non-null, finite) values, so one missing field does not
 * discard the others. A day is omitted if it has no valid lows or no valid highs,
 * because then at least one average would be undefined. Volume is the sum of the
 * day's present values, or null when no bar reported volume at all (null means
 * "unknown", which is deliberately distinct from a true zero). Values are returned
 * at full precision; rounding is a presentation concern for the frontend.
 */
export function aggregateDailyData(
  bars: IntradayBar[],
  timeZone: string,
): DailyAggregate[] {
  // One formatter for the whole call — constructing Intl.DateTimeFormat is costly,
  // so we reuse it across every bar rather than rebuilding it per timestamp.
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Group bars by their exchange-local calendar day.
  const barsByDay = new Map<string, IntradayBar[]>();
  for (const bar of bars) {
    const day = toExchangeDate(bar.timestamp, dateFormatter);
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
      // null = no volume reported that day; distinct from a genuine zero.
      volume: volumes.length === 0 ? null : sum(volumes),
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
 * Formats an epoch-seconds timestamp as a YYYY-MM-DD calendar date using the given
 * (DST-aware) formatter, so the day boundary matches the exchange's local date
 * rather than UTC. The formatter is created once per call and reused across bars.
 */
function toExchangeDate(
  epochSeconds: number,
  formatter: Intl.DateTimeFormat,
): string {
  const parts = formatter.formatToParts(new Date(epochSeconds * 1000));

  const get = (type: 'year' | 'month' | 'day'): string =>
    parts.find((part) => part.type === type)!.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}
