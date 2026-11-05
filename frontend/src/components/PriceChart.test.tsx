import { cloneElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Force a fixed size so the chart renders real SVG under jsdom. Without this,
// ResponsiveContainer measures 0×0 and draws nothing — which is why asserting on
// the caption alone gives false confidence.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<Record<string, unknown>> }) =>
      cloneElement(children, { width: 800, height: 400 }),
  };
});

import { PriceChart } from './PriceChart';
import type { DailyAggregate } from '../api/types';

const data: DailyAggregate[] = [
  { day: '2026-11-03', lowAverage: 255, highAverage: 257, volume: 10 },
  { day: '2026-11-04', lowAverage: 258, highAverage: 261, volume: 20 },
  { day: '2026-11-05', lowAverage: 250, highAverage: 260, volume: 30 },
];

describe('PriceChart', () => {
  it('draws a line for both the high and low series, plotted from the data', () => {
    const { container } = render(<PriceChart data={data} />);

    const curves = container.querySelectorAll('.recharts-line-curve');
    expect(curves).toHaveLength(2); // one line per series

    // A non-empty path `d` means points were actually plotted from the data.
    for (const curve of curves) {
      const d = curve.getAttribute('d') ?? '';
      expect(d.length).toBeGreaterThan(0);
      expect(d).toMatch(/[0-9]/);
    }
  });

  it('renders both series names in the legend', () => {
    const { getByText } = render(<PriceChart data={data} />);
    expect(getByText('Avg high')).toBeInTheDocument();
    expect(getByText('Avg low')).toBeInTheDocument();
  });
});
