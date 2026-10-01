import { useState, type ReactNode } from 'react';
import {
  fitMask,
  maskCountLabel,
  nextMaskNumber,
  ordinals,
  removeMask,
  type Mask,
} from '@/domain/cards/occlusion';
import { currentModifierLabel } from '@/features/app/keys';
import { Button } from '../../components/Button';
import { ChevronLeftIcon, TrashIcon } from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
import { useMediaQuery } from '../../useMediaQuery';
import tap from '../../motion/tap.module.css';
import { MaskCanvas } from './MaskCanvas';
import styles from './CoverEditor.module.css';

export interface CoverEditorProps {
  ratio: number;
  image: ReactNode;
  initial: readonly Mask[];
  onDone: (masks: Mask[]) => void;
  onBack: () => void;
  /** Nur Vorschauen: Feld, das beim Öffnen gewählt ist. */
  initialSelected?: number | null;
  /** Hinweis unter dem Bild; auf dem Desktop mit Rad statt Fingern. */
  zoomNote?: string;
}

/** Ein Feld in der Mitte des Bildes (Tastatur), Breite und Höhe je ein Fünftel. */
const CENTER = { x: 0.4, y: 0.45, w: 0.2, h: 0.1 };

/**
 * Felder aufziehen (Vollbild): Änderungen gelten erst mit „Fertig“; „Zurück“ fragt nach, wenn etwas
 * geändert wurde. Die Bildfläche und ihre Gesten stehen in MaskCanvas.
 */
