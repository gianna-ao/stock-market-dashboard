import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import type { YahooClient } from '../yahoo/yahoo-client.js';
import type { IntradayBar } from '../bars/intraday-bar.js';
import { InvalidSymbolError, UpstreamError } from '../errors.js';

const epochUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): number => Math.floor(Date.UTC(year, month, day, hour, minute, second) / 1000);

const clientReturning = (
  bars: IntradayBar[],
  timeZone = 'America/New_York',
): YahooClient => ({
  async fetchIntraday() {
    return { bars, timeZone };
  },
});

const clientThrowing = (error: unknown): YahooClient => ({
  async fetchIntraday() {
    throw error;
  },
});

describe('GET /api/stocks/:symbol/daily', () => {
  it('returns aggregated daily data and excludes the in-progress interval', async () => {
    const bars: IntradayBar[] = [
      { timestamp: epochUtc(2026, 9, 5, 13, 30), low: 100, high: 110, volume: 1000 },
      { timestamp: epochUtc(2026, 9, 5, 13, 45), low: 102, high: 112, volume: 2000 },
      // Forming bar (ends 14:15 > now 14:05) with distorting values — must be dropped.
      { timestamp: epochUtc(2026, 9, 5, 14, 0), low: 999, high: 999, volume: 999999 },
    ];
    const now = () => epochUtc(2026, 9, 5, 14, 5);
    const app = createApp({ yahooClient: clientReturning(bars), now });

    const res = await request(app).get('/api/stocks/aapl/daily');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { day: '2026-10-05', lowAverage: 101, highAverage: 111, volume: 3000 },
    ]);
  });

  it('returns 200 with an empty array when the symbol has no data', async () => {
    const app = createApp({ yahooClient: clientReturning([]) });

    const res = await request(app).get('/api/stocks/NEWCO/daily');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('maps InvalidSymbolError to 404', async () => {
    const app = createApp({ yahooClient: clientThrowing(new InvalidSymbolError('NOPE')) });

    const res = await request(app).get('/api/stocks/NOPE/daily');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('maps UpstreamError to 502', async () => {
    const app = createApp({ yahooClient: clientThrowing(new UpstreamError('boom')) });

    const res = await request(app).get('/api/stocks/AAPL/daily');

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a malformed symbol without calling the client', async () => {
    const app = createApp({
      yahooClient: clientThrowing(new Error('client should not be called')),
    });

    const res = await request(app).get('/api/stocks/TOOLONGSYMBOL/daily');

    expect(res.status).toBe(400);
  });
});
