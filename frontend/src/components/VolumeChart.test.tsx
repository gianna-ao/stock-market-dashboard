import { cloneElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Force a fixed size so the chart renders real SVG under jsdom (see PriceChart.test).
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<Record<string, unknown>> }) =>
      cloneElement(children, { width: 800, height: 400 }),
  };
});

import { VolumeChart } from './VolumeChart';
import type { DailyAggregate } from '../api/types';

describe('VolumeChart', () => {
  it('draws one bar for each day that has volume', () => {
    const data: DailyAggregate[] = [
      { day: '2026-11-03', lowAverage: 255, highAverage: 257, volume: 10 },
      { day: '2026-11-04', lowAverage: 258, highAverage: 261, volume: 20 },
      { day: '2026-11-05', lowAverage: 250, highAverage: 260, volume: 30 },
    ];

    const { container } = render(<VolumeChart data={data} />);

    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3);
  });

  it('omits the bar for a day whose volume is null', () => {
    const data: DailyAggregate[] = [
      { day: '2026-11-03', lowAverage: 255, highAverage: 257, volume: 10 },
      { day: '2026-11-04', lowAverage: 258, highAverage: 261, volume: null },
      { day: '2026-11-05', lowAverage: 250, highAverage: 260, volume: 30 },
    ];

    const { container } = render(<VolumeChart data={data} />);

    // Two days have volume; the null-volume day produces no bar.
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
  });
});
