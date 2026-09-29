import { describe, expect, it } from 'vitest';
import {
  checkMasks,
  cornerOf,
  drawMask,
  fitMask,
  MASK_MIN,
  maskAt,
  maskCountLabel,
  maskNumber,
  maskSubs,
  MAX_MASKS,
  moveMask,
  nextMaskNumber,
  ordinals,
  removeMask,
  resizeMask,
  type Mask,
} from './occlusion';

const m = (n: number, x: number, y: number, w: number, h: number): Mask => ({ n, x, y, w, h });

describe('fitMask', () => {
  it('hält das Feld im Bild und mindestens so groß wie MASK_MIN', () => {
    expect(fitMask(m(1, -0.5, 0.95, 0.4, 0.4))).toEqual(m(1, 0, 0.6, 0.4, 0.4));
    expect(fitMask(m(1, 0.5, 0.5, 0, 0))).toEqual(m(1, 0.5, 0.5, MASK_MIN, MASK_MIN));
    expect(fitMask(m(1, 0, 0, 3, 3))).toEqual(m(1, 0, 0, 1, 1));
  });

  it('rundet auf vier Stellen', () => {
    expect(fitMask(m(1, 0.123456, 0.2, 0.3, 0.3)).x).toBe(0.1235);
  });
});

describe('nextMaskNumber', () => {
  it('nimmt die größte Nummer plus eins und lässt gelöschte nicht wiederkehren', () => {
    expect(nextMaskNumber([])).toBe(1);
    expect(nextMaskNumber([m(1, 0, 0, 0.1, 0.1), m(3, 0, 0, 0.1, 0.1)])).toBe(4);
    expect(nextMaskNumber([m(1, 0, 0, 0.1, 0.1)], 5)).toBe(6);
  });
});

