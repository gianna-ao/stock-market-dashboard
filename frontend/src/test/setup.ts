import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom does not
// implement. A no-op stub lets the chart components mount without measuring a size
// (they render no SVG at 0×0, which is fine — our tests assert on captions and the
// table, not on chart internals).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;
