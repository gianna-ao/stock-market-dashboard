import { useState, type FormEvent } from 'react';

interface SymbolSearchProps {
  /** Called with the submitted symbol. The parent owns the request. */
  onSearch: (symbol: string) => void;
  /** Disables submission while a request is in flight. */
  disabled?: boolean;
}

/**
 * A controlled search input. It does not fetch — it only reports the submitted
 * symbol upward, keeping it simple and reusable. Submission is explicit (Enter or
 * the button), so there is no per-keystroke fetching to debounce.
 */
export function SymbolSearch({ onSearch, disabled }: SymbolSearchProps) {
  const [value, setValue] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch(value);
  }

  return (
    <form className="symbol-search" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search a symbol, e.g. AAPL"
        aria-label="Stock symbol"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="submit" disabled={disabled || value.trim() === ''}>
        Search
      </button>
    </form>
  );
}
