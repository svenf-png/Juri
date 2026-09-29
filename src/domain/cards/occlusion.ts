/**
 * Abdeckung (M6, ADR-010): Felder auf einem Bild. Ein Feld ist ein Rechteck in Bruchteilen des
 * Bildes (0 bis 1), damit es bei jeder Anzeigegröße und jedem Zoom exakt sitzt. Jedes Feld ist
 * eine Abfrage (A7); die Nummer `n` ist stabil und wird nie neu vergeben (wie bei Lücken).
 * Reine Funktionen für den Editor und die Lernansicht.
 */

export interface Mask {
  /** Stabile Nummer, 1 bis 99; Kennung der Abfrage ist `m<n>`. */
  readonly n: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type MaskInput = Pick<Mask, 'n' | 'x' | 'y' | 'w' | 'h'>;

export const MAX_MASKS = 30;
/** Kleinste Kantenlänge eines Feldes als Bruchteil des Bildes. */
export const MASK_MIN = 0.02;

const round = (v: number) => Math.round(v * 10_000) / 10_000;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Feld innerhalb des Bildes, mindestens `MASK_MIN` groß, auf vier Stellen gerundet. */
export function fitMask(m: MaskInput): Mask {
  const w = Math.min(1, Math.max(MASK_MIN, m.w));
  const h = Math.min(1, Math.max(MASK_MIN, m.h));
  const x = Math.min(1 - w, Math.max(0, m.x));
  const y = Math.min(1 - h, Math.max(0, m.y));
  return { n: m.n, x: round(x), y: round(y), w: round(w), h: round(h) };
}

/** Nächste freie Nummer: größte plus eins, damit gelöschte nicht wiederkehren. */
export function nextMaskNumber(masks: readonly Mask[], everUsed = 0): number {
  return Math.max(everUsed, ...masks.map((m) => m.n), 0) + 1;
}

/**
 * Neues Feld aus zwei Punkten einer Ziehgeste (Bruchteile des Bildes). Zu kleine Rechtecke, also
 * ein Tippen statt Ziehen, ergeben `null`. Sind schon `MAX_MASKS` Felder da, ebenfalls.
 */
export function drawMask(
  masks: readonly Mask[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  everUsed = 0,
): Mask | null {
  if (masks.length >= MAX_MASKS) return null;
  const x0 = clamp01(Math.min(a.x, b.x));
  const y0 = clamp01(Math.min(a.y, b.y));
  const x1 = clamp01(Math.max(a.x, b.x));
  const y1 = clamp01(Math.max(a.y, b.y));
  if (x1 - x0 < MASK_MIN || y1 - y0 < MASK_MIN) return null;
  return fitMask({ n: nextMaskNumber(masks, everUsed), x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
}

export type Handle = 'nw' | 'ne' | 'sw' | 'se';

/** Verschiebt ein Feld um (dx, dy) Bruchteile; es bleibt im Bild. */
export function moveMask(masks: readonly Mask[], n: number, dx: number, dy: number): Mask[] {
  return masks.map((m) => (m.n === n ? fitMask({ ...m, x: m.x + dx, y: m.y + dy }) : m));
}

/** Zieht eine Ecke um (dx, dy) Bruchteile; die gegenüberliegende Ecke bleibt stehen. */
export function resizeMask(
  masks: readonly Mask[],
  n: number,
  handle: Handle,
  dx: number,
  dy: number,
): Mask[] {
  return masks.map((m) => {
    if (m.n !== n) return m;
    let left = m.x;
    let top = m.y;
    let right = m.x + m.w;
    let bottom = m.y + m.h;
    if (handle === 'nw' || handle === 'sw') left = clamp01(Math.min(left + dx, right - MASK_MIN));
    else right = clamp01(Math.max(right + dx, left + MASK_MIN));
    if (handle === 'nw' || handle === 'ne') top = clamp01(Math.min(top + dy, bottom - MASK_MIN));
    else bottom = clamp01(Math.max(bottom + dy, top + MASK_MIN));
    return fitMask({ n, x: left, y: top, w: right - left, h: bottom - top });
  });
}

export function removeMask(masks: readonly Mask[], n: number): Mask[] {
  return masks.filter((m) => m.n !== n);
}

/** Oberstes Feld an einem Punkt (später gezeichnete liegen oben); `null`, wenn keins getroffen ist. */
export function maskAt(masks: readonly Mask[], x: number, y: number): Mask | null {
  for (let i = masks.length - 1; i >= 0; i -= 1) {
    const m = masks[i];
    if (m && x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) return m;
  }
  return null;
}

/** Lage der Ecke eines Feldes als Bruchteil des Bildes. */
export function cornerOf(m: Mask, handle: Handle): { x: number; y: number } {
  return {
    x: handle === 'nw' || handle === 'sw' ? m.x : m.x + m.w,
    y: handle === 'nw' || handle === 'ne' ? m.y : m.y + m.h,
  };
}

/**
 * Anzeigenummer „1, 2, 3“ eines Feldes: seine Stelle in der Reihenfolge der Nummern. Sie ist
 * abgeleitet, damit nach dem Löschen keine Lücke in der Zählung bleibt.
 */
export function ordinals(masks: readonly Mask[]): Map<number, number> {
  const sorted = [...masks].sort((a, b) => a.n - b.n);
  return new Map(sorted.map((m, i) => [m.n, i + 1]));
}

/** Kennungen der Abfragen einer Abdeckung, nach Nummer: `['m1', 'm3']`. */
export function maskSubs(masks: readonly Mask[]): string[] {
  return [...masks].sort((a, b) => a.n - b.n).map((m) => `m${String(m.n)}`);
}

/** Nummer aus einer Abfrage-Kennung `m3`; alles andere ergibt `null`. */
export function maskNumber(sub: string): number | null {
  const m = /^m([1-9]\d?)$/.exec(sub);
  return m ? Number(m[1]) : null;
}

/** Prüfung beim Speichern: mindestens ein Feld, Nummern eindeutig, alles im Bild. */
export function checkMasks(masks: readonly Mask[]): string | null {
  if (masks.length === 0) return 'Ziehe mindestens ein Feld auf dem Bild auf.';
  if (masks.length > MAX_MASKS) return `Höchstens ${String(MAX_MASKS)} Felder.`;
  return null;
}

/** „3 Felder“ */
export function maskCountLabel(n: number): string {
  return n === 0 ? 'Noch keine Felder' : n === 1 ? '1 Feld' : `${String(n)} Felder`;
}
