import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchDailyData } from '../api/client';
import type { DailyAggregate } from '../api/types';

/**
 * The request lifecycle as a discriminated union, so the UI can only render a
 * valid combination (no "loading AND error" states). An empty `data` array on a
 * `success` result is a legitimate "no data" case, not an error.
 */
export type StockDataState =
  | { status: 'idle' }
  | { status: 'loading'; symbol: string }
  | { status: 'success'; symbol: string; data: DailyAggregate[] }
  | { status: 'error'; symbol: string; message: string };

export interface UseDailyStockData {
  state: StockDataState;
  /** Triggers a lookup. Trims input and ignores empty submissions. */
  search: (symbol: string) => void;
}

/**
 * Owns the data-fetching lifecycle for a single symbol lookup.
 *
 * Guards against stale responses: each search aborts the previous request, and a
 * response is applied only if its own request has not been superseded — so quickly
 * searching AAPL then MSFT can never show AAPL's data under MSFT.
 */
export function useDailyStockData(): UseDailyStockData {
  const [state, setState] = useState<StockDataState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback((rawSymbol: string) => {
    // Tickers are uppercase by convention; normalize so the displayed symbol
    // matches what the backend queries.
    const symbol = rawSymbol.trim().toUpperCase();
    if (symbol === '') {
      return;
    }

    // Supersede any in-flight request.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: 'loading', symbol });

    fetchDailyData(symbol, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return; // superseded by a newer search or unmount
        }
        setState({ status: 'success', symbol, data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return; // the abort itself rejects the fetch; ignore it
        }
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to reach the server. Please try again.';
        setState({ status: 'error', symbol, message });
      });
  }, []);

  // Abort any in-flight request if the component unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { state, search };
}
