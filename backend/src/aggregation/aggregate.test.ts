import { describe, it, expect } from 'vitest';
import { aggregateDailyData } from './aggregate.js';
import type { IntradayBar } from '../bars/intraday-bar.js';

/**
 * Builds a UNIX epoch-seconds timestamp for a given UTC time on 2026-10-05.
 * (2026-10-05 is a Monday in US Eastern Daylight Time, UTC-4.)
 */
const utc = (hour: number, minute: number): number =>
  Math.floor(Date.UTC(2026, 9, 5, hour, minute, 0) / 1000);

/** Epoch seconds for an arbitrary UTC wall-clock time (month is 0-indexed). */
const epochUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number => Math.floor(Date.UTC(year, month, day, hour, minute, 0) / 1000);

describe('aggregateDailyData', () => {
  it('computes the average low, average high, and total volume for one day of 15-minute bars', () => {
    const timeZone = 'America/New_York';

    // Three consecutive 15-minute bars, all on the morning of 2026-10-05 ET.
    const bars: IntradayBar[] = [
      { timestamp: utc(13, 30), low: 100, high: 110, volume: 1000 }, // 09:30 ET
      { timestamp: utc(13, 45), low: 102, high: 112, volume: 2000 }, // 09:45 ET
      { timestamp: utc(14, 0), low: 104, high: 108, volume: 3000 }, //  10:00 ET
    ];

    const result = aggregateDailyData(bars, timeZone);

    expect(result).toEqual([
      {
        day: '2026-10-05',
        lowAverage: 102, // (100 + 102 + 104) / 3
        highAverage: 110, // (110 + 112 + 108) / 3
        volume: 6000, //    1000 + 2000 + 3000
      },
    ]);
  });

  it('averages each field over only its own valid values (per-field independence)', () => {
    const timeZone = 'America/New_York';

    // One day, four bars; low/high/volume is each missing in a *different* bar.
    // A correct implementation handles the fields independently rather than
    // discarding a whole bar whenever any single field is null.
    const bars: IntradayBar[] = [
      { timestamp: utc(13, 30), low: 100, high: 110, volume: 1000 },
      { timestamp: utc(13, 45), low: null, high: 120, volume: 2000 }, // low missing
      { timestamp: utc(14, 0), low: 110, high: null, volume: 3000 }, //  high missing
      { timestamp: utc(14, 15), low: 120, high: 130, volume: null }, //  volume missing
    ];

    const result = aggregateDailyData(bars, timeZone);

    expect(result).toEqual([
      {
        day: '2026-10-05',
        lowAverage: 110, //  (100 + 110 + 120) / 3  — null low skipped
        highAverage: 120, // (110 + 120 + 130) / 3  — null high skipped
        volume: 6000, //     1000 + 2000 + 3000     — null volume skipped
      },
    ]);
  });

  it('groups bars by the exchange-local date, not the UTC date', () => {
    const timeZone = 'America/New_York';

    // Two bars on different UTC calendar days but the SAME New York day:
    //   2026-11-04 23:30 UTC = 2026-11-04 18:30 EST
    //   2026-11-05 00:30 UTC = 2026-11-04 19:30 EST
    // (US Eastern is UTC-5 in November, after DST ends.) Grouping by UTC would
    // wrongly split these into two days; grouping by exchange-local date keeps them
    // on 2026-11-04. (These evening times sit outside regular hours, but trading-hour
    // filtering is an upstream concern — this test exercises date bucketing alone.)
    const barA = Math.floor(Date.UTC(2026, 10, 4, 23, 30, 0) / 1000);
    const barB = Math.floor(Date.UTC(2026, 10, 5, 0, 30, 0) / 1000);

    const bars: IntradayBar[] = [
      { timestamp: barA, low: 100, high: 110, volume: 1000 },
      { timestamp: barB, low: 102, high: 112, volume: 2000 },
    ];

    const result = aggregateDailyData(bars, timeZone);

    expect(result).toEqual([
      {
        day: '2026-11-04',
        lowAverage: 101, //  (100 + 102) / 2
        highAverage: 111, // (110 + 112) / 2
        volume: 3000, //     1000 + 2000
      },
    ]);
  });

  it('produces one row per day, sorted chronologically regardless of input order', () => {
    const timeZone = 'America/New_York';

    // Oct 6 bars are listed before Oct 5 to confirm the output is sorted by day.
    const bars: IntradayBar[] = [
      { timestamp: epochUtc(2026, 9, 6, 13, 30), low: 200, high: 210, volume: 5000 },
      { timestamp: epochUtc(2026, 9, 6, 13, 45), low: 204, high: 214, volume: 5000 },
      { timestamp: epochUtc(2026, 9, 5, 13, 30), low: 100, high: 110, volume: 1000 },
      { timestamp: epochUtc(2026, 9, 5, 13, 45), low: 102, high: 112, volume: 2000 },
    ];

    const result = aggregateDailyData(bars, timeZone);

    expect(result).toEqual([
      { day: '2026-10-05', lowAverage: 101, highAverage: 111, volume: 3000 },
      { day: '2026-10-06', lowAverage: 202, highAverage: 212, volume: 10000 },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(aggregateDailyData([], 'America/New_York')).toEqual([]);
  });

  it('omits a day that has no valid lows or no valid highs', () => {
    const timeZone = 'America/New_York';

    const bars: IntradayBar[] = [
      // 2026-10-05: fully valid → included.
      { timestamp: epochUtc(2026, 9, 5, 13, 30), low: 100, high: 110, volume: 1000 },
      { timestamp: epochUtc(2026, 9, 5, 13, 45), low: 102, high: 112, volume: 2000 },
      // 2026-10-06: every low is null → no low average → omitted.
      { timestamp: epochUtc(2026, 9, 6, 13, 30), low: null, high: 210, volume: 5000 },
      { timestamp: epochUtc(2026, 9, 6, 13, 45), low: null, high: 214, volume: 5000 },
      // 2026-10-07: every high is null → no high average → omitted.
      { timestamp: epochUtc(2026, 9, 7, 13, 30), low: 300, high: null, volume: 7000 },
      { timestamp: epochUtc(2026, 9, 7, 13, 45), low: 304, high: null, volume: 7000 },
    ];

    const result = aggregateDailyData(bars, timeZone);

    expect(result).toEqual([
      { day: '2026-10-05', lowAverage: 101, highAverage: 111, volume: 3000 },
    ]);
  });
});
