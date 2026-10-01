/**
 * Bildkarte zum Verschicken (M11, Entscheidung 12): ein PNG, das Canvas zeichnet. Dieses Modul legt
 * nur fest, WAS gezeichnet wird (Plan aus einfachen Formen), rein und ohne Browser; `platform/canvas`
 * führt den Plan aus. Texte stehen nur als Text im Plan, nie als HTML. Werte aus HighFive.dc.html.
 */

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const PURPLE = '#6A3FE0';
const LILAC = '#C9B8F7';
const SOFT = '#EEE8FD';
const WHITE = '#FFFFFF';

/** Handsymbol des Designs (24 × 24, Linienstärke 1,7 beim Wellen-Overlay). */
export const HAND_PATH =
  'M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V12M16 12V9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5.2-2.6L3.6 14.8a1.5 1.5 0 0 1 2.3-1.9L7 14';

export interface CardContent {
  /** Name des Absenders (eigenes Profil). */
  readonly from: string;
  /** Name des Empfängers; fehlt bei „einfach so“ ohne Kontakt. */
  readonly to?: string | undefined;
  /** Anlass ohne Namen: „12 Tage in Folge“. */
  readonly win?: string | undefined;
}

/** Der Satz auf der Karte; zugleich der Alternativtext der Vorschau. */
export function cardSentence(card: CardContent): string {
  const to = card.to?.trim() ? card.to.trim() : undefined;
  if (to && card.win) return `${card.from} schickt ${to} ein High five für ${card.win}.`;
  if (to) return `${card.from} schickt ${to} ein High five. Einfach so.`;
  if (card.win) return `${card.from} schickt dir ein High five für ${card.win}.`;
  return `${card.from} schickt dir ein High five. Einfach so.`;
}

export type CardOp =
  | { readonly kind: 'fill'; readonly color: string }
  | {
      readonly kind: 'circle';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly fill?: string;
      readonly stroke?: string;
      readonly lineWidth?: number;
    }
  | {
      readonly kind: 'hand';
      readonly x: number;
      readonly y: number;
      readonly scale: number;
      readonly color: string;
      readonly lineWidth: number;
    }
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly size: number;
      readonly weight: number;
      readonly family: 'display' | 'body';
      readonly color: string;
    };

export interface CardPlan {
  readonly width: number;
  readonly height: number;
  readonly ops: readonly CardOp[];
  /** Alternativtext der Vorschau. */
  readonly alt: string;
}

/** Misst die Breite eines Textes in Pixeln in der angegebenen CSS-Schrift. */
export type Measure = (text: string, font: string) => number;

export const cardFont = (size: number, weight: number, family: 'display' | 'body'): string =>
  `${String(weight)} ${String(size)}px ${family === 'display' ? "'Bricolage Grotesque'" : "'Figtree'"}, system-ui, sans-serif`;

/** Umbruch nach Wörtern; ein einzelnes zu langes Wort wird nach Zeichen getrennt. Höchstens `maxLines` Zeilen. */
export function wrapLines(
  text: string,
  maxWidth: number,
  font: string,
  measure: Measure,
  maxLines = 4,
): string[] {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    if (line !== '') lines.push(line);
    line = '';
  };
  for (const word of text.split(/\s+/u).filter((w) => w !== '')) {
    let rest = word;
    while (measure(rest, font) > maxWidth && rest.length > 1) {
      // Zu langes Wort: so viele Zeichen wie passen.
      let n = rest.length - 1;
      while (n > 1 && measure(rest.slice(0, n), font) > maxWidth) n -= 1;
      push();
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    const next = line === '' ? rest : `${line} ${rest}`;
    if (line !== '' && measure(next, font) > maxWidth) {
      push();
      line = rest;
    } else {
      line = next;
    }
  }
  push();
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${(kept[maxLines - 1] ?? '').replace(/\s*\S{0,2}$/u, '')}…`;
  return kept;
}

export function cardPlan(card: CardContent, measure: Measure): CardPlan {
  const sentence = cardSentence(card);
  const ops: CardOp[] = [
    { kind: 'fill', color: PURPLE },
    // Wellen wie in der Feier (HighFive.dc.html): zwei Ringe um die Scheibe.
    { kind: 'circle', cx: 540, cy: 470, r: 330, stroke: LILAC, lineWidth: 6 },
    { kind: 'circle', cx: 540, cy: 470, r: 270, stroke: SOFT, lineWidth: 6 },
    { kind: 'circle', cx: 540, cy: 470, r: 210, fill: WHITE },
    { kind: 'hand', x: 540 - 12 * 9, y: 470 - 12 * 9, scale: 9, color: PURPLE, lineWidth: 1.7 },
    {
      kind: 'text',
      text: 'High five!',
      x: 540,
      y: 940,
      size: 136,
      weight: 750,
      family: 'display',
      color: WHITE,
    },
  ];
  const font = cardFont(52, 600, 'body');
  const lines = wrapLines(sentence, 840, font, measure);
  lines.forEach((text, i) => {
    ops.push({
      kind: 'text',
      text,
      x: 540,
      y: 1040 + i * 72,
      size: 52,
      weight: 600,
      family: 'body',
      color: WHITE,
    });
  });
  ops.push({
    kind: 'text',
    text: 'Juri',
    x: 540,
    y: 1280,
    size: 44,
    weight: 700,
    family: 'display',
    color: SOFT,
  });
  return { width: CARD_WIDTH, height: CARD_HEIGHT, ops, alt: sentence };
}
