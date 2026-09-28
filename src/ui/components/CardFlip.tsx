import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './CardFlip.module.css';

interface CardFlipProps {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  onFlip: () => void;
  width?: number | string;
  height?: number | string;
  flipLabel?: string;
  /**
   * Der Knopf heißt nach `flipLabel` (Standard). Mit `false` liest ein Screenreader stattdessen den
   * Inhalt der Vorderseite und danach „Antwort zeigen“ (Lernen: die Frage muss vorlesbar sein).
   */
  labelled?: boolean;
}

/**
 * Karte mit Vorder- und Rückseite. Die Vorderseite ist ein echter Knopf (Tippen = umdrehen);
 * die jeweils verdeckte Seite ist für Screenreader ausgeblendet.
 */
export function CardFlip({
  front,
  back,
  flipped,
  onFlip,
  width = '100%',
  height = 520,
  flipLabel = 'Antwort zeigen',
  labelled = true,
}: CardFlipProps) {
  return (
    <div className={styles.wrap} style={{ width, height }}>
      <div className={cx(styles.inner, flipped && styles.flipped)}>
        <button
          type="button"
          className={styles.face}
          onClick={onFlip}
          aria-label={labelled ? flipLabel : undefined}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
        >
          {front}
          {labelled ? null : <span className="visually-hidden">{flipLabel}</span>}
        </button>
        <div className={cx(styles.face, styles.back)} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
