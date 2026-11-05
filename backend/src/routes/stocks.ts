import { Router } from 'express';
import { z } from 'zod';
import type { YahooClient } from '../yahoo/yahoo-client.js';
import { filterCompletedBars } from '../bars/completed-bars.js';
import { aggregateDailyData } from '../aggregation/aggregate.js';

/**
 * Route-level symbol validation (per the agreed separation of concerns). Accepts the
 * characters real Yahoo tickers use — letters, digits, and `.` `-` `^` `=`
 * (e.g. BRK-B, ^GSPC, EURUSD=X) — and bounds the length. The cap is 20 rather than 10
 * so exchange-suffixed symbols (e.g. RELIANCE.NS) aren't wrongly rejected as malformed,
 * while still rejecting obviously bogus input. Yahoo remains the source of truth for
 * whether a well-formed symbol actually exists.
 */
const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9.^=-]+$/);

export interface StocksRouterDeps {
  yahooClient: YahooClient;
  /** Current time in epoch seconds; injectable for tests (defaults to the clock). */
  now?: () => number;
}

export function createStocksRouter(deps: StocksRouterDeps): Router {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const router = Router();

  router.get('/:symbol/daily', async (req, res, next) => {
    const parsed = symbolSchema.safeParse(req.params.symbol);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid stock symbol.' });
      return;
    }
    const symbol = parsed.data.toUpperCase();

    try {
      const { bars, timeZone } = await deps.yahooClient.fetchIntraday(symbol);
      const completed = filterCompletedBars(bars, now());
      const daily = aggregateDailyData(completed, timeZone);
      res.json(daily);
    } catch (error) {
      // Domain errors are translated to status codes by the error-handling middleware.
      next(error);
    }
  });

  return router;
}