describe('drawMask', () => {
  it('zeichnet aus zwei Punkten in beliebiger Richtung', () => {
    expect(drawMask([], { x: 0.5, y: 0.6 }, { x: 0.2, y: 0.3 })).toEqual(m(1, 0.2, 0.3, 0.3, 0.3));
  });

  it('kappt am Bildrand', () => {
    expect(drawMask([], { x: 0.9, y: 0.9 }, { x: 1.4, y: 1.2 })).toEqual(m(1, 0.9, 0.9, 0.1, 0.1));
  });

  it('ignoriert ein Tippen oder zu kleine Rechtecke', () => {
    expect(drawMask([], { x: 0.5, y: 0.5 }, { x: 0.51, y: 0.5 })).toBeNull();
    expect(drawMask([], { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.505 })).toBeNull();
  });

  it('nimmt keine Felder über der Höchstzahl an', () => {
    const many = Array.from({ length: MAX_MASKS }, (_, i) => m(i + 1, 0, 0, 0.1, 0.1));
    expect(drawMask(many, { x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toBeNull();
  });
});

describe('moveMask und resizeMask', () => {
  const base = [m(1, 0.1, 0.1, 0.2, 0.2), m(2, 0.5, 0.5, 0.2, 0.2)];

  it('verschiebt nur das gewählte Feld und bleibt im Bild', () => {
    const moved = moveMask(base, 1, 0.3, 0.05);
    expect(moved[0]).toEqual(m(1, 0.4, 0.15, 0.2, 0.2));
    expect(moved[1]).toBe(base[1]);
    expect(moveMask(base, 2, 5, 5)[1]).toEqual(m(2, 0.8, 0.8, 0.2, 0.2));
  });

  it('zieht jede Ecke, die gegenüberliegende bleibt stehen', () => {
    expect(resizeMask(base, 1, 'se', 0.1, 0.1)[0]).toEqual(m(1, 0.1, 0.1, 0.3, 0.3));
    expect(resizeMask(base, 1, 'nw', -0.05, -0.05)[0]).toEqual(m(1, 0.05, 0.05, 0.25, 0.25));
    expect(resizeMask(base, 1, 'ne', 0.1, -0.05)[0]).toEqual(m(1, 0.1, 0.05, 0.3, 0.25));
    expect(resizeMask(base, 1, 'sw', -0.05, 0.1)[0]).toEqual(m(1, 0.05, 0.1, 0.25, 0.3));
  });

  it('lässt das Feld nicht unter MASK_MIN und nicht über den Rand wachsen', () => {
    const tiny = resizeMask(base, 1, 'se', -1, -1)[0]!;
    expect(tiny.w).toBe(MASK_MIN);
    expect(tiny.h).toBe(MASK_MIN);
    const huge = resizeMask(base, 1, 'se', 5, 5)[0]!;
    expect(huge.x + huge.w).toBeLessThanOrEqual(1);
    const flipped = resizeMask(base, 1, 'nw', 1, 1)[0]!;
    expect(flipped.x + flipped.w).toBeCloseTo(0.3, 9);
  });

  it('ändert andere Felder nicht', () => {
    expect(resizeMask(base, 1, 'se', 0.1, 0.1)[1]).toBe(base[1]);
  });
});

describe('removeMask, maskAt, cornerOf', () => {
  const masks = [m(1, 0.1, 0.1, 0.4, 0.4), m(2, 0.3, 0.3, 0.4, 0.4)];

  it('entfernt ein Feld', () => {
    expect(removeMask(masks, 1)).toEqual([masks[1]]);
    expect(removeMask(masks, 9)).toEqual(masks);
  });

  it('trifft das oberste Feld und sonst keins', () => {
    expect(maskAt(masks, 0.35, 0.35)?.n).toBe(2);
    expect(maskAt(masks, 0.15, 0.15)?.n).toBe(1);
    expect(maskAt(masks, 0.9, 0.9)).toBeNull();
    expect(maskAt([], 0.5, 0.5)).toBeNull();
  });

  it('nennt die Lage der Ecken', () => {
    const a = masks[0]!;
    expect(cornerOf(a, 'nw')).toEqual({ x: 0.1, y: 0.1 });
    expect(cornerOf(a, 'se')).toEqual({ x: 0.5, y: 0.5 });
    expect(cornerOf(a, 'ne')).toEqual({ x: 0.5, y: 0.1 });
    expect(cornerOf(a, 'sw')).toEqual({ x: 0.1, y: 0.5 });
  });
});

describe('Nummern und Beschriftung', () => {
  const masks = [m(4, 0, 0, 0.1, 0.1), m(1, 0, 0, 0.1, 0.1), m(7, 0, 0, 0.1, 0.1)];

  it('zählt Anzeigenummern lückenlos nach der stabilen Nummer', () => {
    expect([...ordinals(masks)]).toEqual([
      [1, 1],
      [4, 2],
      [7, 3],
    ]);
  });

  it('nennt die Abfragen nach Nummer', () => {
    expect(maskSubs(masks)).toEqual(['m1', 'm4', 'm7']);
    expect(maskNumber('m4')).toBe(4);
    expect(maskNumber('c4')).toBeNull();
    expect(maskNumber('')).toBeNull();
    expect(maskNumber('m100')).toBeNull();
  });

  it('beschriftet die Zahl der Felder', () => {
    expect(maskCountLabel(0)).toBe('Noch keine Felder');
    expect(maskCountLabel(1)).toBe('1 Feld');
    expect(maskCountLabel(3)).toBe('3 Felder');
  });
});

describe('checkMasks', () => {
  it('verlangt mindestens ein Feld und höchstens MAX_MASKS', () => {
    expect(checkMasks([])).toContain('mindestens ein Feld');
    expect(checkMasks([m(1, 0, 0, 0.1, 0.1)])).toBeNull();
    expect(
      checkMasks(Array.from({ length: MAX_MASKS + 1 }, (_, i) => m(i + 1, 0, 0, 0.1, 0.1))),
    ).toContain(String(MAX_MASKS));
  });
});
