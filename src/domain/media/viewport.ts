/**
 * Zoomen und Verschieben (M6): Ausschnitt einer Fläche (Bild mit Feldern), Zwei-Finger-Zoom und
 * Ziehen. Alles in Bruchteilen der Fläche, Felder liegen in denselben Bruchteilen und sitzen
 * dadurch bei jeder Vergrößerung exakt (Abnahme M6).
 */

export interface Viewport {
  /** Vergrößerung, 1 = die Fläche füllt den Rahmen. */
  readonly zoom: number;
  /** Verschiebung in Pixeln des Rahmens (Wert der CSS-Transformation, Ursprung oben links). */
  readonly x: number;
  readonly y: number;
}

export const HOME: Viewport = { zoom: 1, x: 0, y: 0 };
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 6;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Hält den Ausschnitt in Grenzen: Die Fläche verlässt den Rahmen nie, bei Zoom 1 sitzt sie fest. */
export function clampViewport(v: Viewport, frame: Size): Viewport {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom));
  const minX = frame.width - frame.width * zoom;
  const minY = frame.height - frame.height * zoom;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, v.x)),
    y: Math.min(0, Math.max(minY, v.y)),
  };
}

/** Zoom um einen Punkt des Rahmens: Der Punkt bleibt unter dem Finger. */
export function zoomAround(
  v: Viewport,
  factor: number,
  px: number,
  py: number,
  frame: Size,
): Viewport {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * factor));
  const k = zoom / v.zoom;
  return clampViewport({ zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, frame);
}

/** Verschiebt um (dx, dy) Pixel des Rahmens. */
export function pan(v: Viewport, dx: number, dy: number, frame: Size): Viewport {
  return clampViewport({ ...v, x: v.x + dx, y: v.y + dy }, frame);
}

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * Zwei-Finger-Geste: von den Fingern `a0`, `b0` zu `a1`, `b1`. Der Abstand bestimmt den Zoom, die
 * Mitte verschiebt. Fallen die Finger zusammen, bleibt der Zoom.
 */
export function pinch(v: Viewport, a0: Pt, b0: Pt, a1: Pt, b1: Pt, frame: Size): Viewport {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const factor = d0 < 1 ? 1 : d1 / d0;
  const zoomed = zoomAround(v, factor, (a0.x + b0.x) / 2, (a0.y + b0.y) / 2, frame);
  return pan(
    zoomed,
    (a1.x + b1.x) / 2 - (a0.x + b0.x) / 2,
    (a1.y + b1.y) / 2 - (a0.y + b0.y) / 2,
    frame,
  );
}

/** Zoom-Stufen der Tasten „+“ und „−“ (Rasterung ohne Gleitkommarauschen). */
export function stepZoom(v: Viewport, direction: 1 | -1, frame: Size): Viewport {
  const factor = direction === 1 ? 1.5 : 1 / 1.5;
  return zoomAround(v, factor, frame.width / 2, frame.height / 2, frame);
}

/** Punkt des Rahmens (Pixel) als Bruchteil der Fläche unter dem aktuellen Ausschnitt. */
export function toSurface(v: Viewport, frame: Size, px: number, py: number): Pt {
  return {
    x: (px - v.x) / (frame.width * v.zoom),
    y: (py - v.y) / (frame.height * v.zoom),
  };
}

/** Größe, mit der ein Bild der Größe `image` in den Rahmen passt (enthalten, zentriert, Seitenverhältnis bleibt). */
export function containSize(image: Size, frame: Size): Size {
  if (image.width <= 0 || image.height <= 0) return { width: 0, height: 0 };
  const k = Math.min(frame.width / image.width, frame.height / image.height);
  return { width: image.width * k, height: image.height * k };
}
