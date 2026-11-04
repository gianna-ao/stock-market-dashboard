import type { IntradayBar } from '../bars/intraday-bar.js';
import { InvalidSymbolError, UpstreamError } from '../errors.js';
import { chartResponseSchema } from './yahoo-schema.js';

const CHART_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const INTERVAL = '15m';
const RANGE = '1mo';
const DEFAULT_TIMEOUT_MS = 5000;
const USER_AGENT = 'stock-dashboard/1.0 (take-home assessment)';

/** The slice of the global `fetch` contract this client relies on (keeps fakes simple). */
export type FetchFn = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<Response>;

export interface YahooClient {
  fetchIntraday(symbol: string): Promise<{ bars: IntradayBar[]; timeZone: string }>;
}

export interface YahooClientOptions {
  /** Abort the request after this many milliseconds (default 5000). */
  timeoutMs?: number;
}

/**
 * Creates a client that fetches the last month of 15-minute intraday data for a
 * symbol from Yahoo Finance and normalizes it into `IntradayBar[]`. `fetch` is
 * injected so tests can supply a fake with no real network.
 */
export function createYahooClient(
  fetchFn: FetchFn,
  options: YahooClientOptions = {},
): YahooClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async fetchIntraday(symbol) {
      const response = await requestChart(fetchFn, symbol, timeoutMs);
      const body = await readJson(response);
      return normalize(body, symbol);
    },
  };
}

function buildUrl(symbol: string): string {
  return `${CHART_BASE_URL}/${encodeURIComponent(symbol)}?interval=${INTERVAL}&range=${RANGE}`;
}

/** Performs the HTTP request with a timeout and maps transport/status failures. */
async function requestChart(
  fetchFn: FetchFn,
  symbol: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(buildUrl(symbol), {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new UpstreamError(`Yahoo Finance request timed out after ${timeoutMs}ms`, {
        cause: error,
      });
    }
    throw new UpstreamError('Failed to reach Yahoo Finance', { cause: error });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404) {
    throw new InvalidSymbolError(symbol);
  }
  if (!response.ok) {
    throw new UpstreamError(`Yahoo Finance returned HTTP ${response.status}`);
  }
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new UpstreamError('Yahoo Finance returned a non-JSON response', { cause: error });
  }
}

/** Validates the response shape and maps it to bars + timezone (or a typed error). */
function normalize(
  body: unknown,
  symbol: string,
): { bars: IntradayBar[]; timeZone: string } {
  const parsed = chartResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new UpstreamError('Unexpected response shape from Yahoo Finance', {
      cause: parsed.error,
    });
  }

  const { chart } = parsed.data;

  // A symbol error can arrive as a 200 body as well as a 404 (handled upstream).
  if (chart.error) {
    if (chart.error.code === 'Not Found') {
      throw new InvalidSymbolError(symbol);
    }
    throw new UpstreamError(
      `Yahoo Finance error: ${chart.error.code} — ${chart.error.description}`,
    );
  }

  const result = chart.result?.[0];
  if (!result) {
    throw new UpstreamError('Yahoo Finance returned no result for the symbol');
  }

  const timeZone = result.meta.exchangeTimezoneName;
  const timestamps = result.timestamp ?? [];
  if (timestamps.length === 0) {
    // Valid symbol, but no intraday data in the window.
    return { bars: [], timeZone };
  }

  const quote = result.indicators?.quote?.[0];
  if (!quote) {
    throw new UpstreamError('Yahoo Finance result is missing quote data');
  }

  // Parallel arrays must line up; mismatched lengths mean the data is untrustworthy,
  // so we reject rather than guess which values belong to which timestamp.
  if (
    quote.low.length !== timestamps.length ||
    quote.high.length !== timestamps.length ||
    quote.volume.length !== timestamps.length
  ) {
    throw new UpstreamError('Yahoo Finance returned mismatched array lengths');
  }

  const bars: IntradayBar[] = timestamps.map((timestamp, i) => ({
    timestamp,
    low: quote.low[i],
    high: quote.high[i],
    volume: quote.volume[i],
  }));

  return { bars, timeZone };
}
