/**
 * Bearbeitungsmodell für Lückentexte. Der Editor zeigt den reinen Text; die Lücken sind
 * Bereiche darin (Positionen in UTF-16-Einheiten wie bei `selectionStart`). Beim Speichern
 * wird daraus die Markierung `{{cN::…}}` (cloze.ts).
 */
import { CLOZE_MAX_NUMBER, parseCloze } from './cloze';

export interface DraftGap {
  readonly n: number;
  readonly start: number;
  readonly end: number;
}

export interface ClozeDraft {
  readonly text: string;
  /** Nach Anfang sortiert, ohne Überlappung. */
  readonly gaps: readonly DraftGap[];
}

export type AddGapError = 'leer' | 'ueberlappt' | 'ungueltig' | 'zu-viele';

export const ADD_GAP_MESSAGES: Readonly<Record<AddGapError, string>> = {
  leer: 'Markiere zuerst ein Wort im Text.',
  ueberlappt: 'Diese Stelle ist schon eine Lücke.',
  ungueltig: 'Die Markierung darf keine doppelten Klammern enthalten.',
  'zu-viele': 'Mehr als 99 Lücken sind nicht möglich.',
};

export const EMPTY_DRAFT: ClozeDraft = { text: '', gaps: [] };

export function draftFromMarkup(markup: string): ClozeDraft {
  let text = '';
  const gaps: DraftGap[] = [];
  for (const segment of parseCloze(markup)) {
    if (segment.kind === 'gap')
      gaps.push({ n: segment.n, start: text.length, end: text.length + segment.text.length });
    text += segment.text;
  }
  return { text, gaps };
}

export function draftToMarkup(draft: ClozeDraft): string {
  let out = '';
  let at = 0;
  for (const gap of draft.gaps) {
    out += `${draft.text.slice(at, gap.start)}{{c${gap.n}::${draft.text.slice(gap.start, gap.end)}}}`;
    at = gap.end;
  }
  return out + draft.text.slice(at);
}

/** Nächste freie Nummer: größte vergebene plus eins, damit gelöschte Nummern nicht wiederkehren. */
export function nextGapNumber(draft: ClozeDraft): number {
  return draft.gaps.reduce((max, g) => Math.max(max, g.n), 0) + 1;
}

/** Macht die Auswahl `start` bis `end` zur Lücke; Leerraum am Rand zählt nicht mit. */
export function addGap(
  draft: ClozeDraft,
  start: number,
  end: number,
): { draft: ClozeDraft } | { error: AddGapError } {
  let a = Math.max(0, Math.min(start, end));
  let b = Math.min(draft.text.length, Math.max(start, end));
  while (a < b && /\s/u.test(draft.text.charAt(a))) a++;
  while (b > a && /\s/u.test(draft.text.charAt(b - 1))) b--;
  if (a >= b) return { error: 'leer' };
  const selected = draft.text.slice(a, b);
  if (selected.includes('{{') || selected.includes('}}')) return { error: 'ungueltig' };
  if (draft.gaps.some((g) => a < g.end && b > g.start)) return { error: 'ueberlappt' };
  const n = nextGapNumber(draft);
  if (n > CLOZE_MAX_NUMBER) return { error: 'zu-viele' };
  const gaps = [...draft.gaps, { n, start: a, end: b }].sort((x, y) => x.start - y.start);
  return { draft: { text: draft.text, gaps } };
}

/** Entfernt die Lücke mit dieser Nummer (auch mehrere gleicher Nummer); der Text bleibt. */
export function removeGap(draft: ClozeDraft, n: number): ClozeDraft {
  return { text: draft.text, gaps: draft.gaps.filter((g) => g.n !== n) };
}

/**
 * Übernimmt eine Änderung des Textes und verschiebt die Lücken mit. Die Änderung wird aus
 * gemeinsamem Anfang und Ende von altem und neuem Text bestimmt. Tippen am Rand einer Lücke
 * verlängert sie nicht, Tippen darin schon; Löschen kürzt sie. Wer eine Lücke nur teilweise
 * überschreibt, verliert sie.
 */
export function editText(draft: ClozeDraft, next: string): ClozeDraft {
  const old = draft.text;
  if (old === next) return draft;
  let prefix = 0;
  const limit = Math.min(old.length, next.length);
  while (prefix < limit && old.charCodeAt(prefix) === next.charCodeAt(prefix)) prefix++;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    old.charCodeAt(old.length - 1 - suffix) === next.charCodeAt(next.length - 1 - suffix)
  ) {
    suffix++;
  }
  const removedEnd = old.length - suffix;
  const removed = removedEnd - prefix;
  const inserted = next.length - suffix - prefix;
  const delta = next.length - old.length;
  const gaps: DraftGap[] = [];
  const keep = (n: number, start: number, end: number) => {
    let a = start;
    let b = end;
    while (a < b && /\s/u.test(next.charAt(a))) a++;
    while (b > a && /\s/u.test(next.charAt(b - 1))) b--;
    if (a < b) gaps.push({ n, start: a, end: b });
  };
  for (const g of draft.gaps) {
    if (g.end <= prefix) gaps.push(g);
    else if (g.start >= removedEnd)
      gaps.push({ n: g.n, start: g.start + delta, end: g.end + delta });
    else if (inserted === 0) {
      // Reines Löschen: Die Lücke schrumpft um das, was von ihr gelöscht wurde.
      keep(g.n, Math.min(g.start, prefix), g.end >= removedEnd ? g.end - removed : prefix);
    } else if (g.start <= prefix && removedEnd <= g.end) keep(g.n, g.start, g.end + delta);
  }
  return { text: next, gaps };
}

export interface DraftSegment {
  readonly text: string;
  /** Lückennummer, `null` für normalen Text. */
  readonly gap: number | null;
}

/** Stücke für die Hervorhebung im Editor. */
export function draftSegments(draft: ClozeDraft): DraftSegment[] {
  const out: DraftSegment[] = [];
  let at = 0;
  for (const gap of draft.gaps) {
    if (gap.start > at) out.push({ text: draft.text.slice(at, gap.start), gap: null });
    out.push({ text: draft.text.slice(gap.start, gap.end), gap: gap.n });
    at = gap.end;
  }
  if (at < draft.text.length) out.push({ text: draft.text.slice(at), gap: null });
  return out;
}
