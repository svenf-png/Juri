/** Anzeigename. Er bleibt auf dem Gerät und reist nur in Dateien mit, die du selbst teilst. */

export const NAME_MAX_LENGTH = 40;

const segmenter = new Intl.Segmenter('de', { granularity: 'grapheme' });

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** Leerraum am Rand weg, innen zusammengefasst, höchstens 40 Zeichen (Emoji zählen einfach). */
export function normalizeName(input: string): string {
  const collapsed = input.normalize('NFC').replace(/\s+/gu, ' ').trim();
  return graphemes(collapsed).slice(0, NAME_MAX_LENGTH).join('').trim();
}

/** Initiale für den Avatar (Main.dc.html), z. B. „sven“ → „S“. */
export function initialOf(name: string): string {
  const first = graphemes(normalizeName(name))[0];
  return first ? first.toLocaleUpperCase('de-DE') : '?';
}
