import { useEffect } from 'react';
import type { Face } from '@/domain/session/present';
import { setSurfaceColor } from '@/platform/theme';
import { colors } from '../../tokens/tokens';
import { Geschafft } from './Geschafft';
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

/** DesktopLernenAntwort.dc.html: Rückseite der Gewahrsam-Karte mit Notiz, dritte Karte von vier. */
const ANTWORT: Face = {
  kind: 'qa',
  typeLabel: 'Frage',
  question: 'Was versteht man unter Gewahrsam?',
  answer:
    'Die von einem Herrschaftswillen getragene tatsächliche Sachherrschaft eines Menschen über eine Sache, deren Reichweite sich nach der Verkehrsanschauung bestimmt.',
};

/** DesktopLernenSchema.dc.html: Amtshaftungsanspruch, drei von fünf Punkten aufgedeckt. */
const SCHEMA: Face = {
  kind: 'schema',
  typeLabel: 'Schema',
  title: 'Amtshaftungsanspruch',
  revealed: 3,
  total: 5,
  rows: [
    {
      id: 's1',
      level: 1,
      number: '1',
      shown: true,
      current: false,
      text: 'Ausübung eines öffentlichen Amtes',
      norm: 'Art. 34 S. 1 GG',
      content: '',
      link: null,
    },
    {
      id: 's2',
      level: 1,
      number: '2',
      shown: true,
      current: false,
      text: 'Verletzung einer drittbezogenen Amtspflicht',
      norm: '§ 839 I 1 BGB',
      content: '',
      link: 'c1',
    },
    {
      id: 's3',
      level: 1,
      number: '3',
      shown: true,
      current: true,
      text: 'Verschulden',
      norm: '§ 276 BGB',
      content: '',
      link: null,
    },
    {
      id: 's4',
      level: 1,
      number: '4',
      shown: false,
      current: false,
      text: '',
      norm: '',
      content: '',
      link: null,
    },
    {
      id: 's5',
      level: 1,
      number: '5',
      shown: false,
      current: false,
      text: '',
      norm: '',
      content: '',
      link: null,
    },
  ],
};

type Variant = 'frage' | 'luecke' | 'antwort' | 'schema' | 'geschafft';

const NO_COUNTS = { again: 0, hard: 0, good: 0, easy: 0 };

/**
 * Lernen mit den Beispieldaten der Designs (/styleguide/lernen/frage und /luecke) und der
 * Desktop-Artboards (/antwort und /schema), für den Bildvergleich (A12). Nichts davon wird
 * gespeichert.
 */
export function LernenVorschau({ variant }: { variant: Variant }) {
  useEffect(() => {
    setSurfaceColor(document, colors.surface);
    return () => {
      setSurfaceColor(document, null);
    };
  }, []);
  // Ab 1280 px gilt die Desktop-Gestaltung samt Texten für Maus und Tastatur (A52).
  const desktop = window.matchMedia('(min-width: 1280px)').matches;
  if (variant === 'geschafft') {
    // DesktopFertig.dc.html: vier Karten, je eine pro Stufe, zwei Lernschritte kommen heute wieder.
    return (
      <Geschafft
        end={{
          reviews: 4,
          again: 1,
          counts: { again: 1, hard: 1, good: 1, easy: 1 },
          stillDue: 2,
          next: 'morgen',
        }}
        back="Zurück zu Heute"
        onBack={noop}
        onMore={noop}
      />
    );
  }
  const bundle = variant === 'luecke';
  const antwort = variant === 'antwort';
  const schema = variant === 'schema';
  return (
    <LernenView
      counter={bundle ? '9/24' : antwort ? '3/4' : schema ? '2/4' : '1/4'}
      percent={bundle ? 38 : antwort ? 50 : schema ? 25 : 0}
      area={schema ? 'ZR' : 'SR'}
      norm={bundle ? '§ 263 StGB' : schema ? '§ 839 BGB' : '§ 242 StGB'}
      face={bundle ? LUECKE : antwort ? ANTWORT : schema ? SCHEMA : FRAGE}
      note={antwort ? 'Fall Rucksack im Hörsaal: Gewahrsam bleibt beim Studenten.' : undefined}
      flipped={antwort}
      behind={bundle ? 1 : 2}
      intervals={{ again: '10 min', hard: '2 T', good: '5 T', easy: '12 T' }}
      counts={
        antwort
          ? { ...NO_COUNTS, again: 1, good: 1 }
          : schema
            ? { ...NO_COUNTS, hard: 1 }
            : NO_COUNTS
      }
      open={antwort ? 2 : schema ? 3 : 4}
      flipHint={desktop ? 'Klicken zum Umdrehen' : undefined}
      exit=""
      undoable={antwort || schema}
      onClose={noop}
      onFlip={noop}
      onRevealNext={noop}
      onRevealAll={noop}
      onRate={noop}
      onUndo={noop}
    />
  );
}
