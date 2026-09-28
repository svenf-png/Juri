import { describe, expect, it } from 'vitest';
import { formatBytes } from './bytes';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1000, '1,0 KB'],
    [2_400_000, '2,4 MB'],
    [52_428_800, '52,4 MB'],
    [150_000_000, '150 MB'],
    [64_000_000_000, '64,0 GB'],
  ])('%d → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it('meldet ungültige Werte mit Fragezeichen', () => {
    expect(formatBytes(-1)).toBe('?');
    expect(formatBytes(Number.NaN)).toBe('?');
  });
});
