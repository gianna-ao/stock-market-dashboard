/**
 * A trimmed Yahoo Finance chart response (interval=15m), hand-built to match the
 * structure verified against the live API: `chart.result[0]` with `meta`
 * (exchangeTimezoneName), parallel `timestamp[]`, and `indicators.quote[0]` with
 * OHLCV arrays. Prices are simple round numbers for readable assertions, and one
 * `low` is `null` to exercise null passthrough. `open`/`close` are included to
 * confirm the client ignores fields it does not need.
 */
export const aaplChartResponse = {
  chart: {
    result: [
      {
        meta: {
          symbol: 'AAPL',
          exchangeTimezoneName: 'America/New_York',
          gmtoffset: -14400,
        },
        timestamp: [1696512600, 1696513500, 1696514400],
        indicators: {
          quote: [
            {
              open: [105, 106, 107],
              high: [110, 112, 108],
              low: [100, null, 104],
              close: [108, 109, 106],
              volume: [1000, 2000, 3000],
            },
          ],
        },
      },
    ],
    error: null,
  },
};
