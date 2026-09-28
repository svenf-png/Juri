import { rating } from '../tokens/tokens';
import { cx } from '../cx';
import rise from '../motion/rise.module.css';
import styles from './RatingBar.module.css';

export type RatingKey = keyof typeof rating;

const ORDER: RatingKey[] = ['again', 'hard', 'good', 'easy'];

export function RatingBar({
  intervals,
  onRate,
  animated = false,
}: {
  intervals: Record<RatingKey, string>;
  onRate: (key: RatingKey) => void;
  /** Die Knöpfe steigen gestaffelt auf (Lernen.dc.html, 50 ms Abstand). */
  animated?: boolean;
}) {
  return (
    <div className={styles.bar} role="group" aria-label="Bewerten">
      {ORDER.map((key, index) => (
        <button
          key={key}
          type="button"
          className={cx(styles.button, styles[key], animated && rise.rise)}
          style={animated ? { animationDelay: `${index * 0.05}s` } : undefined}
          onClick={() => onRate(key)}
        >
          <span className={styles.label}>{rating[key].label}</span>
          <span className={styles.interval}>{intervals[key]}</span>
        </button>
      ))}
    </div>
  );
}
