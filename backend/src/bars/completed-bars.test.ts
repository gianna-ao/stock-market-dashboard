import { describe, it, expect } from 'vitest';
import { filterCompletedBars } from './completed-bars.js';
import type { IntradayBar } from './intraday-bar.js';

/** Epoch seconds for a UTC wall-clock time (month is 0-indexed). */
const epochUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number => Math.floor(Date.UTC(year, month, day, hour, minute, second) / 1000);

/** A bar with placeholder prices; only the timestamp matters to this filter. */
const bar = (timestamp: number): IntradayBar => ({
  timestamp,
  low: 1,
  high: 2,
  volume: 3,
});

describe('filterCompletedBars', () => {
  it('keeps completed 15-minute intervals and drops the in-progress one', () => {
    const now = epochUtc(2026, 9, 5, 14, 20); // 2026-10-05 14:20:00 UTC

    const bars: IntradayBar[] = [
      bar(epochUtc(2026, 9, 5, 13, 30)), //      ends 13:45 ≤ now → keep
      bar(epochUtc(2026, 9, 5, 13, 45)), //      ends 14:00 ≤ now → keep
      bar(epochUtc(2026, 9, 5, 14, 0)), //       ends 14:15 ≤ now → keep
      bar(epochUtc(2026, 9, 5, 14, 15)), //      ends 14:30 > now → drop (forming)
      bar(epochUtc(2026, 9, 5, 14, 19, 43)), //  irregular live bar ≈ now → drop
    ];

    const result = filterCompletedBars(bars, now);

    expect(result.map((b) => b.timestamp)).toEqual([
      epochUtc(2026, 9, 5, 13, 30),
      epochUtc(2026, 9, 5, 13, 45),
      epochUtc(2026, 9, 5, 14, 0),
    ]);
  });

  it('treats an interval as complete exactly when its end time has passed (boundary)', () => {
    const now = epochUtc(2026, 9, 5, 14, 15); // 14:15:00 UTC

    const endsExactlyNow = epochUtc(2026, 9, 5, 14, 0); //       ends 14:15:00 == now → keep
    const endsOneSecondLater = epochUtc(2026, 9, 5, 14, 0, 1); // ends 14:15:01 > now → drop

    const result = filterCompletedBars(
      [bar(endsExactlyNow), bar(endsOneSecondLater)],
      now,
    );

    expect(result.map((b) => b.timestamp)).toEqual([endsExactlyNow]);
  });
});
