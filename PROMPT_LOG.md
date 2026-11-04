# PROMPT_LOG.md

Documents the AI collaboration for this stock-market-dashboard assessment.

**Format (used for every entry going forward):**
- **Prompt** — the exact prompt I sent, verbatim.
- **Purpose** — why I sent it.
- **AI response** — a brief summary (no repeated deep-dive explanations or test logs).
- **Decisions & reasoning** — what I kept, changed, or rejected, and why.

AI recommendations are kept separate from my decisions. Entries are chronological,
one per meaningful prompt. Trivial exchanges are omitted.

---

## Manual changes (outside AI assistance)

Changes made directly by me, not via an AI prompt.

- 2026-11-04 — Manual edits to this `PROMPT_LOG.md` (notes/placeholder; now tidied).
- No manual application-code changes to date. _(Add future manual edits here.)_

---

## Entry 0 — Preliminary: requirements summary & prompt drafting

**Prompt:** ⚠️ _Exact wording not recorded — **please fill in.**_ (A preliminary prompt
used to summarize the assignment's requirements and draft the Entry 1 prompt below.)

**Purpose:** Turn the raw assignment into a structured prompt for the planning step.

**AI response:** Not captured.

**Decisions & reasoning:** None — groundwork for Entry 1.

---

## Entry 1 — Requirements review & technical approach

**Prompt:**
> I'm starting work on a take-home assessment on a stock market dashboard using
> AI-Collaborative Development. Before implementing anything, I'd like to evaluate
> the requirements and establish a sensible technical approach.
>
> The assignment is to build a full-stack stock dashboard with the following
> requirements:
>
> - A backend using Node.js/TypeScript or C#/.NET 8+.
> - Retrieve the last month of 15-minute intraday stock data using Yahoo Finance's
>   public chart API.
> - Group the data by day and calculate the average low, average high, and total
>   volume.
> - Return the results in the format { day, lowAverage, highAverage, volume }.
> - A frontend using React, Angular, or Vue, with stock symbol search and a chart
>   and/or table.
> - Basic handling of invalid symbols and request errors.
>
> I'd like you to review the assignment and help me make informed technical
> decisions before we start coding.
>
> Specifically:
> 1. Break down the requirements and identify any ambiguities or potential challenges.
> 2. Compare the backend and frontend technology options. Recommend a practical
>    stack for this project and explain the reasoning and tradeoffs.
> 3. Explain which additional frameworks or libraries would be useful for API
>    development, data visualization, and testing, and which are actually necessary.
> 4. Identify technical risks with Yahoo Finance data, particularly historical
>    15-minute data availability, timezones, missing values, and daily aggregation.
> 5. Propose a simple, maintainable architecture and explain the responsibilities
>    of its main components.
> 6. Recommend a testing strategy, including where Test-Driven Development would
>    provide the most value.
> 7. Outline a realistic implementation plan that fits the assessment timeframe.
>
> The final submission should also include a README with setup and run instructions,
> automated tests, and a PROMPT_LOG.md documenting AI collaboration, including
> prompts, recommendations, decisions, and reasoning.
>
> Please prioritize practical choices over adding technologies or complexity for the
> sake of it. Explain the reasoning behind your recommendations and distinguish
> verified facts from assumptions that need further investigation.
>
> Don't create or modify any application source files or write implementation code
> yet. You may create or update PROMPT_LOG.md to document this interaction, including
> the exact prompt, its objective, and a summary of your recommendations. Leave my
> decisions pending until we've discussed them.

**Purpose:** Evaluate the assignment and set the technical direction (stack,
libraries, architecture, testing, risks, plan) before writing code.

**AI response:** Flagged ambiguities (averages = mean of per-bar lows/highs; group by
exchange-local date; regular hours; null/partial-day/rounding to decide). Recommended
Node/TS + Express and React/TS + Vite; a minimal library set; a layered architecture
(route → Yahoo client → pure aggregation); TDD focused on aggregation. Probed the live
Yahoo API and **verified**: `interval=15m&range=1mo` → 200 (~599 bars); 15m data limited
to the last ~60 days (so 1mo is safe); timestamps are UTC epoch seconds; `meta`
carries `exchangeTimezoneName`; nulls occur; invalid symbol → 404; a `User-Agent`
header suffices.

**Decisions & reasoning:**
- **Backend = Node.js + TypeScript; framework = Express** — thin fetch-and-transform
  service, shared language with the frontend.
- **Frontend = React + TypeScript + Vite** — fastest path for a single-view app.
- Library and aggregation-semantics choices deferred to Entries 2–3.

---

## Entry 2 — Library selection

**Prompt:**
> I'd prefer Node.js/Typescript with Express for the backend and then
> React/Typescript with Vite for the frontend.
>
> I'm unfamiliar with the other libraries and want to make sure we're not adding
> unnecessary dependencies. You mentioned a few I'm not super familiar with such as
> Zod, Supertest, and Recharts. Can you explain which ones are worth including for
> this project vs what would be easier to build in or a simpler alternative? I want
> to make sure the project is lightweight but still well tested and handling errors
> well.
>
> Please keep PROMPT_LOG.md updated with the recommendations and decisions as we go.
> No implementation yet.

**Purpose:** Settle a minimal dependency set — keep only what addresses a real runtime
risk or is standard dev-only tooling.

**AI response:** Judged each library by whether it addresses a runtime risk. Recommended
zod (validate untrusted Yahoo JSON), Vitest (one runner), supertest (endpoint tests),
RTL (UI tests), Recharts (chart). Advised dropping nock/MSW in favor of dependency
injection + a fixture, and skipping axios/react-query/state libs/UI kits.

**Decisions & reasoning:**
- **Include zod** — it's an external API, so boundary validation is worth one dependency.
- **Include Recharts** — chart shown alongside a table.
- **Include supertest** — helpful for endpoint tests.
- **Vitest with mocked responses / dependency injection**; **drop nock/MSW**.
- **Deprioritize React Testing Library + jsdom** — frontend testing is a later priority.
- **No axios / react-query / state libraries / UI kits.**

---

## Entry 3 — Aggregation semantics (nulls, incomplete day, rounding)

**Prompt:**
> Now I'd like to focus on the logic before we start implementing it. We should
> average the 15 minute lows and highs and sum the daily volume and then group by
> the exchange's local date. We should keep regular trading hours and use the
> YYYY-MM-DD for dates.
>
> Other things:
> - What's the best way to handle null or missing values without messing up
>   calculations?
> - Should we include the current day's incomplete data, and is there a reliable way
>   to identify an unfinished 15 minute interval?
> - Should we round the averages in the backend or only when displaying them?
>
> Please update PROMPT_LOG.md with these decisions and the reasoning. No code changes
> yet.

**Purpose:** Pin down exact aggregation rules and three edge-case policies before
building the core logic test-first.

**AI response:** Recommended skipping invalid values (never substituting 0 or carrying
forward) with count-based denominators; including today but only completed intervals,
detected via `barStart + 900s ≤ now`; and rounding in the backend. Confirmed null-only
detection is unreliable for the live bar (it carries partial values).

**Decisions & reasoning:**
- **Core semantics:** mean of per-bar lows and highs; sum of volume; group by
  exchange-local date (America/New_York); regular trading hours only; `day` as
  `YYYY-MM-DD`.
- **Nulls — per-field independence (changed from AI's drop-whole-bar):** average each
  field over its own valid values so one missing field doesn't waste the others; sum
  volume over available values (missing ≠ 0); omit a day only if it has no valid lows
  or no valid highs.
- **Current day — accepted:** include completed intervals, exclude the unfinished one.
- **Rounding — changed from AI's backend rounding:** keep full precision in the
  backend, format to 2 decimals in the frontend, to avoid losing precision in the API.
- **No-data case — accepted:** valid symbol with no usable data → `[]` + HTTP 200
  (distinct from the invalid-symbol 404).

---

## Entry 4 — Finalize edge cases & begin implementation

**Prompt:**
> After a few adjustments we should be able to move forward.
>
> I'd prefer calculating the low and high averages independently using the valid
> values for each. I don't think we should discard an otherwise usable high just
> because the low is missing. For volume, let's sum the available values without
> treating missing data as actual zero volume. If a day doesn't have enough valid
> data to calculate the required averages we can omit it
>
> For current day, agreed with including completed intervals and excluding unfinished
> ones. I just want to make sure the timestamp based approach is reliable, especially
> given the irregular timestamp you observed in Yahoo's live response. If identifying
> incomplete bars becomes unnecessarily complicated then let's discuss a simpler
> alternative.
>
> I'd rather keep the full precision in the backend and format prices to two decimal
> places in the frontend. That way we're not losing precision in the API response.
>
> The rest of the approach is fine. Let's finalize these decisions and start
> implementation incrementally, beginning with project setup and then TDD for the
> aggregation function. I'd like to review the tests and implementation at each step
> rather than generating everything at once.

**Purpose:** Confirm the edge-case policies (and that in-progress-bar detection is
reliable), then start building incrementally with review at each step.

**AI response:** Confirmed the `timestamp + 900s ≤ now` rule is a one-liner and is
robust to Yahoo's irregular live timestamp (that value ≈ now, so it fails the check);
simpler fallbacks exist but aren't needed.

**Decisions & reasoning:**
- Per-field nulls, full backend precision, include-completed-intervals, and the
  no-data case: **finalized** (as in Entry 3).
- **Keep the `timestamp + 900s ≤ now` completeness rule.**
- **Implementation order:** project setup → TDD the aggregation function, reviewing
  tests and implementation at each step.

---

## Entry 5 — Backend project setup

**Prompt:**
> Yes begin backend implementation. Just setup the project structure, configuration,
> and dependencies. Once everything is installed, verify that the TypeScript build
> works. After setup, show me what was created and briefly explain the main
> configuration files before moving on to the aggregation tests.

**Purpose:** Stand up the backend package (structure, config, dependencies) and
verify the build before any logic.

**AI response:** Scaffolded `backend/` (ESM `package.json`, strict NodeNext
`tsconfig.json`, `vitest.config.ts`, `app.ts`/`server.ts` split so supertest can
import the app). Installed Express 5, zod 4, and dev tooling (TypeScript 7, Vitest 4,
tsx, supertest) on Node 25. Added `tsconfig.build.json` to keep test files out of the
build. Build and empty test run verified.

**Decisions & reasoning:** Accepted the proposed layout, dependency set, and
`app.ts`/`server.ts` split as presented.

---

## Entry 6 — First aggregation test (red)

**Prompt:**
> Setup looks good. Next write a basic test that verifies the daily average low,
> average high, and total volume across multiple 15-minute intervals. I'd like to
> review the test and understand the expected results before implementing the
> aggregation logic. Please run it to confirm it fails for the expected reason, and
> explain what the test is checking. Do not write the actual aggregation function
> until we've reviewed the test.

**Purpose:** Drive the aggregation design test-first and review the expected results
before any implementation.

**AI response:** Wrote a failing test for `aggregateDailyData(bars, timeZone)` (one
day, three bars → mean lows/highs, summed volume) against a throwing stub; confirmed it
failed for the right reason and explained the chosen signature and types.

**Decisions & reasoning:** Reviewed and approved the test and the
`(bars: IntradayBar[], timeZone: string)` signature.

---

## Entry 7 — Implement the aggregation function (green)

**Prompt:**
> implement the aggregation function to make this first test pass. Keep the
> implementation simple, run the test, and explain the approach then we can edge cases
> to the tests.

**Purpose:** Make the first test pass with a simple implementation.

**AI response:** Implemented `aggregateDailyData`: group bars by exchange-local date
(`Intl.DateTimeFormat`, DST-aware), filter each field independently, skip days with no
valid lows/highs, full-precision mean/sum, sorted output. Test green.

**Decisions & reasoning:** Accepted the implementation (simple, matches the agreed
semantics).

---

## Entry 8 — Null-handling test & separation decision

**Prompt:**
> Do the null handling next. I think testing the null handling makes sense since we
> specifically decided not to discard an entire interval when only one value is
> missing. Again, write the test first and see if it passes with our current
> implementation before making any changes and once that passes we can do the other
> edge cases.
>
> Also, I think we should keep the unfinished interval filtering separate from the
> aggregation function since they're handling different things.

**Purpose:** Lock in per-field null handling with a test, and settle where
unfinished-interval filtering belongs.

**AI response:** Added a per-field-independence test (each field missing in a different
bar); it passed with no code change, confirming the existing behavior.

**Decisions & reasoning:**
- **Keep unfinished-interval filtering separate** from aggregation (different
  responsibilities); aggregation signature stays `(bars, timeZone)`.
- Per-field null behavior confirmed correct as-is.

---

## Entry 9 — Timezone boundary & remaining edge cases

**Prompt:**
> Do the timezone boundary next. Lets make sure we're grouping data based on the
> exchange's local date. After that, we can cover the remaining cases for multiple
> days, empty input, and days with missing values together.
>
> Keep following TDD where it makes sense. If the tests already pass with the current
> implementation, there's no need to change anything unnecessarily.

**Purpose:** Prove grouping uses the exchange-local date (not UTC), then cover the
remaining aggregation edge cases.

**AI response:** Added a timezone-boundary test (two bars on different UTC days but the
same New York day → one row) plus multiple-days, empty-input, and day-omission tests.
All passed with no code change.

**Decisions & reasoning:** Accepted; confirmed the exchange-local grouping is correct.

---

## Entry 10 — Completed-bars filter

**Prompt:**
> Agreed do the filter completed bar next

**Purpose:** Build the separate completeness filter agreed in Entry 8.

**AI response:** Extracted the shared `IntradayBar` type into `src/bars/`; TDD'd
`filterCompletedBars(bars, now)` (keep a bar iff `timestamp + 900 ≤ now`) with a
realistic-mix test and a boundary test. Red → green.

**Decisions & reasoning:** Accepted the pure, standalone filter; the route will apply
it before aggregation.

---

## Entry 11 — Suite/build review & Yahoo client design

**Prompt:**
> Ok now run the full test suite and build then walk me through the proposed
> implementation and any edge cases worth considering before we move on to the Yahoo
> API.

**Purpose:** Checkpoint (full suite + build) and review the Yahoo client design and
its edge cases before building it.

**AI response:** Ran the suite/build (green) and proposed the Yahoo client: a separate
module that fetches, validates with zod, normalizes to `IntradayBar[]` + timezone, and
maps failures to `InvalidSymbolError` / `UpstreamError`. Raised three open questions:
request timeout, where to validate the symbol, and how to treat array-length mismatch.

**Decisions & reasoning:** Approved the separate-module structure; the three questions
were answered in Entry 12.

---

## Entry 12 — Yahoo client implementation

**Prompt:**
> The proposed structure looks good to me, especially keeping the Yahoo API
> integration separate from the aggregation logic.
>
> For the three questions:
> Yes lets include a request timeout. I think around 5 seconds is reasonable so
> requests don't hang.
>
> I agree with validating the stock symbol at the route level and keeping the Yahoo
> client focused on fetching and processing the response.
>
> For mismatched array lengths, I'd rather treat that as a malformed response instead
> of filling in missing entries. I don't want us silently returning inaccurate data.
> We can still handle null values within correctly structured arrays like we discussed.
>
> Go ahead with the Yahoo API integration using TDD again starting with the initial
> details then working through error cases. Keep the implementation focused and let me
> know if anything unexpected comes up.
>
> Once it's done you can. run the tests and build then walk me through how the client
> handles the response and errors.

**Purpose:** Build the Yahoo client test-first (happy path then error cases) with the
three open questions resolved.

**AI response:** Implemented `createYahooClient(fetchFn, { timeoutMs })` with injected
`fetch`, zod validation, normalization, and typed error mapping (404/Not-Found →
`InvalidSymbolError`; non-OK/network/timeout/bad-JSON/schema-fail/length-mismatch →
`UpstreamError`; no-data → `[]`). Written test-first against a stub (red → green).

**Decisions & reasoning:**
- **Request timeout: yes, ~5s** (via `AbortController`).
- **Validate the symbol at the route level**, keep the client focused on fetching.
- **Mismatched array lengths → treat as malformed** (`UpstreamError`), do not fill in
  missing entries; nulls within well-formed arrays still handled.

---

## Entry 13 — Real-response fixture & the API route

**Prompt:**
> We originally planned to use a real Yahoo response as a test fixture, but ended up
> creating one manually. Could we include a small fixture based on an actual response
> as well? I think that would help verify we're handling Yahoo's real data structure
> correctly.
>
> Otherwise, let's move onto the API route. I'd like to keep the same approach with
> TDD. Once it's finsihed, run the full test suite and build, then walk me through how
> everything connects from the API request to the final aggregated response.

**Purpose:** Add a real-response fixture to confirm we parse Yahoo's actual structure,
then build the API route test-first.

**AI response:** Captured a live AAPL 15m response, trimmed to 6 bars (real `meta`
kept), and added a structural test (`yahoo-client.real.test.ts`). Then TDD'd the route:
refactored `createApp` to inject the Yahoo client; added `GET /api/stocks/:symbol/daily`
— zod symbol validation (bad → 400), `fetchIntraday` → `filterCompletedBars(now)` →
`aggregateDailyData`, with an error middleware mapping `InvalidSymbolError` → 404 and
`UpstreamError` → 502. Full suite (23) + build green; live smoke test returned 23 rows
for AAPL, 404 for an unknown symbol, 400 for a malformed one.

**Decisions & reasoning:**
- **Add a small real-response fixture** alongside the hand-built one — accepted.
- Route structure, route-level zod validation, and error mapping — accepted as built.

---

## Current status

- **Done (backend):** aggregation, completeness filter, Yahoo client, and the
  `GET /api/stocks/:symbol/daily` route (validation + error mapping). 23 tests green;
  build clean; verified end-to-end against live Yahoo.
- **Next:** the React/Vite frontend (search + chart + table, 2dp formatting); then the
  README.
