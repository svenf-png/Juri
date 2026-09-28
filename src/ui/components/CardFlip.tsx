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
}: CardFlipProps) {
  return (
    <div className={styles.wrap} style={{ width, height }}>
      <div className={cx(styles.inner, flipped && styles.flipped)}>
        <button
          type="button"
          className={styles.face}
          onClick={onFlip}
          aria-label={flipLabel}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
        >
          {front}
        </button>
        <div className={cx(styles.face, styles.back)} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
