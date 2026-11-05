/**
 * One day of aggregated intraday data, as returned by the backend
 * `GET /api/stocks/:symbol/daily` endpoint.
 *
 * Mirrors the backend's DailyAggregate. Prices are kept at full precision here
 * (the backend does not round); the UI formats them for display.
 */
export interface DailyAggregate {
  /** Exchange-local calendar date, e.g. "2026-11-04". */
  day: string;
  /** Mean of the 15-minute interval lows for the day. */
  lowAverage: number;
  /** Mean of the 15-minute interval highs for the day. */
  highAverage: number;
  /** Total traded volume for the day; null when no interval reported volume. */
  volume: number | null;
}
