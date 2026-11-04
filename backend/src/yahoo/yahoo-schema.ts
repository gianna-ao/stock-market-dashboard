import { z } from 'zod';

/**
 * Validates only the subset of the Yahoo chart response this app depends on.
 * Unknown fields (the many extra `meta` keys, `open`/`close`, etc.) are ignored
 * by default. Parsing failure means Yahoo changed shape or sent garbage, which the
 * client turns into an UpstreamError rather than letting it crash aggregation.
 */

const quoteSchema = z.object({
  low: z.array(z.number().nullable()),
  high: z.array(z.number().nullable()),
  volume: z.array(z.number().nullable()),
});

const resultSchema = z.object({
  meta: z.object({
    exchangeTimezoneName: z.string(),
  }),
  // Absent when a valid symbol has no intraday data in the window.
  timestamp: z.array(z.number()).optional(),
  indicators: z
    .object({
      quote: z.array(quoteSchema),
    })
    .optional(),
});

export const chartResponseSchema = z.object({
  chart: z.object({
    result: z.array(resultSchema).nullable(),
    error: z
      .object({
        code: z.string(),
        description: z.string(),
      })
      .nullable(),
  }),
});
