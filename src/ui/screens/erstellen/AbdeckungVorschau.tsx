import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createGoal } from '@/domain/cards/goal';
import { gestureHints } from '@/domain/device/environment';
import type { Mask } from '@/domain/cards/occlusion';
import type { CoverMask, Face } from '@/domain/session/present';
import type { ImageDraft } from '@/features/media/media';
import { setSurfaceColor } from '@/platform/theme';
import { PdfPane } from '../pdf/PdfPane';
import { colors } from '../../tokens/tokens';
import { LernenView } from '../lernen/LernenView';
import { CardScreen } from './CardScreen';
import { CoverEditor } from './CoverEditor';
import { EMPTY_COVER, EMPTY_FORM, type FormState } from './form';
import { ProblemSheet, SourceSheet } from './MediaSheets';
import { cx } from '../../cx';
import styles from './AbdeckungVorschau.module.css';

const noop = () => undefined;

export type AbdeckungVariant =
  | 'lernen'
  | 'antwort'
  | 'leer'
  | 'quelle'
  | 'fehler'
  | 'verkleinern'
  | 'bild'
  | 'editor'
  | 'editor-leer'
  | 'pdf'
  | 'ipad'
  | 'ipad-abdecken';

/** Linie des nachgebildeten Bildes: Breite, Höhe, Farbe; ohne Farbe ein Abstand. */
type Line = readonly [string, number, string | null];

