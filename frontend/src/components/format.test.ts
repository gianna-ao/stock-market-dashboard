import { describe, expect, it } from 'vitest';
import { formatDay, formatPrice, formatVolume } from './format';

describe('formatPrice', () => {
  it('always shows exactly two decimal places', () => {
    expect(formatPrice(333.1)).toBe('333.10');
    expect(formatPrice(42)).toBe('42.00');
  });

  it('rounds to two decimals', () => {
    // Full-precision backend values get rounded here, not on the server.
    expect(formatPrice(258.9163336502878)).toBe('258.92');
    expect(formatPrice(261.43788227282073)).toBe('261.44');
  });
});

describe('formatVolume', () => {
  it('shortens large numbers compactly', () => {
    expect(formatVolume(103_200_000)).toBe('103.2M');
    expect(formatVolume(1_500)).toBe('1.5K');
  });

  it('leaves small numbers readable', () => {
    expect(formatVolume(0)).toBe('0');
    expect(formatVolume(999)).toBe('999');
  });
});

describe('formatDay', () => {
  it('renders an ISO day as a short month/day label', () => {
    expect(formatDay('2026-11-04')).toBe('Nov 4');
    expect(formatDay('2026-01-09')).toBe('Jan 9');
  });

  it('falls back to the raw string when the date cannot be parsed', () => {
    expect(formatDay('not-a-date')).toBe('not-a-date');
  });
});
