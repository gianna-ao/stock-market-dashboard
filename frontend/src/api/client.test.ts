import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchDailyData } from './client';
import type { DailyAggregate } from './types';

const sampleRows: DailyAggregate[] = [
  { day: '2026-11-04', lowAverage: 258.91, highAverage: 261.43, volume: 103_200_000 },
];

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDailyData', () => {
  it('requests the symbol endpoint and returns the parsed rows on success', async () => {
    const fn = mockFetch(
      new Response(JSON.stringify(sampleRows), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await fetchDailyData('AAPL');

    expect(result).toEqual(sampleRows);
    expect(fn).toHaveBeenCalledWith('/api/stocks/AAPL/daily', expect.anything());
  });

  it('url-encodes symbols with reserved characters', async () => {
    const fn = mockFetch(new Response('[]', { status: 200 }));

    await fetchDailyData('^GSPC');

    expect(fn).toHaveBeenCalledWith('/api/stocks/%5EGSPC/daily', expect.anything());
  });

  it('throws an ApiError carrying the status and the backend message (404)', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: 'No data found for symbol "ZZZZ".' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const error = await fetchDailyData('ZZZZ').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe('No data found for symbol "ZZZZ".');
  });

  it('falls back to a generic message when the error body is empty (500)', async () => {
    mockFetch(new Response('', { status: 500 }));

    const error = await fetchDailyData('AAPL').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe(
      'Something went wrong while fetching stock data.',
    );
  });

  it('falls back to a generic message when the error body is not JSON (502)', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const error = await fetchDailyData('AAPL').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it('throws when a 200 response is not the expected array shape', async () => {
    mockFetch(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const error = await fetchDailyData('AAPL').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toMatch(/unexpected format/i);
  });

  it('throws when a 200 array contains a malformed row', async () => {
    const malformed = [{ day: '2026-11-04', lowAverage: 'nope', highAverage: 1, volume: 1 }];
    mockFetch(
      new Response(JSON.stringify(malformed), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(fetchDailyData('AAPL')).rejects.toBeInstanceOf(ApiError);
  });

  it('propagates a network failure (backend unavailable) as a non-ApiError', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fn);

    const error = await fetchDailyData('AAPL').catch((e: unknown) => e);

    // The client does not wrap transport errors; the hook turns them into a
    // user-facing message. What matters here is that it is NOT an ApiError.
    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
