import type { DailyAggregate } from '../api/types';
import { formatDay, formatPrice, formatVolume } from './format';

interface StockTableProps {
  data: DailyAggregate[];
}

/** Tabular view of the same daily aggregates shown in the charts. */
export function StockTable({ data }: StockTableProps) {
  return (
    <table className="stock-table">
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Avg high</th>
          <th scope="col">Avg low</th>
          <th scope="col">Volume</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.day}>
            <td>{formatDay(row.day)}</td>
            <td>{formatPrice(row.highAverage)}</td>
            <td>{formatPrice(row.lowAverage)}</td>
            <td>{row.volume === null ? '—' : formatVolume(row.volume)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
