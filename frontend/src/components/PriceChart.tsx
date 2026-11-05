import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyAggregate } from '../api/types';
import { formatDay, formatPrice } from './format';

interface PriceChartProps {
  data: DailyAggregate[];
}

const tooltipStyle = {
  background: 'var(--surface-1)',
  border: '1px solid var(--chart-border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
};

/**
 * Daily average high and low as two lines on a shared price axis (same unit, so one
 * axis is correct). Volume lives in its own chart — mixing two scales on one plot is
 * the classic misleading dual-axis chart, which we deliberately avoid.
 */
export function PriceChart({ data }: PriceChartProps) {
  return (
    <figure className="chart">
      <figcaption>Average high &amp; low</figcaption>
      <div className="viz-root">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
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
              tickFormatter={formatPrice}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              width={64}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => formatDay(String(label))}
              formatter={(value) => formatPrice(Number(value))}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="highAverage"
              name="Avg high"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="lowAverage"
              name="Avg low"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
