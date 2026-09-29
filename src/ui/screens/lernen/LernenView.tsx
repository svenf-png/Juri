import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEventHandler,
  type ReactNode,
} from 'react';
import type { Face, Piece, SchemaRow } from '@/domain/session/present';
import type { IntervalPreview } from '@/domain/scheduler/schedule';
import type { RatingKey } from '@/domain/scheduler/rating';
import { CardFlip } from '../../components/CardFlip';
import { CloseIcon, FlipIcon, LinkIcon, NoteIcon, UndoIcon } from '../../components/icons';
import { RatingBar } from '../../components/RatingBar';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import rise from '../../motion/rise.module.css';
import styles from './Lernen.module.css';

/** Bewegung der Karte beim Weitergeben: wegfliegen oder von unten auftauchen. */
export type Exit = '' | 'outR' | 'outL' | 'outD' | 'enter';

export interface LernenViewProps {
  counter: string;
  /** Fortschritt 0 bis 100. */
  percent: number;
  /** Rechtsgebiet, z. B. „SR“. */
  area: string;
  norm: string;
  face: Face;
  /** Eigene Notiz der Karte; erscheint unter der Antwort. */
  note?: string | undefined;
  flipped: boolean;
  /** Karten hinter der aktuellen (0 bis 2), für den Stapel-Eindruck. */
  behind: 0 | 1 | 2;
  intervals: IntervalPreview;
  exit: Exit;
  /** Kartenbewegung durch den Finger, in Pixeln. */
  drag?: number | undefined;
  undoable: boolean;
  onClose: () => void;
  onFlip: () => void;
  onRevealNext: () => void;
  onRevealAll: () => void;
  onRate: (rating: RatingKey) => void;
  onUndo: () => void;
  /** Schema: die verknüpfte Karte eines aufgedeckten Punkts anzeigen. */
  onOpenLink?: ((cardId: string) => void) | undefined;
  /** Zeiger-Ereignisse der Karte für die Wischgeste. */
  cardEvents?: {
    onPointerDown: PointerEventHandler;
    onPointerMove: PointerEventHandler;
    onPointerUp: PointerEventHandler;
    onPointerCancel: PointerEventHandler;
  };
}

/** Text einer Lücke oder eines Textstücks. */
function Pieces({ pieces, look }: { pieces: readonly Piece[]; look: 'front' | 'back' | 'bundle' }) {
  return (
    <>
      {pieces.map((piece, i) => {
        if (piece.kind === 'text') return <span key={i}>{piece.text}</span>;
        if (piece.look === 'hidden') {
          return (
            <span
              key={i}
              className={look === 'bundle' ? styles.bundleBlank : styles.blank}
              role="img"
              aria-label="Lücke"
            />
          );
        }
        return (
          <span
            key={i}
            className={
              piece.look === 'current'
                ? styles.ring
                : look === 'bundle'
                  ? styles.bundleChip
                  : styles.chip
            }
          >
            {piece.text}
          </span>
        );
      })}
    </>
  );
}

function Head({ area, type, norm }: { area: string; type: string; norm: string }) {
  return (
    <div className={styles.head}>
      {area ? <span className={styles.area}>{area}</span> : null}
      <span className={styles.type}>{type}</span>
      <span className={styles.norm}>{norm}</span>
    </div>
  );
}

function Front({ view }: { view: LernenViewProps }) {
  const { face } = view;
  return (
    <div className={styles.frontBody}>
      <Head area={view.area} type={face.typeLabel} norm={view.norm} />
      <div className={styles.middle}>
        {face.kind === 'cloze' ? (
          <div className={styles.clozeText}>
            <Pieces pieces={face.front} look="front" />
          </div>
        ) : face.kind === 'qa' ? (
          <div className={styles.question}>{face.question}</div>
        ) : null}
      </div>
      <div className={styles.flipHint}>
        <FlipIcon size={16} />
        Tippen zum Umdrehen
      </div>
    </div>
  );
}

