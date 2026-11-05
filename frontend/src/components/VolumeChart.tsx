import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyAggregate } from '../api/types';
import { formatDay, formatVolume } from './format';

interface VolumeChartProps {
  data: DailyAggregate[];
}

const tooltipStyle = {
  background: 'var(--surface-1)',
  border: '1px solid var(--chart-border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
};

/**
 * Total daily volume as bars. A single series, so the caption names it and no legend
 * is needed. Separate from the price chart because volume is a different measurement
 * on a different scale.
 */
export function VolumeChart({ data }: VolumeChartProps) {
  return (
    <figure className="chart">
      <figcaption>Total volume</figcaption>
      <div className="viz-root">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={formatVolume}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              width={64}
            />
            <Tooltip
              cursor={{ fill: 'var(--grid)', opacity: 0.4 }}
              contentStyle={tooltipStyle}
              labelFormatter={(label) => formatDay(String(label))}
              formatter={(value) => (value == null ? '—' : formatVolume(Number(value)))}
            />
            <Bar
              dataKey="volume"
              name="Volume"
              fill="var(--series-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
