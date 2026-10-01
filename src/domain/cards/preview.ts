/**
 * Vorschau der Karte beim Erstellen (Desktop-Gestaltung, ADR-017): Was die Vorder- und die
 * Rückseite beim Lernen zeigen, aus den Eingaben des Formulars. Rein; die Abdeckung zeigt die
 * Ansicht selbst (Bild mit Feldern).
 */
import { parseCloze } from './cloze';
import { pointLabels } from './schema';

export interface PreviewInput {
  readonly kind: 'qa' | 'cloze' | 'schema' | 'cover';
  readonly front: string;
  readonly back: string;
  /** Lückentext mit Markierung `{{cN::…}}`. */
  readonly cloze: string;
  readonly title: string;
  readonly points: readonly { readonly level: number; readonly text: string }[];
}

export interface CardPreview {
  readonly typeLabel: 'Frage' | 'Lücke' | 'Schema' | 'Abdeckung';
  /** Text der Vorderseite; leer, solange nichts eingegeben ist. */
  readonly front: string;
  /** Text der Rückseite; bei der Abdeckung leer (die Ansicht zeigt das Bild). */
  readonly back: string;
}

/** Mehr Punkte zeigt die Vorschau nicht (die Rückseite bleibt auf der Karte lesbar). */
export const PREVIEW_POINTS = 6;

const GAP_MARK = '[…]';

export function cardPreview(input: PreviewInput): CardPreview {
  if (input.kind === 'cloze') {
    const segments = parseCloze(input.cloze);
    return {
      typeLabel: 'Lücke',
      front: segments.map((s) => (s.kind === 'gap' ? GAP_MARK : s.text)).join(''),
      back: segments.map((s) => s.text).join(''),
    };
  }
  if (input.kind === 'schema') {
    const labels = pointLabels(input.points);
    const lines = input.points
      .slice(0, PREVIEW_POINTS)
      .map((p, i) =>
        `${'  '.repeat(Math.max(0, p.level - 1))}${labels[i] ?? ''} ${p.text}`.trimEnd(),
      );
    if (input.points.length > PREVIEW_POINTS) lines.push('…');
    return { typeLabel: 'Schema', front: input.title.trim(), back: lines.join('\n') };
  }
  if (input.kind === 'cover') return { typeLabel: 'Abdeckung', front: '', back: '' };
  return { typeLabel: 'Frage', front: input.front.trim(), back: input.back.trim() };
}
