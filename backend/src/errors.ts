/**
 * Domain errors the Yahoo client raises, so the route layer can map them to
 * HTTP status codes without knowing anything about Yahoo's response format.
 */

/** The symbol is unknown/delisted (Yahoo 404 or a "Not Found" error body). */
export class InvalidSymbolError extends Error {
  readonly symbol: string;

  constructor(symbol: string) {
    super(`No data found for symbol "${symbol}" — it may be invalid or delisted.`);
    this.name = 'InvalidSymbolError';
    this.symbol = symbol;
  }
}

/** Yahoo was unreachable, errored, timed out, or returned an unusable response. */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}
