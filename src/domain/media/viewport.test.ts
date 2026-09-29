import { describe, expect, it } from 'vitest';
import {
  clampViewport,
  containSize,
  gestureZoomFactor,
  HOME,
  pan,
  pinch,
  stepZoom,
  toSurface,
  wheelPixels,
  wheelZoomFactor,
  zoomAround,
  ZOOM_MAX,
} from './viewport';

const frame = { width: 300, height: 400 };

describe('clampViewport', () => {
  it('hält die Fläche bei Zoom 1 fest', () => {
    expect(clampViewport({ zoom: 1, x: 50, y: -20 }, frame)).toEqual(HOME);
  });

  it('begrenzt Zoom und Verschiebung', () => {
    expect(clampViewport({ zoom: 99, x: 0, y: 0 }, frame).zoom).toBe(ZOOM_MAX);
    expect(clampViewport({ zoom: 0.2, x: 0, y: 0 }, frame).zoom).toBe(1);
    expect(clampViewport({ zoom: 2, x: 10, y: 10 }, frame)).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(clampViewport({ zoom: 2, x: -999, y: -999 }, frame)).toEqual({
      zoom: 2,
      x: -300,
      y: -400,
    });
  });
});

describe('zoomAround', () => {
  it('lässt den Punkt unter dem Finger stehen', () => {
    const before = toSurface(HOME, frame, 150, 100);
    const zoomed = zoomAround(HOME, 2, 150, 100, frame);
    const after = toSurface(zoomed, frame, 150, 100);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(zoomed.zoom).toBe(2);
  });

  it('zoomt nicht unter 1 heraus', () => {
    expect(zoomAround(HOME, 0.5, 10, 10, frame)).toEqual(HOME);
  });
});

describe('pan', () => {
  it('verschiebt im Rahmen des Zoomens', () => {
    const z = zoomAround(HOME, 2, 0, 0, frame);
    expect(pan(z, -100, -50, frame)).toEqual({ zoom: 2, x: -100, y: -50 });
    expect(pan(z, 100, 100, frame)).toEqual({ zoom: 2, x: 0, y: 0 });
  });
});

describe('pinch', () => {
  it('verdoppelt den Zoom bei doppeltem Fingerabstand um die Mitte', () => {
    const v = pinch(
      HOME,
      { x: 100, y: 200 },
      { x: 200, y: 200 },
      { x: 50, y: 200 },
      { x: 250, y: 200 },
      frame,
    );
    expect(v.zoom).toBe(2);
    expect(toSurface(v, frame, 150, 200).x).toBeCloseTo(0.5, 9);
  });

  it('verschiebt mit der Mitte der Finger', () => {
    const start = zoomAround(HOME, 2, 150, 200, frame);
    const moved = pinch(
      start,
      { x: 100, y: 200 },
      { x: 200, y: 200 },
      { x: 120, y: 210 },
      { x: 220, y: 210 },
      frame,
    );
    expect(moved.zoom).toBe(2);
    expect(moved.x).toBeGreaterThan(start.x);
  });

  it('behält den Zoom, wenn beide Finger zusammenfallen', () => {
    expect(
      pinch(HOME, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 80, y: 5 }, frame).zoom,
    ).toBe(1);
  });
});

describe('stepZoom', () => {
  it('zoomt in Stufen um die Mitte und wieder heraus', () => {
    const inn = stepZoom(HOME, 1, frame);
    expect(inn.zoom).toBeCloseTo(1.5, 9);
    expect(stepZoom(inn, -1, frame).zoom).toBeCloseTo(1, 9);
  });
});

describe('containSize', () => {
  it('passt ein Bild in den Rahmen', () => {
    expect(containSize({ width: 2000, height: 1000 }, frame)).toEqual({ width: 300, height: 150 });
    expect(containSize({ width: 1000, height: 2000 }, frame)).toEqual({ width: 200, height: 400 });
    expect(containSize({ width: 0, height: 0 }, frame)).toEqual({ width: 0, height: 0 });
  });
});

describe('Rad und Geste (M7)', () => {
  it('rechnet Zeilen und Seiten in Pixel um', () => {
    expect(wheelPixels(3, 0)).toBe(3);
    expect(wheelPixels(3, 1)).toBe(48);
    expect(wheelPixels(1, 2)).toBe(800);
  });

  it('Firefox-Mausrad (3 Zeilen) zoomt so stark wie Chrome (48 Pixel)', () => {
    expect(wheelZoomFactor(3, 1)).toBeCloseTo(wheelZoomFactor(48, 0));
  });

  it('Rad nach oben vergrößert, nach unten verkleinert, Ausreißer sind begrenzt', () => {
    expect(wheelZoomFactor(-10, 0)).toBeGreaterThan(1);
    expect(wheelZoomFactor(10, 0)).toBeLessThan(1);
    expect(wheelZoomFactor(0, 0)).toBe(1);
    expect(wheelZoomFactor(-5000, 0)).toBeCloseTo(Math.exp(1));
    expect(wheelZoomFactor(5000, 0)).toBeCloseTo(Math.exp(-1));
  });

  it('Safari-Geste liefert den Faktor seit dem letzten Ereignis', () => {
    expect(gestureZoomFactor(1, 1.5)).toBeCloseTo(1.5);
    expect(gestureZoomFactor(1.5, 1.2)).toBeCloseTo(0.8);
    expect(gestureZoomFactor(0, 1)).toBe(1);
    expect(gestureZoomFactor(1, Number.NaN)).toBe(1);
  });
});
