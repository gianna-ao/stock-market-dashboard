import { describe, it, expect } from 'vitest';
import { createYahooClient, type FetchFn } from './yahoo-client.js';
import { InvalidSymbolError, UpstreamError } from '../errors.js';
import { aaplChartResponse } from './__fixtures__/aapl-chart.js';

/** Builds a JSON Response like the global fetch would produce. */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** A fetch fake that always resolves with the given JSON body + status. */
const fetchReturning =
  (body: unknown, status = 200): FetchFn =>
  async () =>
    jsonResponse(body, status);

describe('createYahooClient.fetchIntraday', () => {
  describe('successful responses', () => {
    it('normalizes bars and extracts the exchange timezone', async () => {
      const client = createYahooClient(fetchReturning(aaplChartResponse));

      const { bars, timeZone } = await client.fetchIntraday('AAPL');

      expect(timeZone).toBe('America/New_York');
      expect(bars).toEqual([
        { timestamp: 1696512600, low: 100, high: 110, volume: 1000 },
        { timestamp: 1696513500, low: null, high: 112, volume: 2000 }, // null low preserved
        { timestamp: 1696514400, low: 104, high: 108, volume: 3000 },
      ]);
    });

    it('requests regular-session 15-minute data for the last month', async () => {
      let requestedUrl = '';
      const client = createYahooClient(async (url) => {
        requestedUrl = url;
        return jsonResponse(aaplChartResponse);
      });

      await client.fetchIntraday('AAPL');

      expect(requestedUrl).toContain('/AAPL?');
      expect(requestedUrl).toContain('interval=15m');
      expect(requestedUrl).toContain('range=1mo');
      expect(requestedUrl).toContain('includePrePost=false');
    });

    it('returns an empty bar list when the symbol has no intraday data', async () => {
      const body = {
        chart: {
          result: [{ meta: { exchangeTimezoneName: 'America/New_York' } }],
          error: null,
        },
      };
      const client = createYahooClient(fetchReturning(body));

      const { bars, timeZone } = await client.fetchIntraday('NEWCO');

      expect(bars).toEqual([]);
      expect(timeZone).toBe('America/New_York');
    });
  });

  describe('error handling', () => {
    it('throws InvalidSymbolError on a 404 response', async () => {
      const body = {
        chart: {
          result: null,
          error: { code: 'Not Found', description: 'No data found, symbol may be delisted' },
        },
      };
      const client = createYahooClient(fetchReturning(body, 404));

      await expect(client.fetchIntraday('NOPE')).rejects.toBeInstanceOf(InvalidSymbolError);
    });

    it('throws InvalidSymbolError when a 200 body carries a Not Found error', async () => {
      const body = {
        chart: { result: null, error: { code: 'Not Found', description: 'No data found' } },
      };
      const client = createYahooClient(fetchReturning(body, 200));

      await expect(client.fetchIntraday('NOPE')).rejects.toBeInstanceOf(InvalidSymbolError);
    });

    it('throws UpstreamError on a non-OK (5xx) response', async () => {
      const client = createYahooClient(fetchReturning({}, 500));

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the network request fails', async () => {
      const failingFetch: FetchFn = async () => {
        throw new Error('ECONNREFUSED');
      };
      const client = createYahooClient(failingFetch);

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the request times out', async () => {
      // Never resolves; only settles when the client aborts via its timeout.
      const hangingFetch: FetchFn = (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      const client = createYahooClient(hangingFetch, { timeoutMs: 20 });

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when the response shape is malformed', async () => {
      const body = { chart: { result: [{ meta: {} }], error: null } }; // missing exchangeTimezoneName
      const client = createYahooClient(fetchReturning(body));

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when timestamps are present but quote data is missing', async () => {
      const body = {
        chart: {
          result: [
            { meta: { exchangeTimezoneName: 'America/New_York' }, timestamp: [1, 2, 3] },
          ],
          error: null,
        },
      };
      const client = createYahooClient(fetchReturning(body));

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });

    it('throws UpstreamError when timestamp and quote array lengths mismatch', async () => {
      const body = {
        chart: {
          result: [
            {
              meta: { exchangeTimezoneName: 'America/New_York' },
              timestamp: [1, 2, 3],
              indicators: { quote: [{ low: [1, 2], high: [1, 2, 3], volume: [1, 2, 3] }] },
            },
          ],
          error: null,
        },
      };
      const client = createYahooClient(fetchReturning(body));

      await expect(client.fetchIntraday('AAPL')).rejects.toBeInstanceOf(UpstreamError);
    });
  });
});
