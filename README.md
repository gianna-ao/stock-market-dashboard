# Stock Market Dashboard

A full-stack dashboard for viewing a stock's **daily aggregated intraday activity** over
the last month. Enter a symbol and the app shows, per trading day, the **average of the
15-minute interval highs and lows** and the **total traded volume**, as two charts and a
table.

- **Backend** — Node.js + TypeScript (Express). Fetches the last month of 15-minute
  intraday data from Yahoo Finance, groups it by the exchange's local calendar day, and
  returns `{ day, lowAverage, highAverage, volume }` per day.
- **Frontend** — React + TypeScript (Vite). Symbol search, a line chart (avg high/low), a
  volume bar chart, and a table, with loading / empty / error handling.

---

## Table of contents

- [Features](#features)
- [Architecture & design decisions](#architecture--design-decisions)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the app](#running-the-app)
- [Running the tests](#running-the-tests)
- [API reference](#api-reference)
- [A note on Yahoo's intraday volume](#a-note-on-yahoos-intraday-volume)
- [Assumptions & limitations](#assumptions--limitations)

---

## Features

- Search any stock symbol and view its last month of daily aggregates.
- **Average high / low** as a two-line chart (shared price axis).
- **Total volume** as a separate bar chart (different measurement, its own scale).
- A sortable-looking table of the same data, with prices formatted to two decimals and
  volume shown compactly (e.g. `103.2M`).
- Clear handling of **invalid symbols**, **upstream/API failures**, an **unavailable
  backend**, and **empty results**.

---

## Architecture & design decisions

The guiding principle on both sides is **separation of concerns**: data access, business
logic, and presentation are kept apart, which keeps each piece small and independently
testable.

### Backend

```
HTTP request
  → route (validate symbol)                 src/routes/stocks.ts
    → Yahoo client (fetch + validate + map)  src/yahoo/yahoo-client.ts
    → completeness filter (drop live bar)    src/bars/completed-bars.ts
    → aggregation (group by day, average)    src/aggregation/aggregate.ts
  → JSON response
  (errors → error-handler middleware → HTTP status)   src/routes/error-handler.ts
```

- **Yahoo client is the only code that knows Yahoo's shape.** It fetches, validates the
  JSON with [zod](https://zod.dev) (the response is untrusted third-party data), and
  normalizes it into a simple `IntradayBar[]`. `fetch` is **injected**, so tests use a
  fake with no real network calls.
- **Pure aggregation.** Grouping and averaging is a pure function with no I/O — easy to
  test exhaustively. Days are grouped by the **exchange's local date** using
  `Intl.DateTimeFormat` (DST-aware), not the server's time zone.
- **Highs, lows, and volume are handled independently.** A 15-minute interval with a
  missing high still contributes its low. Averages are taken over the values actually
  present; volume sums the values present (a missing value is *not* treated as zero).
- **The in-progress interval is excluded** before aggregating, so the current, still
  forming 15-minute bar doesn't skew the latest day. This is kept separate from the
  aggregation logic because it's a different concern.
- **Full precision on the backend; formatting on the frontend.** The API returns
  unrounded numbers; the UI decides how to display them.
- **Typed domain errors map to HTTP status codes** in one place: an invalid/unknown
  symbol → `404`, an upstream failure → `502`, anything else → `500`.
- **The app is split from the server** (`app.ts` builds the Express app with its
  dependencies injected; `server.ts` wires the real client and binds the port), so tests
  can drive the app in-process without opening a socket.

### Frontend

```
SymbolSearch ──(symbol)──▶ App
                            │ useDailyStockData(symbol)        src/hooks/
                            │   └─ fetchDailyData()            src/api/client.ts
                            ▼
              idle │ loading │ error │ empty │ success  (one discriminated-union state)
                            ▼ (on success)
          PriceChart + VolumeChart + StockTable            src/components/
```

- **API communication is isolated** in `src/api/`, the only place that knows the URL and
  response shape. Components never call `fetch`.
- **One hook owns the request lifecycle.** `useDailyStockData` exposes a single
  discriminated-union state (`idle | loading | success | error`), so the UI can't render
  an impossible combination. An empty result (`[]`) is a **success**, shown as a neutral
  "no data" message — not an error.
- **Stale-response guarding.** Each search aborts the previous request with an
  `AbortController`, and a response is applied only if it hasn't been superseded — so
  quickly searching `AAPL` then `MSFT` can never show `AAPL`'s data under `MSFT`.
- **Two separate charts, never a dual-axis chart.** Price (a line chart) and volume (a bar
  chart) are different measurements on different scales, so each gets its own chart with
  its own single axis.
- **A plain custom hook instead of a data-fetching library.** With a single
  user-triggered endpoint, a library like React Query would add a dependency without a
  real benefit here.

---

## Tech stack

| | Backend | Frontend |
|---|---|---|
| Language | TypeScript | TypeScript |
| Runtime / framework | Node.js, Express 5 | React 19, Vite |
| Validation | zod | — |
| Charts | — | Recharts |
| Tests | Vitest + Supertest | Vitest + React Testing Library + jsdom |

---

## Project structure

```
stock-market-dashboard/
├── backend/
│   └── src/
│       ├── aggregation/   # pure daily grouping + averaging
│       ├── bars/          # IntradayBar type + completed-interval filter
│       ├── yahoo/         # Yahoo client, zod schema, fixtures
│       ├── routes/        # Express router + error-handling middleware
│       ├── app.ts         # builds the Express app (deps injected)
│       └── server.ts      # wires the real client and starts the server
├── frontend/
│   └── src/
│       ├── api/           # fetch client + response types
│       ├── hooks/         # useDailyStockData (request lifecycle)
│       ├── components/    # SymbolSearch, PriceChart, VolumeChart, StockTable, format
│       └── App.tsx        # composition + state handling
├── PROMPT_LOG.md          # record of AI collaboration and decisions
└── README.md
```

---

## Prerequisites

- **Node.js ≥ 20.19** (Node 22 LTS recommended) and **npm**.
  Check with `node -v`. Vite 8 and the native TypeScript toolchain require a recent Node.
- An internet connection (the backend calls Yahoo Finance's public API; no key needed).

---

## Setup

Clone the repo, then install dependencies for each package (they are independent):

```bash
# from the repository root
cd backend  && npm install
cd ../frontend && npm install
```

No environment variables or API keys are required.

---

## Running the app

You need **two terminals** — one for each package. Start the backend first.

**Terminal 1 — backend** (http://localhost:3000):

```bash
cd backend
npm run dev
```

**Terminal 2 — frontend** (http://localhost:5173):

```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** and search for a symbol (e.g. `AAPL`).

> The Vite dev server proxies requests to `/api` through to the backend on port 3000, so
> the browser uses same-origin URLs and there is no CORS setup. **The backend must be
> running** for the dashboard to return data.

### Production build (optional)

```bash
# backend
cd backend && npm run build && npm start      # serves on :3000

# frontend
cd frontend && npm run build && npm run preview
```

---

## Running the tests

Each package has its own suite. From the respective directory:

```bash
# backend  (Vitest + Supertest)
cd backend && npm test

# frontend (Vitest + React Testing Library)
cd frontend && npm test
```

Both suites mock external calls — **no network access is needed to run the tests**. Use
`npm run test:watch` in either package for watch mode.

What the tests cover:

- **Backend** — daily aggregation (averages, per-field nulls, time-zone day boundaries,
  multiple days, empty input); the completed-interval filter; and the Yahoo client and
  route (happy path, invalid symbol → 404, upstream failure → 502, timeouts, malformed
  responses), including a structural test against a captured **real** Yahoo response.
- **Frontend** — price/volume/date formatting; the API client's error mapping;
  the hook's state transitions including the stale-response guard; and an **app-level
  integration test** that drives the UI through loading, success, empty, invalid-symbol,
  and backend-unavailable cases.

---

## API reference

The backend exposes one endpoint:

```
GET /api/stocks/:symbol/daily
```

**Success — `200 OK`** — an array of daily aggregates, oldest first:

```json
[
  { "day": "2026-11-04", "lowAverage": 258.9163, "highAverage": 261.4379, "volume": 78335338 }
]
```

| Field | Meaning |
|---|---|
| `day` | Exchange-local calendar date (`YYYY-MM-DD`) |
| `lowAverage` | Mean of the 15-minute interval **lows** that day (full precision) |
| `highAverage` | Mean of the 15-minute interval **highs** that day (full precision) |
| `volume` | **Total** traded volume across the day's 15-minute intervals, or `null` if no interval reported volume (distinct from a genuine `0`) |

**Errors** — JSON `{ "error": "<message>" }` with:

| Status | When |
|---|---|
| `400` | The symbol is malformed (fails validation) |
| `404` | The symbol is unknown / has no data |
| `502` | Yahoo Finance was unreachable or returned an unexpected/invalid response |
| `500` | Unexpected server error |

There is also a `GET /health` endpoint returning `{ "status": "ok" }`.

---

## A note on Yahoo's intraday volume

While verifying the numbers against Yahoo Finance, we found that **summing the
15-minute volume bars does not always reconcile with Yahoo's official daily volume**, and
this is a property of Yahoo's data, not of our aggregation:

- On a typical day the summed intraday volume runs **~15–25% below** the official daily
  figure, because the intraday bars don't include the opening/closing auctions and some
  off-exchange prints.
- Occasionally the intraday feed carries an **erroneous or duplicated large print** that
  makes the summed volume much *higher* than the official daily total. For example, for
  AMZN on one day our sum was ~104M vs an official ~55M; a single 15-minute bar claimed
  53M shares — more than the entire official session — and it appeared **identically at
  1-minute, 5-minute, and 15-minute resolutions**, confirming it's upstream data, not an
  aggregation bug.

**Decision:** the assessment asks for the *total volume of the 15-minute intervals*, so
that is exactly what we compute and display. We deliberately do **not** substitute Yahoo's
official daily volume (it isn't available for historical days) or try to "clean"
anomalous bars (any threshold would be arbitrary and could discard legitimate spikes). The
average high/low figures are unaffected.

---

## Assumptions & limitations

- **15-minute interval, last month.** Yahoo serves 15-minute data only within roughly the
  last 60 days, so a one-month range is safe. Prices shown are the *averages* of the
  intraday highs/lows, so they intentionally differ from Yahoo's single daily high/low.
- **Regular trading session.** The data Yahoo returns for this range is the regular
  session; no separate pre-/post-market handling is applied.
- **Dev proxy, not a configurable base URL.** The frontend calls `/api` and relies on the
  Vite dev proxy to reach the backend. A deployed build would need a configurable API base
  URL (e.g. a `VITE_API_BASE_URL` env var); this was left out as it's unnecessary for
  local review.
- See [PROMPT_LOG.md](PROMPT_LOG.md) for the full record of design decisions and the
  AI-collaborative development process.
