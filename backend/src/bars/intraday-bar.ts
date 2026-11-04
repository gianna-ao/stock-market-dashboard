/**
 * A single normalized 15-minute intraday bar.
 *
 * Only the fields the app needs are modeled here; the Yahoo client maps its
 * response into this shape. `low`, `high`, and `volume` are nullable because
 * Yahoo can return gaps (missing intervals, halts, or the live/forming bar).
 */
export interface IntradayBar {
  /** Interval start time, as UNIX epoch seconds (UTC). */
  timestamp: number;
  low: number | null;
  high: number | null;
  volume: number | null;
}
