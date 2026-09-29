import { useState, type ReactNode } from 'react';
import {
  fitMask,
  maskCountLabel,
  nextMaskNumber,
  ordinals,
  removeMask,
  type Mask,
} from '@/domain/cards/occlusion';
import { Button } from '../../components/Button';
import { ChevronLeftIcon, TrashIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
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
      <div className={styles.hint}>Felder über Begriffe aufziehen.</div>
      <div className={styles.stage}>
        <MaskCanvas
          ratio={ratio}
          image={image}
          masks={masks}
          selected={selected}
          everUsed={everUsed}
          onChange={change}
          onSelect={setSelected}
          label="Bild, Felder aufziehen"
          overlay={
            masks.length === 0 ? (
              <div className={styles.emptyHint}>Ziehe ein Feld über einen Begriff</div>
            ) : null
          }
        />
        <button type="button" className={styles.keyboardAdd} onClick={addCentered}>
          Feld in der Mitte anlegen
        </button>
      </div>
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
