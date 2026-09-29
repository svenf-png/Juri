/**
 * Was die Lernansicht von einer Karte zeigt (Lernen.dc.html, Luecke.dc.html): reine Funktionen von
 * Karte, gefragten Lücken und Stand der Aufdeckung. Die Oberfläche setzt die Stücke nur ein.
 */
import { parseCloze } from '../cards/cloze';
import { ordinals, maskNumber, type Mask } from '../cards/occlusion';
import { sourceCoverChip, sourceLabel } from '../cards/card';
import { pointNumbers } from '../cards/schema';
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

/** Zeile eines Schemas in der Lernansicht; verdeckte Zeilen tragen keinen Text (kein Durchscheinen). */
export interface SchemaRow {
  readonly id: string;
  readonly level: number;
  /** „1“, „a“, „aa“ (Zählung ohne Satzzeichen). */
  readonly number: string;
  readonly shown: boolean;
  /** Zuletzt aufgedeckt, solange noch etwas verdeckt ist (Hervorhebung, Schema.dc.html). */
  readonly current: boolean;
  readonly text: string;
  readonly norm: string;
  readonly content: string;
  /** Verknüpfte Karte; nur bei aufgedeckten Zeilen. */
  readonly link: string | null;
}

/** Zeilen eines Schemas mit `revealed` aufgedeckten Punkten (in Lesereihenfolge). */
export function schemaRows(
  points: readonly {
    id: string;
    level: number;
    text: string;
    norm?: string | undefined;
    content?: string | undefined;
    link?: string | undefined;
  }[],
  revealed: number,
): SchemaRow[] {
  const numbers = pointNumbers(points);
  const partial = revealed < points.length;
  return points.map((p, i) => {
    const shown = i < revealed;
    return {
      id: p.id,
      level: p.level,
      number: numbers[i] ?? '',
      shown,
      current: shown && partial && i === revealed - 1,
      text: shown ? p.text : '',
      norm: shown ? (p.norm ?? '') : '',
      content: shown ? (p.content ?? '') : '',
      link: shown ? (p.link ?? null) : null,
    };
  });
}

/** Aussehen eines Feldes der Abdeckung: verdeckt, gefragt (pulsiert) oder aufgedeckt. */
export type MaskLook = 'covered' | 'asked' | 'revealed';

export interface CoverMask extends Mask {
  /** Anzeigenummer 1, 2, 3 (abgeleitet, siehe occlusion.ts). */
  readonly label: number;
  readonly look: MaskLook;
}

/**
 * Felder einer Abdeckung für die Lernansicht (A7: alle verdeckt, eines gefragt). `asked` ist die
 * Nummer des gefragten Feldes; mit `revealed` ist es aufgedeckt, die übrigen bleiben verdeckt.
 */
export function coverMasks(
  masks: readonly Mask[],
  asked: number | null,
  revealed: boolean,
): CoverMask[] {
  const labels = ordinals(masks);
  return masks.map((m) => ({
    ...m,
    label: labels.get(m.n) ?? 0,
    look: m.n !== asked ? 'covered' : revealed ? 'revealed' : 'asked',
  }));
}

/** Herkunft einer Karte für die Zeile „Anhang“ (Antwort.dc.html). */
export interface SourceRef {
  /** „Skript ZPO, S. 42“ */
  readonly label: string;
  /** Gespeichertes PDF, das „Öffnen“ zeigt. */
  readonly mediaId: string | null;
  readonly page: number | null;
}

type FaceBase =
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
      readonly kind: 'schema';
      readonly typeLabel: 'Schema';
      readonly title: string;
      readonly rows: readonly SchemaRow[];
      readonly revealed: number;
      readonly total: number;
    }
  | {
      readonly kind: 'cover';
      /** „Abdeckung 2 von 3“ */
      readonly typeLabel: string;
      readonly question: string;
      readonly mediaId: string;
      readonly masks: readonly CoverMask[];
      /** Anzeigenummer des gefragten Feldes. */
      readonly asked: number;
      /** Herkunft für die Marke unten rechts, z. B. „PDF S. 14“; leer ohne Herkunft. */
      readonly chip: string;
      /** Das PDF der Herkunft ist gespeichert und lässt sich öffnen. */
      readonly openable: boolean;
      readonly sourcePage: number | null;
      readonly sourceMediaId: string | null;
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
export type Face = FaceBase & { readonly source?: SourceRef | undefined };

export function faceOf(card: Card, subs: readonly string[], revealed: number): Face {
  const face = baseFace(card, subs, revealed);
  if (face.kind === 'cover' || !card.source) return face;
  return {
    ...face,
    source: {
      label: sourceLabel(card.source),
      mediaId: card.source.mediaId ?? null,
      page: card.source.page ?? null,
    },
  };
}

function baseFace(card: Card, subs: readonly string[], revealed: number): FaceBase {
  if (card.type === 'qa') {
    return { kind: 'qa', typeLabel: 'Frage', question: card.front, answer: card.back };
  }
  if (card.type === 'schema') {
    const total = card.points.length;
    const shown = Math.min(revealed, total);
    return {
      kind: 'schema',
      typeLabel: 'Schema',
      title: card.title,
      rows: schemaRows(card.points, shown),
      revealed: shown,
      total,
    };
  }
  if (card.type === 'cover') {
    const n = maskNumber(subs[0] ?? '');
    const masks = coverMasks(card.masks, n, revealed > 0);
    const label = masks.find((m) => m.n === n)?.label ?? 1;
    return {
      kind: 'cover',
      typeLabel: `Abdeckung ${String(label)} von ${String(masks.length)}`,
      question: `Was steht unter Feld ${String(label)}?`,
      mediaId: card.mediaId,
      masks,
      asked: label,
      chip: card.source ? sourceCoverChip(card.source) : '',
      openable: card.source?.mediaId !== undefined,
      sourcePage: card.source?.page ?? null,
      sourceMediaId: card.source?.mediaId ?? null,
    };
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
