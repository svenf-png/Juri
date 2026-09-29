import type { ReactNode } from 'react';
import { maskCountLabel } from '@/domain/cards/occlusion';
import { ImageIcon } from '../../components/icons';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './CoverPanel.module.css';

/** Leerer Reiter: große Fläche zum Wählen von Foto oder PDF-Seite (Erstellen.dc.html). */
export function CoverDrop({ onChoose }: { onChoose: () => void }) {
  return (
    <button type="button" className={cx(styles.drop, tap.tap)} onClick={onChoose}>
      <ImageIcon size={36} strokeWidth={1.8} className={styles.dropIcon} />
      <span className={styles.dropTitle}>PDF-Seite oder Foto wählen</span>
      <span className={styles.dropText}>
        Danach Felder aufziehen, die beim Lernen verdeckt sind.
      </span>
    </button>
  );
}

/** Das Bild wird gerade geprüft und verkleinert. */
export function CoverWorking({ name, size }: { name: string; size: string }) {
  return (
    <div className={styles.drop} role="status">
      <svg
        className={styles.spinner}
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="var(--violet-200)" />
        <path d="M12 3a9 9 0 0 1 9 9" />
      </svg>
      <span className={styles.dropTitle}>Bild wird verkleinert</span>
      <span className={styles.dropText}>
        {name} · {size}
      </span>
    </div>
  );
}

export interface CoverPanelProps {
  /** Vorschau: das Bild in der Größe der Fläche samt Feldern (CoverSurface). */
  preview: ReactNode;
  masks: number;
  /** „2000 × 1500 · 0,6 MB“ */
  facts: string;
  /** „Verkleinert von 4032 × 3024 (4,1 MB)“ oder „Seite 14 des PDFs“; leer ohne Zeile. */
  origin: string;
  onEdit: () => void;
  /** Fehlt beim Bearbeiten: Das Bild einer gespeicherten Karte bleibt. */
  onReplace?: (() => void) | undefined;
  error?: string | undefined;
}

/** Gewähltes Bild mit Feldern: Vorschau, Zahl der Felder, „Felder bearbeiten“ und „Anderes Bild“. */
export function CoverPanel({
  preview,
  masks,
  facts,
  origin,
  onEdit,
  onReplace,
  error,
}: CoverPanelProps) {
  return (
    <div>
      <div className={styles.panel}>
        <div className={styles.thumb}>{preview}</div>
        <div className={styles.facts}>
          <span className={styles.count}>{maskCountLabel(masks)}</span>
          <span className={styles.size}>{facts}</span>
        </div>
        {origin !== '' ? <span className={styles.origin}>{origin}</span> : null}
        <div className={styles.actions}>
          <button type="button" className={cx(styles.edit, tap.tap)} onClick={onEdit}>
            Felder bearbeiten
          </button>
          {onReplace ? (
            <button type="button" className={cx(styles.replace, tap.tap)} onClick={onReplace}>
              Anderes Bild
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
