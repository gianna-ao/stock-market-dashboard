import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { DailyAggregate } from './api/types';

const rows: DailyAggregate[] = [
  {
    day: '2026-11-04',
    lowAverage: 258.9163336502878,
    highAverage: 261.43788227282073,
    volume: 103_200_000,
  },
  // A day with valid prices but no reported volume renders as a dash.
  { day: '2026-11-03', lowAverage: 255, highAverage: 257, volume: null },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A promise plus its resolver, to hold a request open and observe the loading state. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function searchFor(symbol: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Stock symbol' }), symbol);
  await user.click(screen.getByRole('button', { name: 'Search' }));
}

describe('App', () => {
  it('shows the idle prompt before any search', () => {
    stubFetch(() => Promise.resolve(jsonResponse(rows)));
    render(<App />);
    expect(screen.getByText('Search for a symbol to get started.')).toBeInTheDocument();
  });

  it('shows a loading state, then renders the charts and a formatted table on success', async () => {
    const pending = deferred<Response>();
    stubFetch(() => pending.promise);
    render(<App />);

    await searchFor('AAPL');

    // While the request is in flight.
    expect(screen.getByText('Loading AAPL…')).toBeInTheDocument();

    // Resolve the request.
    pending.resolve(jsonResponse(rows));

    // Results appear: symbol heading, both chart captions, and formatted table cells.
    expect(await screen.findByRole('heading', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByText('Average high & low')).toBeInTheDocument();
    expect(screen.getByText('Total volume')).toBeInTheDocument();
    expect(screen.getByText('Nov 4')).toBeInTheDocument();
    expect(screen.getByText('258.92')).toBeInTheDocument(); // low rounded to 2dp
    expect(screen.getByText('261.44')).toBeInTheDocument(); // high rounded to 2dp
    expect(screen.getByText('103.2M')).toBeInTheDocument(); // volume compacted
    expect(screen.getByText('—')).toBeInTheDocument(); // null volume shown as a dash
  });

  it('shows an empty-state message when the symbol has no data', async () => {
    stubFetch(() => Promise.resolve(jsonResponse([])));
    render(<App />);

    await searchFor('AAPL');

    expect(
      await screen.findByText('No daily data available for AAPL.'),
    ).toBeInTheDocument();
  });

  it('shows the backend error message for an unknown symbol (404)', async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({ error: 'No data found for symbol "ZZZZ".' }, 404),
      ),
    );
    render(<App />);

    await searchFor('ZZZZ');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No data found for symbol "ZZZZ".');
  });

  it('shows a connection message when the backend is unavailable', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<App />);

    await searchFor('AAPL');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to reach the server. Please try again.');
  });
});