function Back({ view }: { view: LernenViewProps }) {
  const { face } = view;
  return (
    <div className={styles.backBody}>
      <div className={styles.head}>
        <span className={styles.answerLabel}>Antwort</span>
        <span className={styles.backNorm}>{view.norm}</span>
      </div>
      {face.kind === 'qa' ? (
        <div className={styles.answerBlock}>
          <div className={styles.answerQuestion}>{face.question}</div>
          <div className={styles.answer}>{face.answer}</div>
        </div>
      ) : face.kind === 'cloze' ? (
        <div className={styles.backCloze}>
          <Pieces pieces={face.back} look="back" />
        </div>
      ) : null}
      <span className={styles.spacer} />
      {view.note ? (
        <div className={styles.note}>
          <NoteIcon size={20} className={styles.noteIcon} />
          <div className={styles.noteText}>
            <span className={styles.noteLabel}>Notiz</span>
            <span className={styles.noteBody}>{view.note}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Bundle({
  view,
  face,
}: {
  view: LernenViewProps;
  face: Extract<Face, { kind: 'bundle' }>;
}) {
  return (
    <div className={styles.bundle}>
      <Head area={view.area} type={face.typeLabel} norm={view.norm} />
      <p className={styles.bundleText}>
        <Pieces pieces={face.pieces} look="bundle" />
      </p>
      <span className={styles.spacer} />
      {view.note && view.flipped ? (
        <div className={styles.note}>
          <NoteIcon size={20} className={styles.noteIcon} />
          <div className={styles.noteText}>
            <span className={styles.noteLabel}>Notiz</span>
            <span className={styles.noteBody}>{view.note}</span>
          </div>
        </div>
      ) : null}
      <div className={styles.steps} role="img" aria-label="Fortschritt der Lücken">
        {Array.from({ length: face.total }, (_, i) => (
          <span key={i} className={cx(styles.step, i < face.revealed && styles.stepOn)} />
        ))}
      </div>
    </div>
  );
}

/** Breiten der Platzhalter für verdeckte Punkte (Schema.dc.html: 150 und 110 px für Punkt 4 und 5). */
const SKELETON_WIDTHS = [130, 90, 120, 150, 110] as const;

function SchemaRows({
  face,
  onOpenLink,
}: {
  face: Extract<Face, { kind: 'schema' }>;
  onOpenLink?: ((cardId: string) => void) | undefined;
}) {
  const current = useRef<HTMLLIElement>(null);
  // Der zuletzt aufgedeckte Punkt bleibt im Blick, auch wenn die Liste länger als die Karte wird.
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' });
  }, [face.revealed]);
  const complete = face.revealed >= face.total;
  return (
    <ol className={styles.rows} role="list" aria-label="Gliederung">
      {face.rows.map((row: SchemaRow, i) => {
        const nested = row.level > 1;
        if (!row.shown) {
          return (
            <li
              key={row.id}
              className={cx(styles.row, nested && styles.rowNested)}
              aria-label="Punkt noch verdeckt"
            >
              <span className={cx(styles.num, styles.numHidden, nested && styles.numNested)}>
                {row.number}
              </span>
              <span
                className={cx(styles.skeleton, nested && styles.skeletonNested)}
                style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] ?? 130 }}
              />
            </li>
          );
        }
        return (
          <li
            key={row.id}
            ref={row.current ? current : undefined}
            className={cx(styles.row, nested && styles.rowNested, row.current && styles.rowCurrent)}
          >
            <span
              className={cx(
                styles.num,
                complete ? styles.numDone : styles.numOn,
                nested && styles.numNested,
              )}
            >
              {row.number}
            </span>
            <div className={cx(styles.rowText, row.content !== '' && styles.rowTextContent)}>
              <span className={cx(styles.rowTitle, nested && styles.rowTitleNested)}>
                {row.text}
              </span>
              {row.norm !== '' ? (
                <span className={cx(styles.rowNorm, complete && styles.rowNormDone)}>
                  {row.norm}
                </span>
              ) : null}
              {row.content !== '' ? <span className={styles.rowContent}>{row.content}</span> : null}
            </div>
            {row.link !== null ? (
              <button
                type="button"
                data-noswipe=""
                className={cx(styles.linkChip, row.current && styles.linkChipOn, tap.tap)}
                aria-label={`Verknüpfte Karte zu „${row.text}“ anzeigen`}
                onClick={() => {
                  onOpenLink?.(row.link ?? '');
                }}
              >
                <LinkIcon size={14} strokeWidth={2.2} />
                Karte
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SchemaCard({
  view,
  face,
}: {
  view: LernenViewProps;
  face: Extract<Face, { kind: 'schema' }>;
}) {
  return (
    <div className={styles.schema}>
      <Head area={view.area} type={face.typeLabel} norm={view.norm} />
      <div className={styles.schemaTitle}>{face.title}</div>
      <SchemaRows face={face} onOpenLink={view.onOpenLink} />
      {view.note && view.flipped ? (
        <div className={styles.note}>
          <NoteIcon size={20} className={styles.noteIcon} />
          <div className={styles.noteText}>
            <span className={styles.noteLabel}>Notiz</span>
            <span className={styles.noteBody}>{view.note}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Lernansicht: Kopfzeile mit Beenden, Fortschritt und Zähler, die Karte (Frage, Lücke oder
 * gebündelte Lücken) und unten „Antwort zeigen“, „Nächste Lücke“ oder die vier Bewertungen.
 * Rein: Zustand und Bewegungen kommen von außen (Lernen.tsx, LernenVorschau.tsx).
 */
export function LernenView(view: LernenViewProps) {
  const { face } = view;
  const schema = face.kind === 'schema';
  const bundle = face.kind === 'bundle' || (schema && face.total > 1);
  const cardStyle: CSSProperties | undefined =
    view.drag === undefined || view.drag === 0
      ? undefined
      : {
          transform: `translateX(${view.drag}px) rotate(${view.drag / 18}deg)`,
          opacity: Math.max(0.35, 1 - Math.abs(view.drag) / 500),
        };
  const moving = view.drag !== undefined && view.drag !== 0;

  let card: ReactNode;
  if (face.kind === 'bundle') {
    card = <Bundle view={view} face={face} />;
  } else if (face.kind === 'schema') {
    card = <SchemaCard view={view} face={face} />;
  } else {
    card = (
      <CardFlip
        front={<Front view={view} />}
        back={<Back view={view} />}
        flipped={view.flipped}
        onFlip={view.onFlip}
        height="100%"
        labelled={false}
      />
    );
  }

  return (
    <main className={styles.screen} aria-label="Lernen">
      <div className={styles.top}>
        <button
          type="button"
          className={cx(styles.close, tap.tap)}
          aria-label="Lernen beenden"
          onClick={view.onClose}
        >
          <CloseIcon size={22} strokeWidth={2.2} />
        </button>
        <div
          className={styles.track}
          role="progressbar"
          aria-label="Fortschritt"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={view.percent}
        >
          <div className={styles.fill} style={{ width: `${view.percent}%` }} />
        </div>
        <div className={styles.counter} aria-label={`Karte ${view.counter.replace('/', ' von ')}`}>
          {view.counter}
        </div>
      </div>

      <div className={cx(styles.stage, schema && styles.stageTall)}>
        <div className={styles.frame}>
          {view.behind >= 2 ? <div className={cx(styles.behind, styles.behind2)} /> : null}
          {view.behind >= 1 ? <div className={cx(styles.behind, styles.behind1)} /> : null}
          <div
            className={cx(
              styles.wrap,
              view.exit !== '' && styles[view.exit],
              moving && styles.dragging,
              view.exit === 'enter' && styles.instant,
            )}
            style={cardStyle}
            {...(view.flipped ? view.cardEvents : {})}
          >
            {card}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        {view.flipped ? (
          <>
            <RatingBar animated intervals={view.intervals} onRate={view.onRate} />
            <div className={styles.hint}>Wischen: links Nochmal, rechts Gut</div>
          </>
        ) : bundle ? (
          <div className={styles.pair}>
            <button
              type="button"
              className={cx(styles.pairButton, styles.pairAll, tap.tap)}
              onClick={view.onRevealAll}
            >
              Alle zeigen
            </button>
            <button
              type="button"
              className={cx(styles.pairButton, styles.pairNext, tap.tap)}
              onClick={view.onRevealNext}
            >
              {schema ? 'Nächster Punkt' : 'Nächste Lücke'}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={cx(styles.flipButton, tap.tap, rise.rise)}
              onClick={view.onFlip}
            >
              Antwort zeigen
            </button>
            {view.undoable ? (
              <button type="button" className={styles.undo} onClick={view.onUndo}>
                <UndoIcon size={16} strokeWidth={2.2} />
                Letzte Bewertung zurücknehmen
              </button>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
