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
    res.status(502).json({ error: 'Could not retrieve data from the upstream provider.' });
    return;
  }
  res.status(500).json({ error: 'Internal server error.' });
};