export function CoverEditor({
  ratio,
  image,
  initial,
  onDone,
  onBack,
  initialSelected = null,
  zoomNote = 'Zwei Finger zum Zoomen',
}: CoverEditorProps) {
  const [masks, setMasks] = useState<Mask[]>([...initial]);
  const [selected, setSelected] = useState<number | null>(initialSelected);
  const [asking, setAsking] = useState(false);
  // Höchste je vergebene Nummer: Eine gelöschte Nummer kehrt nicht wieder (Abfrage `m<n>`).
  const [everUsed, setEverUsed] = useState(() => Math.max(0, ...initial.map((m) => m.n)));
  const [changed, setChanged] = useState(false);
  const labels = ordinals(masks);
  const current = masks.find((m) => m.n === selected);
  // Desktop-Gestaltung (ADR-017): Feldliste, Zoom-Knöpfe und Kürzel neben der Fläche.
  const desktop = useMediaQuery('(min-width: 1280px)');
  const [zoom, setZoom] = useState<{
    percent: number;
    step: (direction: 1 | -1) => void;
  }>({ percent: 100, step: () => undefined });
  const mod = currentModifierLabel();
  const ordered = [...masks].sort((a, b) => (labels.get(a.n) ?? 0) - (labels.get(b.n) ?? 0));
  const remove = () => {
    if (!current) return;
    change(removeMask(masks, current.n), 0);
    setSelected(null);
  };

  const change = (next: Mask[], used: number) => {
    setChanged(true);
    setEverUsed((before) => Math.max(before, used));
    setMasks(next);
  };
  const back = () => {
    if (changed) setAsking(true);
    else onBack();
  };
  const addCentered = () => {
    const n = nextMaskNumber(masks, everUsed);
    change([...masks, fitMask({ n, ...CENTER })], n);
    setSelected(n);
  };

  const canvas = (
    <MaskCanvas
      ratio={ratio}
      image={image}
      masks={masks}
      selected={selected}
      everUsed={everUsed}
      onChange={change}
      onSelect={setSelected}
      label="Bild, Felder aufziehen"
      onZoom={desktop ? setZoom : undefined}
      overlay={
        masks.length === 0 ? (
          <div className={styles.emptyHint}>Ziehe ein Feld über einen Begriff</div>
        ) : null
      }
    />
  );

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={back}>
          <ChevronLeftIcon size={24} strokeWidth={2.2} />
          Zurück
        </button>
        <h1 className={styles.topTitle}>Felder</h1>
        <button
          type="button"
          className={cx(styles.done, tap.tap)}
          onClick={() => {
            onDone(masks);
          }}
        >
          Fertig
        </button>
      </div>
      {desktop ? (
        <div className={styles.body}>
          <div className={styles.work}>
            <div className={styles.workHead}>
              <span className={styles.hint}>Felder über Begriffe aufziehen.</span>
              <div className={styles.zoom} role="group" aria-label="Zoom">
                <button
                  type="button"
                  className={cx(styles.zoomButton, tap.tap)}
                  aria-label="Verkleinern"
                  aria-keyshortcuts="-"
                  disabled={zoom.percent <= 100}
                  onClick={() => {
                    zoom.step(-1);
                  }}
                >
                  −
                </button>
                <span className={styles.zoomValue} aria-live="polite">
                  {zoom.percent} %
                </span>
                <button
                  type="button"
                  className={cx(styles.zoomButton, tap.tap)}
                  aria-label="Vergrößern"
                  aria-keyshortcuts="+"
                  onClick={() => {
                    zoom.step(1);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className={styles.stage}>{canvas}</div>
          </div>
          <aside className={styles.side}>
            <section className={styles.fields} aria-labelledby="felder-liste">
              <h2 id="felder-liste" className={styles.sideLabel}>
                Felder
              </h2>
              {ordered.length === 0 ? (
                <p className={styles.fieldsEmpty}>Noch keine Felder</p>
              ) : (
                <ul className={styles.fieldList}>
                  {ordered.map((m) => (
                    <li key={m.n}>
                      <button
                        type="button"
                        className={cx(styles.field, m.n === selected && styles.fieldOn)}
                        aria-pressed={m.n === selected}
                        onClick={() => {
                          setSelected(m.n);
                        }}
                      >
                        <span className={styles.fieldNumber}>{labels.get(m.n)}</span>
                        <span className={styles.fieldName}>Feld {labels.get(m.n)}</span>
                        {m.n === selected ? (
                          <span className={styles.fieldState}>gewählt</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className={styles.sideActions}>
              <button type="button" className={cx(styles.outline, tap.tap)} onClick={addCentered}>
                Feld in der Mitte anlegen
              </button>
              <button
                type="button"
                className={cx(styles.removeSide, tap.tap)}
                disabled={!current}
                aria-keyshortcuts="Delete"
                onClick={remove}
              >
                <TrashIcon size={18} />
                Feld löschen
                <Kbd>Entf</Kbd>
              </button>
            </div>
            <section className={styles.keys} aria-labelledby="felder-kuerzel">
              <h2 id="felder-kuerzel" className={styles.sideLabel}>
                Kürzel
              </h2>
              <dl className={styles.keyList}>
                <div className={styles.keyRow}>
                  <dt>
                    <span className="visually-hidden">Tab</span>
                    <Kbd>Tab</Kbd>
                  </dt>
                  <dd>Feld wählen</dd>
                </div>
                <div className={styles.keyRow}>
                  <dt>
                    <span className="visually-hidden">Pfeiltasten</span>
                    <Kbd>←</Kbd>
                    <Kbd>→</Kbd>
                    <Kbd>↑</Kbd>
                    <Kbd>↓</Kbd>
                  </dt>
                  <dd>Verschieben</dd>
                </div>
                <div className={styles.keyRow}>
                  <dt>
                    <span className="visually-hidden">Umschalt und Pfeiltasten</span>
                    <Kbd>Umschalt</Kbd>
                    <Kbd>Pfeile</Kbd>
                  </dt>
                  <dd>Größe ändern</dd>
                </div>
                <div className={styles.keyRow}>
                  <dt>
                    <span className="visually-hidden">{mod} und Mausrad</span>
                    <Kbd>{mod}</Kbd>
                    <Kbd>Rad</Kbd>
                  </dt>
                  <dd>Zoomen</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      ) : (
        <>
          <div className={styles.hint}>Felder über Begriffe aufziehen.</div>
          <div className={styles.stage}>
            {canvas}
            <button type="button" className={styles.keyboardAdd} onClick={addCentered}>
              Feld in der Mitte anlegen
            </button>
          </div>
        </>
      )}
      <div className={styles.bar}>
        <div className={styles.barRow}>
          <span className={styles.chip} aria-live="polite">
            {current
              ? `Feld ${String(labels.get(current.n) ?? 0)} von ${String(masks.length)}`
              : maskCountLabel(masks.length)}
          </span>
          {current ? (
            <button
              type="button"
              className={cx(styles.remove, tap.tap)}
              onClick={() => {
                change(removeMask(masks, current.n), 0);
                setSelected(null);
              }}
            >
              <TrashIcon size={18} />
              Feld löschen
            </button>
          ) : null}
        </div>
        <div className={styles.note}>{zoomNote}</div>
      </div>
      <Sheet
        open={asking}
        onClose={() => {
          setAsking(false);
        }}
        eyebrow="Abdeckung"
        title="Änderungen verwerfen?"
      >
        <Button variant="danger" block onClick={onBack}>
          Verwerfen
        </Button>
        <Button
          variant="ghost"
          size="md"
          block
          onClick={() => {
            setAsking(false);
          }}
        >
          Weiter bearbeiten
        </Button>
      </Sheet>
    </main>
  );
}
