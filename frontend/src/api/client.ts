import type { DailyAggregate } from './types';

/**
 * Error thrown when the backend responds with a non-2xx status. Carries the HTTP
 * status so the UI can word things differently (e.g. an unknown symbol vs. an
 * upstream failure), plus the message the backend provided when there was one.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Runtime shape check for a single daily aggregate (no schema dependency). */
function isDailyAggregate(value: unknown): value is DailyAggregate {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.day === 'string' &&
    typeof row.lowAverage === 'number' &&
    typeof row.highAverage === 'number' &&
    (row.volume === null || typeof row.volume === 'number')
  );
}

function isDailyAggregateArray(value: unknown): value is DailyAggregate[] {
  return Array.isArray(value) && value.every(isDailyAggregate);
}

/** Reads the backend's `{ error }` body, falling back to a generic message. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body !== null &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
  } catch {
    // Body was empty or not JSON; fall through to the generic message.
  }
  return 'Something went wrong while fetching stock data.';
}

/**
 * Fetches the daily aggregated data for a symbol from the backend.
 *
 * @param symbol  The stock symbol to look up (sent as-is; the backend validates).
 * @param signal  Optional AbortSignal so callers can cancel a superseded request.
 * @throws {ApiError} when the backend responds with a non-2xx status.
 */
export async function fetchDailyData(
  symbol: string,
  signal?: AbortSignal,
): Promise<DailyAggregate[]> {
  const response = await fetch(
    `/api/stocks/${encodeURIComponent(symbol)}/daily`,
    { signal },
  );

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  // Validate the shape at the boundary. The backend is trusted, but a misconfigured
  // proxy or a backend change could return something unexpected; a light check keeps
  // malformed data from silently flowing into the charts/table.
  const data: unknown = await response.json();
  if (!isDailyAggregateArray(data)) {
    throw new ApiError(response.status, 'The server returned data in an unexpected format.');
  }

  return data;
}