const PAGE_LEARN: readonly Line[] = [
  ['55%', 12, '#CFCAD9'],
  ['6px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['94%', 7, '#E6E2EE'],
  ['97%', 7, '#E6E2EE'],
  ['60%', 7, '#E6E2EE'],
  ['8px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['90%', 7, '#E6E2EE'],
  ['96%', 7, '#E6E2EE'],
  ['99%', 7, '#E6E2EE'],
  ['45%', 7, '#E6E2EE'],
  ['8px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['93%', 7, '#E6E2EE'],
  ['70%', 7, '#E6E2EE'],
];

const PAGE_EDITOR: readonly Line[] = [
  ['55%', 12, '#CFCAD9'],
  ['8px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['94%', 7, '#E6E2EE'],
  ['97%', 7, '#E6E2EE'],
  ['60%', 7, '#E6E2EE'],
  ['10px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['90%', 7, '#E6E2EE'],
  ['96%', 7, '#E6E2EE'],
  ['99%', 7, '#E6E2EE'],
  ['45%', 7, '#E6E2EE'],
  ['10px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['93%', 7, '#E6E2EE'],
  ['70%', 7, '#E6E2EE'],
  ['10px', 0, null],
  ['100%', 7, '#E6E2EE'],
  ['88%', 7, '#E6E2EE'],
  ['96%', 7, '#E6E2EE'],
  ['52%', 7, '#E6E2EE'],
];

/** Nachgebildetes Bild der Designs: graue Zeilen auf Papier, füllt die Fläche. */
function Skeleton({
  lines,
  padding,
  gap,
  background = 'transparent',
  shrink = false,
}: {
  lines: readonly Line[];
  padding: string;
  gap: number;
  background?: string;
  /** Zeilen dürfen schrumpfen, wenn der Platz nicht reicht (wie im Design der Vorschau). */
  shrink?: boolean;
}) {
  const style: CSSProperties = { padding, gap, background };
  return (
    <div className={styles.skeleton} style={style}>
      {lines.map(([width, height, color], i) =>
        color === null ? (
          <span
            key={i}
            style={{ height: width }}
            className={shrink ? undefined : styles.noShrink}
          />
        ) : (
          <span
            key={i}
            className={shrink ? undefined : styles.noShrink}
            style={{ width, height, borderRadius: 4, background: color }}
          />
        ),
      )}
    </div>
  );
}

const CARD_MASKS = (asked: boolean): CoverMask[] => [
  { n: 1, x: 30 / 304, y: 58 / 412, w: 150 / 304, h: 30 / 412, label: 1, look: 'covered' },
  {
    n: 2,
    x: 90 / 304,
    y: 148 / 412,
    w: 190 / 304,
    h: 30 / 412,
    label: 2,
    look: asked ? 'asked' : 'revealed',
  },
  { n: 3, x: 26 / 304, y: 238 / 412, w: 120 / 304, h: 30 / 412, label: 3, look: 'covered' },
];

/** Abdeckung.dc.html: „Abdeckung 2 von 3“, Feld 2 gefragt, Herkunft „PDF · Skript Sachenrecht S. 14“. */
function coverFace(asked: boolean): Face {
  return {
    kind: 'cover',
    typeLabel: 'Abdeckung 2 von 3',
    question: 'Was steht unter Feld 2?',
    mediaId: 'vorschau',
    masks: CARD_MASKS(asked),
    asked: 2,
    chip: 'PDF · Skript Sachenrecht S. 14',
    openable: false,
    sourcePage: null,
    sourceMediaId: null,
  };
}

const EDITOR_MASKS: Mask[] = [
  { n: 1, x: 0.1, y: 0.24, w: 0.42, h: 0.1 },
  { n: 2, x: 0.3, y: 0.5, w: 0.5, h: 0.1 },
  { n: 3, x: 0.08, y: 0.74, w: 0.34, h: 0.1 },
];

const DEMO_DRAFT: ImageDraft = {
  record: {
    id: 'vorschau',
    kind: 'image',
    mime: 'image/jpeg',
    name: 'IMG_0042',
    size: 640_000,
    width: 2000,
    height: 1500,
    createdAt: 0,
    data: new ArrayBuffer(0),
  },
  originalSize: 4_100_000,
  originalWidth: 4032,
  originalHeight: 3024,
  resized: true,
};

/** Felder von ErstellenAbdeckungBild.dc.html (Prozent der Vorschaufläche). */
const THUMB_MASKS: Mask[] = [
  { n: 1, x: 0.1, y: 0.24, w: 0.42, h: 0.12 },
  { n: 2, x: 0.3, y: 0.52, w: 0.5, h: 0.12 },
  { n: 3, x: 0.08, y: 0.74, w: 0.34, h: 0.12 },
];

const COVER_FORM: FormState = { ...EMPTY_FORM, tab: 'cover' };
const WITH_IMAGE: FormState = {
  ...COVER_FORM,
  // Die Vorschau füllt die Fläche des Designs (320 × 198 px) statt das Bild einzupassen.
  cover: { ...EMPTY_COVER, draft: DEMO_DRAFT, ratio: 320 / 198, masks: THUMB_MASKS, everUsed: 3 },
};

function Erstellen({
  form,
  children,
  seed,
  deckLabel = 'Diebstahl & Betrug · SR',
}: {
  form: FormState;
  children?: ReactNode;
  deckLabel?: string;
  seed?: Parameters<typeof CardScreen>[0]['seed'];
}) {
  return (
    <>
      <CardScreen
        mode="new"
        initial={form}
        deckLabel={deckLabel}
        onPickDeck={noop}
        onSubmit={() => Promise.resolve(true)}
        onClose={noop}
        goal={createGoal(3)}
        {...(seed === undefined ? {} : { seed })}
      />
      {children}
    </>
  );
}

/** Text der PDF-Seite im Design (Georgia, markierter Satz), mit den Abständen des Designs. */
function PageText({
  marked,
  popup,
  layout,
}: {
  marked: boolean;
  popup: boolean;
  layout: 'phone' | 'pad' | 'cover';
}) {
  const line = (width: string) => <span className={styles.line} style={{ width }} />;
  const gap = (height: number) =>
    layout === 'phone' ? null : <span style={{ height }} className={styles.noShrink} />;
  return (
    <div
      className={cx(
        styles.pageText,
        layout === 'pad' && styles.pagePad,
        layout === 'cover' && styles.pageCover,
      )}
    >
      <span className={styles.pageHeading}>§ 5 Gutgläubiger Erwerb beweglicher Sachen</span>
      <span className={styles.pageTitle} />
      {gap(4)}
      {line('100%')}
      {line('96%')}
      {line('91%')}
      {gap(6)}
      <p className={styles.para}>
        {marked ? (
          <span className={styles.mark}>
            Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober
            Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.
          </span>
        ) : (
          'Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.'
        )}{' '}
        (§ 932 II BGB)
      </p>
      {gap(6)}
      {line('100%')}
      {line('94%')}
      {line('98%')}
      {line('60%')}
      {gap(8)}
      {layout === 'phone' ? null : line('100%')}
      {layout === 'phone' ? null : line('88%')}
      {popup ? (
        <div className={cx(styles.popup, layout === 'pad' && styles.popupPad)}>
          <span className={styles.popupOn}>Als Antwort</span>
          <span>Als Frage</span>
          <span>Als Lücke</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Abdeckung, PDF und Foto mit den Beispieldaten der Designs (/styleguide/abdeckung/<Variante>),
 * für den Bildvergleich (A12). Nichts davon wird gespeichert.
 */
export function AbdeckungVorschau({ variant }: { variant: AbdeckungVariant }) {
  const learn = variant === 'lernen' || variant === 'antwort';
  // Ab 1280 px gilt die Desktop-Gestaltung samt Seitenfeld und Texten für Maus und Tastatur.
  const desktop = window.matchMedia('(min-width: 1280px)').matches;
  useEffect(() => {
    setSurfaceColor(document, learn || variant === 'pdf' ? colors.surface : null);
    return () => {
      setSurfaceColor(document, null);
    };
  }, [learn, variant]);

  if (learn) {
    return (
      <LernenView
        counter="17/24"
        percent={71}
        area="ZR"
        norm=""
        face={coverFace(variant === 'lernen')}
        flipped={variant === 'antwort'}
        behind={0}
        intervals={{ again: '10 min', hard: '2 T', good: '6 T', easy: '14 T' }}
        exit=""
        undoable={desktop}
        counts={{ again: 1, hard: 1, good: 1, easy: 0 }}
        open={1}
        {...(desktop
          ? { coverHint: gestureHints('desktop').coverStudy, flipHint: 'Klicken zum Umdrehen' }
          : {})}
        coverRatio={304 / 412}
        coverImage={<Skeleton lines={PAGE_LEARN} padding="20px 18px" gap={9} />}
        onClose={noop}
        onFlip={noop}
        onRevealNext={noop}
        onRevealAll={noop}
        onRate={noop}
        onUndo={noop}
      />
    );
  }
  const editorImage = (
    <Skeleton lines={PAGE_EDITOR} padding="22px 18px" gap={9} background="#fff" />
  );
  if (variant === 'editor' || variant === 'editor-leer') {
    return (
      <CoverEditor
        ratio={348 / 464}
        image={editorImage}
        initial={variant === 'editor' ? EDITOR_MASKS : []}
        initialSelected={variant === 'editor' ? 2 : null}
        onDone={noop}
        onBack={noop}
      />
    );
  }
  if (variant === 'pdf') {
    return (
      <PdfPane
        layout="phone"
        fileName="Skript Sachenrecht.pdf"
        page={14}
        pages={62}
        onPage={noop}
        mode="text"
        onMode={noop}
        onClose={noop}
        hint="Markieren mit dem Finger"
        actionLabel="Zur Karte"
      >
        <PageText marked popup layout="phone" />
      </PdfPane>
    );
  }
  if (variant === 'ipad' || variant === 'ipad-abdecken') {
    const cover = variant === 'ipad-abdecken';
    return (
      <Erstellen
        deckLabel="Sachenrecht · ZR"
        form={
          cover
            ? {
                ...COVER_FORM,
                norm: '§ 932 II BGB',
                cover: {
                  ...EMPTY_COVER,
                  draft: DEMO_DRAFT,
                  // Die Fläche füllt die Seite des Designs (531 × 688 px, 12 px vom Rand).
                  ratio: 531 / 688,
                  page: 14,
                  masks: [
                    { n: 1, x: 48 / 531, y: 84 / 688, w: 190 / 531, h: 26 / 688 },
                    { n: 2, x: 138 / 531, y: 138 / 688, w: 210 / 531, h: 36 / 688 },
                    { n: 3, x: 48 / 531, y: 288 / 688, w: 150 / 531, h: 26 / 688 },
                  ],
                  everUsed: 3,
                },
              }
            : {
                ...EMPTY_FORM,
                front: 'Wann ist der Erwerber nach § 932 II BGB nicht in gutem Glauben?',
                back: 'Wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.',
                norm: '§ 932 II BGB',
              }
        }
        seed={{
          pdf: {
            name: 'Skript Sachenrecht.pdf',
            pages: 62,
            page: 14,
            mode: cover ? 'cover' : 'text',
            open: true,
          },
          pageContent: <PageText marked={!cover} popup={!cover} layout="pad" />,
          coverImage: <PageText marked={false} popup={false} layout="cover" />,
          applied: { front: false, back: !cover },
          selected: 2,
        }}
      />
    );
  }
  const form = variant === 'bild' ? WITH_IMAGE : COVER_FORM;
  return (
    <Erstellen
      form={form}
      seed={{
        coverImage: (
          <Skeleton lines={PAGE_LEARN} padding="16px 14px" gap={7} background="#FBFAFD" shrink />
        ),
        ...(variant === 'verkleinern' ? { busy: { name: 'IMG_0042', size: 4_100_000 } } : {}),
      }}
    >
      {variant === 'quelle' ? (
        <SourceSheet open onClose={noop} onImage={noop} onPdf={noop} />
      ) : null}
      {variant === 'fehler' ? (
        <ProblemSheet
          problem={{ code: 'zu-gross', limit: 50_000_000, size: 80_000_000 }}
          kind="pdf"
          onRetry={noop}
          onClose={noop}
        />
      ) : null}
    </Erstellen>
  );
}
