# Stock Market Dashboard

A full-stack app that shows a stock's daily intraday activity over the last month. Enter a
symbol and it displays, for each trading day, the average of the 15-minute interval highs
and lows and the total traded volume, as two charts and a table.

- **Backend:** Node.js, TypeScript, Express. Fetches the last month of 15-minute data from
  Yahoo Finance's public chart API, groups it by the exchange's local day, and returns
  `{ day, lowAverage, highAverage, volume }` per day.
- **Frontend:** React, TypeScript, Vite. Symbol search, an average high/low line chart, a
  volume bar chart, and a table, with loading, empty, and error states.

## Tech stack

| | Backend | Frontend |
|---|---|---|
| Language | TypeScript | TypeScript |
| Framework | Express 5 | React 19 (Vite) |
| Validation | zod | — |
| Charts | — | Recharts |
| Tests | Vitest, Supertest | Vitest, React Testing Library, jsdom |

## Prerequisites

- Node.js 20.19+ (22 LTS recommended) and npm.
- Internet access: the backend calls Yahoo Finance's public API. No API key or environment
  variables are required.

## Setup

The two packages are independent. Install each:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Running the app

Use two terminals, and start the backend first:

```bash
# terminal 1
cd backend && npm run dev     # http://localhost:3000

# terminal 2
cd frontend && npm run dev    # http://localhost:5173
```

Open http://localhost:5173 and search for a symbol such as `AAPL`. The Vite dev server
proxies `/api` to the backend on port 3000, so there is no CORS setup. The backend must be
running for data to load.

For a production build, run `npm run build` in each package. The backend then serves on
port 3000 with `npm start`; the frontend build is static output in `frontend/dist` (the
`/api` proxy is dev-only, so a deployed frontend would need the API base URL noted under
Limitations).

## Running the tests

Each package has its own suite, and both mock external calls so no network is needed:

```bash
cd backend && npm test        # aggregation, completed-bar filter, Yahoo client, route
cd frontend && npm test       # formatting, API errors, hook states, chart rendering, app flow
```

Use `npm run test:watch` in either package for watch mode.

## API reference

```
GET /api/stocks/:symbol/daily
```

Returns `200 OK` with an array of daily aggregates, oldest first:

```json
[
  { "day": "2026-11-04", "lowAverage": 258.9163, "highAverage": 261.4379, "volume": 78335338 }
]
```

| Field | Meaning |
|---|---|
| `day` | Exchange-local date (`YYYY-MM-DD`) |
| `lowAverage` | Mean of the day's 15-minute interval lows (full precision) |
| `highAverage` | Mean of the day's 15-minute interval highs (full precision) |
| `volume` | Total volume across the day's intervals, or `null` if none was reported (not the same as `0`) |

Errors return `{ "error": "<message>" }`: `400` malformed symbol, `404` unknown symbol,
`502` Yahoo unreachable or invalid response, `500` unexpected. `GET /health` returns
`{ "status": "ok" }`.

## Architecture

Both sides separate data access, logic, and presentation so each piece stays small and
testable.

- **Backend:** the route validates the symbol; the Yahoo client fetches the response,
  validates it with zod, and normalizes it to a simple bar list; a filter drops the
  in-progress interval; and a pure function groups by exchange-local day and computes the
  averages and total. Domain errors map to HTTP status codes in one middleware. `fetch` and
  the clock are injected, so the logic is tested without the network.
- **Frontend:** one API client owns the HTTP call, a `useDailyStockData` hook owns the
  request state and ignores stale responses, and presentational components render the
  charts and table. Price and volume are separate charts because they use different scales.

See [PROMPT_LOG.md](PROMPT_LOG.md) for the reasoning behind these decisions.

## A note on Yahoo's intraday volume

Summing the 15-minute volume bars does not always match Yahoo's official daily volume, and
this comes from Yahoo's data rather than our aggregation. On most days the intraday total
is somewhat lower than the daily figure, and occasionally the feed carries an unusually
large print that pushes it higher (the same values appear at the 1, 5, and 15-minute
resolutions). The assessment asks for the total of the 15-minute volumes, so that is what
we compute and display; we do not substitute the official daily figure or drop outliers.
The average high and low are unaffected.

## Assumptions & limitations

- **15-minute data, last month.** Yahoo serves 15-minute data only within about the last
  60 days, so a one-month range is safe. The displayed prices are averages of the intraday
  highs and lows, so they differ from Yahoo's single daily high/low by design.
- **Regular session only.** The backend requests regular-hours data (`includePrePost=false`),
  so pre- and post-market bars are excluded.
- **Dev proxy.** The frontend reaches the backend through the Vite dev proxy. A deployed
  build would need a configurable API base URL (for example `VITE_API_BASE_URL`), which was
  out of scope for local review.
