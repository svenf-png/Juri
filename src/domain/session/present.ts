/**
 * Was die Lernansicht von einer Karte zeigt (Lernen.dc.html, Luecke.dc.html): reine Funktionen von
 * Karte, gefragten Lücken und Stand der Aufdeckung. Die Oberfläche setzt die Stücke nur ein.
 */
import { parseCloze } from '../cards/cloze';
import type { Card } from '../model/records';

/** Aussehen einer Lücke: verdeckt, aufgedeckt oder gerade aufgedeckt (mit Ring). */
export type GapLook = 'hidden' | 'shown' | 'current';

export type Piece =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'gap'; readonly n: number; readonly text: string; readonly look: GapLook };

/** Lückennummern zu den Kennungen der gefragten Abfragen: `['c3', 'c1']` → `[1, 3]`. */
export function askedNumbers(subs: readonly string[]): number[] {
  return subs
    .filter((s) => s !== '')
    .map((s) => Number(s.slice(1)))
    .sort((a, b) => a - b);
}

/**
 * Stücke eines Lückentextes. Gefragte Lücken (`asked`, aufsteigend) sind verdeckt, bis sie an der
 * Reihe waren: die ersten `revealed` sind aufgedeckt, mit `ring` trägt die zuletzt aufgedeckte den
 * Ring. Lücken, die heute nicht gefragt werden, sind immer sichtbar.
 */
export function clozePieces(
  markup: string,
  asked: readonly number[],
  revealed: number,
  ring: boolean,
): Piece[] {
  return parseCloze(markup).map((segment): Piece => {
    if (segment.kind === 'text') return segment;
    const index = asked.indexOf(segment.n);
    let look: GapLook = 'shown';
    if (index >= 0 && index >= revealed) look = 'hidden';
    else if (index >= 0 && ring && index === revealed - 1) look = 'current';
    return { kind: 'gap', n: segment.n, text: segment.text, look };
  });
}

export function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

/** „24 Wiederholungen, davon 3 nochmal gelernt. Nächste Runde: morgen.“ */
export function endSummary(end: {
  readonly reviews: number;
  readonly again: number;
  readonly stillDue: number;
  readonly next: string | null;
}): string {
  const head = `${plural(end.reviews, 'Wiederholung', 'Wiederholungen')}, davon ${String(end.again)} nochmal gelernt.`;
  if (end.stillDue > 0) {
    return `${head} ${plural(end.stillDue, 'Karte kommt', 'Karten kommen')} heute noch einmal.`;
  }
  return end.next ? `${head} Nächste Runde: ${end.next}.` : head;
}

export type Face =
  | {
      readonly kind: 'qa';
      readonly typeLabel: 'Frage';
      readonly question: string;
      readonly answer: string;
    }
  | {
      readonly kind: 'cloze';
      readonly typeLabel: 'Lücke';
      readonly front: readonly Piece[];
      readonly back: readonly Piece[];
    }
  | {
      readonly kind: 'bundle';
      readonly typeLabel: string;
      readonly pieces: readonly Piece[];
      readonly revealed: number;
      readonly total: number;
    };

/**
 * Ansicht einer Station: `subs` sind die Kennungen ihrer Abfragen (eine Frage `['']`, eine Lücke
 * `['c2']`, gebündelte Lücken `['c1', 'c3']`), `revealed` die schon aufgedeckten Lücken eines Bündels.
 */
export function faceOf(card: Card, subs: readonly string[], revealed: number): Face {
  if (card.type === 'qa') {
    return { kind: 'qa', typeLabel: 'Frage', question: card.front, answer: card.back };
  }
  const asked = askedNumbers(subs);
  if (asked.length > 1) {
    const shown = Math.min(revealed, asked.length);
    return {
      kind: 'bundle',
      typeLabel: `Lücke ${Math.max(1, shown)} von ${asked.length}`,
      pieces: clozePieces(card.text, asked, shown, shown < asked.length),
      revealed: shown,
      total: asked.length,
    };
  }
  return {
    kind: 'cloze',
    typeLabel: 'Lücke',
    front: clozePieces(card.text, asked, 0, false),
    back: clozePieces(card.text, asked, asked.length, false),
  };
}
