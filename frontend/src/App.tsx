import { PriceChart } from './components/PriceChart';
import { StockTable } from './components/StockTable';
import { SymbolSearch } from './components/SymbolSearch';
import { VolumeChart } from './components/VolumeChart';
import { useDailyStockData } from './hooks/useDailyStockData';
import './App.css';

function App() {
  const { state, search } = useDailyStockData();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Dashboard</h1>
        <p>Daily average highs, lows, and volume over the last month.</p>
        <SymbolSearch onSearch={search} disabled={state.status === 'loading'} />
      </header>

      <main className="app-main">
        {/*
          State handling is kept inline here (per our decision not to add a
          StateMessage component yet). The hook's status is a discriminated union,
          so exactly one branch renders.
        */}
        {state.status === 'idle' && (
          <p className="message">Search for a symbol to get started.</p>
        )}

        {state.status === 'loading' && (
          <p className="message">Loading {state.symbol}…</p>
        )}

        {state.status === 'error' && (
          <p className="message message-error" role="alert">
            {state.message}
          </p>
        )}

        {state.status === 'success' && state.data.length === 0 && (
          <p className="message">
            No daily data available for {state.symbol}.
          </p>
        )}

        {state.status === 'success' && state.data.length > 0 && (
          <div className="results">
            <h2 className="results-heading">{state.symbol}</h2>
            <PriceChart data={state.data} />
            <VolumeChart data={state.data} />
            <StockTable data={state.data} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
