import { useEffect } from 'react';
import type { Face } from '@/domain/session/present';
import { setSurfaceColor } from '@/platform/theme';
import { colors } from '../../tokens/tokens';
import { LernenView } from './LernenView';

const noop = () => undefined;

/** Lernen.dc.html, erste Karte: Frage „Gewahrsam“, Zähler 1/4, Vorschau 10 min bis 12 T. */
const FRAGE: Face = {
  kind: 'qa',
  typeLabel: 'Frage',
  question: 'Was versteht man unter Gewahrsam?',
  answer: '',
};

/** Luecke.dc.html: „Lücke 3 von 4“, die dritte gerade aufgedeckt. */
const LUECKE: Face = {
  kind: 'bundle',
  typeLabel: 'Lücke 3 von 4',
  revealed: 3,
  total: 4,
  pieces: [
    { kind: 'text', text: 'Der objektive Tatbestand des Betrugs verlangt eine ' },
    { kind: 'gap', n: 1, text: 'Täuschung über Tatsachen', look: 'shown' },
    { kind: 'text', text: ', einen dadurch bewirkten ' },
    { kind: 'gap', n: 2, text: 'Irrtum', look: 'shown' },
    { kind: 'text', text: ', eine ' },
    { kind: 'gap', n: 3, text: 'Vermögensverfügung', look: 'current' },
    { kind: 'text', text: ' und einen ' },
    { kind: 'gap', n: 4, text: 'Schaden', look: 'hidden' },
    { kind: 'text', text: '.' },
  ],
};

/**
 * Lernen mit den Beispieldaten der Designs (/styleguide/lernen/frage und /luecke), für den
 * Bildvergleich (A12). Nichts davon wird gespeichert.
 */
export function LernenVorschau({ variant }: { variant: 'frage' | 'luecke' }) {
  useEffect(() => {
    setSurfaceColor(document, colors.surface);
    return () => {
      setSurfaceColor(document, null);
    };
  }, []);
  const bundle = variant === 'luecke';
  return (
    <LernenView
      counter={bundle ? '9/24' : '1/4'}
      percent={bundle ? 38 : 0}
      area="SR"
      norm={bundle ? '§ 263 StGB' : '§ 242 StGB'}
      face={bundle ? LUECKE : FRAGE}
      flipped={false}
      behind={bundle ? 1 : 2}
      intervals={{ again: '10 min', hard: '2 T', good: '5 T', easy: '12 T' }}
      exit=""
      undoable={false}
      onClose={noop}
      onFlip={noop}
      onRevealNext={noop}
      onRevealAll={noop}
      onRate={noop}
      onUndo={noop}
    />
  );
}
