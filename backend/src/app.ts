import express, { type Express } from 'express';
import { createStocksRouter, type StocksRouterDeps } from './routes/stocks.js';
import { errorHandler } from './routes/error-handler.js';

/**
 * Builds the Express application. Dependencies (the Yahoo client, and optionally a
 * clock) are injected so tests can supply fakes, and so the app can be imported by
 * supertest without binding to a port (see server.ts for the real wiring).
 */
export function createApp(deps: StocksRouterDeps): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/stocks', createStocksRouter(deps));
  app.use(errorHandler);

  return app;
}
