import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('fitWithin', () => {
  it('lässt kleine Bilder unverändert', () => {
    expect(fitWithin(1200, 800, 2000)).toEqual({ width: 1200, height: 800 });
  });

  it('verkleinert auf die längste Kante', () => {
    expect(fitWithin(4032, 3024, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032, 2000)).toEqual({ width: 1500, height: 2000 });
  });
});
