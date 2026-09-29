import { useEffect } from 'react';
import type { DraftPoint } from '@/domain/cards/schema';
import type { LinkServices, LinkTarget } from '@/features/library/links';
import type { Face } from '@/domain/session/present';
import { schemaRows } from '@/domain/session/present';
import { setSurfaceColor } from '@/platform/theme';
import { colors } from '../../tokens/tokens';
import { SchemaEditor, type Sheets } from '../erstellen/SchemaEditor';
import { LernenView } from '../lernen/LernenView';
import { LinkedCardSheet } from '../lernen/LinkedCardSheet';
import { ConfirmSheet } from '../stapel/Sheets';

const noop = () => undefined;

/** Punkte aus SchemaEditor.dc.html (Amtshaftungsanspruch). */
const point = (
  n: number,
  level: number,
  text: string,
  extra: Partial<DraftPoint> = {},
): DraftPoint => ({
  id: `p${String(n)}`,
  level,
  text,
  norm: '',
  content: '',
  link: null,
  ...extra,
});

const AMT: DraftPoint[] = [
  point(1, 1, 'Ausübung eines öffentlichen Amtes'),
  point(2, 1, 'Verletzung einer drittbezogenen Amtspflicht'),
  point(3, 2, 'Amtspflicht'),
  point(4, 2, 'Drittbezogenheit'),
  point(5, 1, 'Verschulden'),
  point(6, 1, 'Kausaler Schaden'),
  point(7, 1, 'Kein Haftungsausschluss', { norm: '§ 839 I 2, III BGB' }),
];

/** Punkt 2.b mit Inhalt, Norm und Verknüpfung (SchemaPunkt.dc.html). */
const AMT_PUNKT: DraftPoint[] = AMT.map((p) =>
  p.id === 'p4'
    ? {
        ...p,
        content: 'Die Amtspflicht muss zumindest auch dem Schutz des Geschädigten dienen.',
        link: 'k1',
      }
    : p,
);

const HITS: readonly LinkTarget[] = [
  { id: 'k1', title: 'Drittbezogenheit der Amtspflicht', meta: 'Frage · Amtshaftung' },
  { id: 'k2', title: 'Drittschutz im Baurecht', meta: 'Schema · Baurecht' },
  { id: 'k3', title: 'Amtspflichtverletzung', meta: 'Lücke · Amtshaftung' },
];

const services = (hits: readonly LinkTarget[]): LinkServices => ({
  useLinked: (id) => (id === null ? null : (HITS.find((h) => h.id === id) ?? 'missing')),
  useCandidates: () => hits,
  createCard: () => Promise.resolve('neu'),
});

/** Schema.dc.html: Anfechtungsklage, drei von fünf Punkten aufgedeckt, Punkt 3 verknüpft. */
const SCHEMA_PUNKTE = [
  { id: 'p1', level: 1, text: 'Verwaltungsrechtsweg', norm: '§ 40 I VwGO' },
  { id: 'p2', level: 1, text: 'Statthaftigkeit', norm: '§ 42 I Alt. 1 VwGO' },
  { id: 'p3', level: 1, text: 'Klagebefugnis', norm: '§ 42 II VwGO', link: 'k' },
  { id: 'p4', level: 1, text: 'Vorverfahren' },
  { id: 'p5', level: 1, text: 'Klagefrist' },
] as const;

/** SchemaLernenInhalt.dc.html: mit Inhalt, Unterpunkt und Norm des Schemas. */
const INHALT_PUNKTE = [
  {
    id: 'p1',
    level: 1,
    text: 'Verwaltungsrechtsweg',
    norm: '§ 40 I VwGO',
    content: 'Öffentlich-rechtliche Streitigkeit nichtverfassungsrechtlicher Art.',
  },
  {
    id: 'p2',
    level: 1,
    text: 'Statthaftigkeit',
    norm: '§ 42 I Alt. 1 VwGO',
    content: 'Angriff auf einen Verwaltungsakt.',
  },
  {
    id: 'p3',
    level: 1,
    text: 'Klagebefugnis',
    norm: '§ 42 II VwGO',
    content: 'Möglichkeit einer Rechtsverletzung.',
    link: 'k',
  },
  { id: 'p4', level: 1, text: 'Vorverfahren' },
  { id: 'p5', level: 2, text: 'Widerspruch' },
  { id: 'p6', level: 1, text: 'Klagefrist' },
];

export type SchemaVariant =
  | 'lernen'
  | 'inhalt'
  | 'editor'
  | 'punkt'
  | 'verknuepfen'
  | 'verknuepfen-leer'
  | 'neue-karte'
  | 'editor-leer'
  | 'loeschen';

