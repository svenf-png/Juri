import { cx } from '../cx';
import tap from '../motion/tap.module.css';
import styles from './Stepper.module.css';

/**
 * Wert mit Minus und Plus (Einstellungen.dc.html, „Neue Karten pro Tag“): 36 px sichtbar,
 * Trefferfläche 44 px (A1).
 */
export function Stepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel = 'Weniger',
  increaseLabel = 'Mehr',
  canDecrease = true,
  canIncrease = true,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel?: string;
  increaseLabel?: string;
  canDecrease?: boolean;
  canIncrease?: boolean;
}) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={cx(styles.button, tap.tap)}
        aria-label={decreaseLabel}
        disabled={!canDecrease}
        onClick={onDecrease}
      >
        <span className={styles.face}>−</span>
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cx(styles.button, tap.tap)}
        aria-label={increaseLabel}
        disabled={!canIncrease}
        onClick={onIncrease}
      >
        <span className={styles.face}>+</span>
      </button>
    </div>
  );
}
