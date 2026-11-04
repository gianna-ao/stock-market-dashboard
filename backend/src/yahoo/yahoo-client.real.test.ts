import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createYahooClient } from './yahoo-client.js';

/**
 * A small slice of a real Yahoo chart response (captured live, trimmed to 6 bars,
 * full real `meta` kept). This guards the client against Yahoo's actual structure —
 * including the many extra `meta` fields the schema is expected to ignore.
 */
const realResponseText = readFileSync(
  new URL('./__fixtures__/aapl-15m-real.json', import.meta.url),
  'utf8',
);

describe('createYahooClient with a real captured Yahoo response', () => {
  it('parses the real response structure into well-formed bars', async () => {
    const client = createYahooClient(
      async () => new Response(realResponseText, { status: 200 }),
    );

    const { bars, timeZone } = await client.fetchIntraday('AAPL');

    // Structural assertions only — not exact prices — so re-capturing stays safe.
    const expectedCount =
      JSON.parse(realResponseText).chart.result[0].timestamp.length;

    expect(timeZone).toBe('America/New_York');
    expect(bars).toHaveLength(expectedCount);

    for (const bar of bars) {
      expect(Number.isInteger(bar.timestamp)).toBe(true);
      expect(bar.low === null || typeof bar.low === 'number').toBe(true);
      expect(bar.high === null || typeof bar.high === 'number').toBe(true);
      expect(bar.volume === null || typeof bar.volume === 'number').toBe(true);
    }
  });
});
