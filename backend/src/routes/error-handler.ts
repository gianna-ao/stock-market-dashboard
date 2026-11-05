import type { ErrorRequestHandler } from 'express';
import { InvalidSymbolError, UpstreamError } from '../errors.js';

/**
 * Maps domain errors to HTTP responses. Keeping this in one place means route
 * handlers can just `next(error)` and stay free of status-code logic.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof InvalidSymbolError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof UpstreamError) {
    // Log the real cause server-side (not exposed to the client) for diagnosis.
    console.error('[upstream]', err.message, err.cause ?? '');
    res.status(502).json({ error: 'Could not retrieve data from the upstream provider.' });
    return;
  }
  // Anything reaching here is unexpected — log the whole error so it is traceable.
  console.error('[unexpected]', err);
  res.status(500).json({ error: 'Internal server error.' });
};
