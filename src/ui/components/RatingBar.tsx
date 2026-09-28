import { rating } from '../tokens/tokens';
import { cx } from '../cx';
import styles from './RatingBar.module.css';

export type RatingKey = keyof typeof rating;

const ORDER: RatingKey[] = ['again', 'hard', 'good', 'easy'];

export function RatingBar({
  intervals,
  onRate,
}: {
  intervals: Record<RatingKey, string>;
  onRate: (key: RatingKey) => void;
}) {
  return (
    <div className={styles.bar} role="group" aria-label="Bewerten">
      {ORDER.map((key) => (
        <button
          key={key}
          type="button"
          className={cx(styles.button, styles[key])}
          onClick={() => onRate(key)}
        >
          <span className={styles.label}>{rating[key].label}</span>
          <span className={styles.interval}>{intervals[key]}</span>
        </button>
      ))}
    </div>
  );
}
