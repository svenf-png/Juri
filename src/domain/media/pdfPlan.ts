/**
 * PDF-Seiten anzeigen (M6, ADR-010): Rechnen ohne pdf.js. Der Viewer zeigt eine Seite, rendert
 * nur diese (und die nächste vor) und gibt Zeichenflächen frei; hier steht, wie groß gerendert wird
 * und welche Seiten im Speicher bleiben.
 */
import { CANVAS_MAX_PIXELS } from './media';

export interface RenderPlan {
  /** Faktor von PDF-Punkten (1/72 Zoll) auf Bildpunkte der Zeichenfläche. */
  readonly scale: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  /** Faktor von PDF-Punkten auf CSS-Pixel (Anzeigegröße). */
  readonly cssScale: number;
  /** Die Pixeldichte wurde wegen der Flächengrenze gesenkt. */
  readonly limited: boolean;
}

/**
 * Renderplan: Die Seite soll `cssWidth` CSS-Pixel breit erscheinen, mit `dpr` Bildpunkten je
 * CSS-Pixel. Übersteigt die Fläche `maxPixels`, sinkt die Pixeldichte (Seite bleibt gleich groß,
 * wird nur weicher). Mindestens ein Bildpunkt je CSS-Pixel bleibt erhalten, soweit die Grenze es
 * erlaubt.
 */
export function renderPlan(
  pageWidth: number,
  pageHeight: number,
  cssWidth: number,
  dpr: number,
  maxPixels: number = CANVAS_MAX_PIXELS,
): RenderPlan {
  const cssScale = cssWidth / pageWidth;
  const wanted = cssScale * Math.max(1, dpr);
  const area = pageWidth * pageHeight * wanted * wanted;
  const k = area > maxPixels ? Math.sqrt(maxPixels / area) : 1;
  const scale = wanted * k;
  return {
    scale,
    cssScale,
    canvasWidth: Math.max(1, Math.floor(pageWidth * scale)),
    canvasHeight: Math.max(1, Math.floor(pageHeight * scale)),
    limited: k < 1,
  };
}

/** Seiten, die zusätzlich zur angezeigten vorbereitet werden (die nächste, dann die vorige). */
export function prefetchPages(page: number, total: number): number[] {
  return [page + 1, page - 1].filter((p) => p >= 1 && p <= total);
}

/** Seitenzahl aus einer Eingabe („14“), begrenzt auf 1 bis `total`; ungültig ergibt `null`. */
export function parsePage(input: string, total: number): number | null {
  const text = input.trim();
  if (!/^\d{1,5}$/.test(text)) return null;
  const n = Number(text);
  return n < 1 ? null : Math.min(n, total);
}

/** „S. 14 / 62“ */
export function pageLabel(page: number, total: number): string {
  return `S. ${String(page)} / ${String(total)}`;
}

/**
 * Text einer Markierung für ein Kartenfeld: Trennstriche am Zeilenende fallen weg
 * („Fahr-\nlässigkeit“ → „Fahrlässigkeit“), übrige Zeilenumbrüche und Mehrfach-Leerraum werden
 * zu einem Leerzeichen.
 */
export function tidySelection(raw: string): string {
  return raw
    .replace(/(\p{L})[-­]\s*\n\s*(\p{Ll})/gu, '$1$2')
    .replace(/­/g, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export type SelectionRole = 'front' | 'back' | 'cloze';

export interface SelectionPatch {
  readonly front?: string;
  readonly back?: string;
  /** Text für den Lückentext; der Reiter wechselt zu „Lücke“. */
  readonly text?: string;
  readonly tab?: 'qa' | 'cloze';
}

/**
 * Übernimmt eine Markierung ins Formular: „Als Frage“ und „Als Antwort“ ersetzen das Feld,
 * „Als Lücke“ ersetzt einen leeren Text und hängt sonst mit Leerzeichen an (Markieren der Lücken
 * ist danach Sache des Lückeneditors).
 */
export function applySelection(
  role: SelectionRole,
  selection: string,
  current: { readonly text: string },
): SelectionPatch {
  const text = tidySelection(selection);
  if (role === 'front') return { front: text, tab: 'qa' };
  if (role === 'back') return { back: text, tab: 'qa' };
  const base = current.text.trim();
  return { text: base === '' ? text : `${base} ${text}`, tab: 'cloze' };
}
