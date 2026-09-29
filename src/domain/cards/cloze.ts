/**
 * Lückentext (Entscheidung 3): Im Text markiert `{{c1::Wort}}` eine Lücke, die Zahl nummeriert
 * sie. Jede Nummer ist eine eigene Abfrage (reviewItem `c1`, `c2` …); mehrere Lücken mit derselben
 * Nummer werden zusammen abgefragt. Der Text bleibt ein einfacher String, damit er sich
 * unverändert speichern, sichern und teilen lässt.
 */

export type ClozeSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'gap'; readonly n: number; readonly text: string };

/** Höchste Lückennummer. */
export const CLOZE_MAX_NUMBER = 99;

const GAP = /\{\{c([1-9]\d?)::([\s\S]+?)\}\}/g;

/** Zerlegt den Text in Text- und Lückenstücke; unvollständige Markierungen bleiben Text. */
export function parseCloze(markup: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let last = 0;
  for (const match of markup.matchAll(GAP)) {
    if (match.index > last) segments.push({ kind: 'text', text: markup.slice(last, match.index) });
    segments.push({ kind: 'gap', n: Number(match[1]), text: match[2] ?? '' });
    last = match.index + match[0].length;
  }
  if (last < markup.length) segments.push({ kind: 'text', text: markup.slice(last) });
  return segments;
}

/** Lückennummern ohne Doppelte, aufsteigend. */
export function clozeNumbers(markup: string): number[] {
  const numbers = new Set<number>();
  for (const segment of parseCloze(markup)) if (segment.kind === 'gap') numbers.add(segment.n);
  return [...numbers].sort((a, b) => a - b);
}

export function hasGap(markup: string): boolean {
  return clozeNumbers(markup).length > 0;
}

/** Der Text ohne Markierungen, alle Lücken aufgedeckt (Listen, Suche). */
export function clozePlain(markup: string): string {
  return parseCloze(markup)
    .map((s) => s.text)
    .join('');
}

/** Kennung der Abfrage zu einer Lückennummer: 3 → „c3“. */
export function gapSub(n: number): string {
  return `c${n}`;
}
