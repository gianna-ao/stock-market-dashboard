import type { IntradayBar } from './intraday-bar.js';

/** Length of one intraday interval, in seconds (15 minutes). */
const INTERVAL_SECONDS = 15 * 60;

/**
 * Keeps only bars whose 15-minute interval has fully elapsed, dropping the
 * in-progress (forming) interval.
 *
 * Bar timestamps are interval *starts*, so an interval is complete once its end
 * has passed: `start + INTERVAL_SECONDS <= now`. This is timezone-safe (both
 * values are UTC epoch seconds) and robust to Yahoo's irregular live-bar
 * timestamp, which sits at ≈ now and therefore fails the check.
 *
 * @param bars normalized bars with interval-start timestamps (epoch seconds)
 * @param now  current time in epoch seconds (same clock as the timestamps)
 */
export function filterCompletedBars(
  bars: IntradayBar[],
  now: number,
): IntradayBar[] {
  return bars.filter((bar) => bar.timestamp + INTERVAL_SECONDS <= now);
}