function faceOf(
  points: typeof SCHEMA_PUNKTE | typeof INHALT_PUNKTE,
  title: string,
  n: number,
): Face {
  return {
    kind: 'schema',
    typeLabel: 'Schema',
    title,
    rows: schemaRows(points, n),
    revealed: n,
    total: points.length,
  };
}

function Lernen({ inhalt }: { inhalt: boolean }) {
  useEffect(() => {
    setSurfaceColor(document, colors.surface);
    return () => {
      setSurfaceColor(document, null);
    };
  }, []);
  return (
    <>
      <LernenView
        counter="12/24"
        percent={50}
        area="ÖR"
        norm={inhalt ? 'VwGO' : ''}
        face={
          inhalt
            ? faceOf(INHALT_PUNKTE, 'Anfechtungsklage: Zulässigkeit', 3)
            : faceOf(SCHEMA_PUNKTE, 'Anfechtungsklage: Zulässigkeit', 3)
        }
        flipped={false}
        behind={0}
        intervals={{ again: '10 min', hard: '1 T', good: '4 T', easy: '9 T' }}
        exit=""
        undoable={false}
        onClose={noop}
        onFlip={noop}
        onRevealNext={noop}
        onRevealAll={noop}
        onRate={noop}
        onUndo={noop}
      />
      {inhalt ? null : (
        <LinkedCardSheet
          open
          title="Klagebefugnis, § 42 II VwGO"
          text="Kläger muss geltend machen, durch den VA in eigenen Rechten verletzt zu sein. Nach der Möglichkeitstheorie genügt, dass eine Rechtsverletzung nicht offensichtlich und eindeutig nach jeder Betrachtungsweise ausgeschlossen ist."
          missing={false}
          onClose={noop}
          onStudy={noop}
        />
      )}
    </>
  );
}

function Editor({
  points = AMT,
  selected,
  sheet,
  query,
  creating,
  hits = HITS,
}: {
  points?: DraftPoint[];
  selected?: number;
  sheet?: Sheets;
  query?: string;
  creating?: boolean;
  hits?: readonly LinkTarget[];
}) {
  return (
    <SchemaEditor
      title="Amtshaftungsanspruch"
      norm="§ 839 BGB i. V. m. Art. 34 GG"
      areaCodes="ZR, ÖR"
      initial={points}
      deckId="d"
      deckName="Amtshaftung"
      onSave={noop}
      onBack={noop}
      services={services(hits)}
      start={{
        ...(selected === undefined ? {} : { selected }),
        ...(sheet === undefined ? {} : { sheet }),
        ...(query === undefined ? {} : { query }),
        ...(creating ? { creating } : {}),
      }}
    />
  );
}

/**
 * Schema mit den Beispieldaten der Designs (/styleguide/schema/<Variante>) für den Bildvergleich
 * (A12): Schema.dc.html, SchemaEditor.dc.html und die Ergänzungen (Entscheidung 2). Nichts wird
 * gespeichert.
 */
export function SchemaVorschau({ variant }: { variant: SchemaVariant }) {
  switch (variant) {
    case 'lernen':
      return <Lernen inhalt={false} />;
    case 'inhalt':
      return <Lernen inhalt />;
    case 'editor':
      return <Editor selected={3} sheet="link" query="Drittbezogenheit" hits={HITS.slice(0, 2)} />;
    case 'punkt':
      return <Editor points={AMT_PUNKT} selected={3} sheet="point" />;
    case 'verknuepfen':
      return <Editor points={AMT_PUNKT} selected={3} sheet="link" query="" />;
    case 'verknuepfen-leer':
      return <Editor selected={3} sheet="link" query="Haftungsprivileg" hits={[]} />;
    case 'neue-karte':
      return <Editor selected={3} sheet="link" query="Drittbezogenheit" hits={[]} creating />;
    case 'editor-leer':
      return <Editor points={[]} />;
    case 'loeschen':
      return (
        <ConfirmSheet
          eyebrow="Karte löschen"
          title="Diese Karte löschen?"
          preview={{ type: 'Frage', text: 'Drittbezogenheit der Amtspflicht' }}
          usage={{
            heading: 'Verknüpft in 2 Schemas',
            rows: [
              ['Amtshaftungsanspruch', '1 Punkt'],
              ['Staatshaftung im Überblick', '2 Punkte'],
            ],
          }}
          text="Die Punkte bleiben erhalten, nur die Verknüpfung zu dieser Karte entfällt. Die Karte und ihr Lernfortschritt werden gelöscht. Das lässt sich nicht rückgängig machen."
          confirmLabel="Karte löschen"
          onClose={noop}
          onConfirm={() => Promise.resolve()}
        />
      );
  }
}
