import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyAggregate } from '../api/types';
import { useDailyStockData } from './useDailyStockData';

// Mock the HTTP layer, but keep the real ApiError class so the hook's
// `instanceof ApiError` branch behaves exactly as in production.
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, fetchDailyData: vi.fn() };
});

import { ApiError, fetchDailyData } from '../api/client';

const mockFetch = vi.mocked(fetchDailyData);

const rows: DailyAggregate[] = [
  { day: '2026-11-04', lowAverage: 258.91, highAverage: 261.43, volume: 103_200_000 },
];

/** A promise plus its resolver, for controlling resolution order in tests. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useDailyStockData', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useDailyStockData());
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('goes loading then success with the fetched rows', async () => {
    mockFetch.mockResolvedValue(rows);
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('AAPL'));
    expect(result.current.state).toEqual({ status: 'loading', symbol: 'AAPL' });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toEqual({ status: 'success', symbol: 'AAPL', data: rows });
  });

  it('treats an empty array as a successful (empty) result, not an error', async () => {
    mockFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('AAPL'));

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(result.current.state).toEqual({ status: 'success', symbol: 'AAPL', data: [] });
  });

  it('surfaces the ApiError message on a handled error (e.g. 404)', async () => {
    mockFetch.mockRejectedValue(new ApiError(404, 'No data found for symbol "ZZZZ".'));
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('ZZZZ'));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toEqual({
      status: 'error',
      symbol: 'ZZZZ',
      message: 'No data found for symbol "ZZZZ".',
    });
  });

  it('shows a generic message when the backend is unavailable', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('AAPL'));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toEqual({
      status: 'error',
      symbol: 'AAPL',
      message: 'Unable to reach the server. Please try again.',
    });
  });

  it('uppercases the submitted symbol', async () => {
    mockFetch.mockResolvedValue(rows);
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('aapl'));
    expect(result.current.state).toEqual({ status: 'loading', symbol: 'AAPL' });

    await waitFor(() => expect(result.current.state.status).toBe('success'));
    expect(mockFetch).toHaveBeenCalledWith('AAPL', expect.anything());
  });

  it('ignores an empty/whitespace-only submission', () => {
    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('   '));

    expect(result.current.state).toEqual({ status: 'idle' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('ignores a stale response when a newer search has superseded it', async () => {
    const first = deferred<DailyAggregate[]>();
    const second = deferred<DailyAggregate[]>();
    mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useDailyStockData());

    // Fire two searches; the second supersedes the first.
    act(() => result.current.search('AAPL'));
    act(() => result.current.search('MSFT'));

    const msftRows: DailyAggregate[] = [
      { day: '2026-11-04', lowAverage: 500, highAverage: 510, volume: 42 },
    ];

    // The newer (MSFT) request resolves first and is applied.
    await act(async () => {
      second.resolve(msftRows);
      await second.promise;
    });
    expect(result.current.state).toEqual({ status: 'success', symbol: 'MSFT', data: msftRows });

    // The stale (AAPL) request resolves later and must NOT overwrite MSFT.
    await act(async () => {
      first.resolve(rows);
      await first.promise;
    });
    expect(result.current.state).toEqual({ status: 'success', symbol: 'MSFT', data: msftRows });
  });

  it('swallows the abort rejection when a request is superseded (catch path)', async () => {
    // The first request rejects when its signal aborts, mimicking a real fetch
    // that is cancelled. This exercises the catch branch's `aborted` guard, which
    // the resolve-path test above does not reach.
    mockFetch.mockImplementationOnce(
      (_symbol, signal) =>
        new Promise<DailyAggregate[]>((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const second = deferred<DailyAggregate[]>();
    mockFetch.mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => useDailyStockData());

    act(() => result.current.search('AAPL'));
    act(() => result.current.search('MSFT')); // aborts AAPL → its fetch rejects

    // Flush the AAPL rejection microtask; the superseded error must be ignored,
    // not turned into an error state.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toEqual({ status: 'loading', symbol: 'MSFT' });

    await act(async () => {
      second.resolve(rows);
      await second.promise;
    });
    expect(result.current.state).toEqual({ status: 'success', symbol: 'MSFT', data: rows });
  });
});
