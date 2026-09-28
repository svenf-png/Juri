import { cx } from '../cx';
import styles from './Wordmark.module.css';

export function Wordmark({
  size = 34,
  className,
}: {
  size?: number;
  className?: string | undefined;
}) {
  return (
    <span
      role="img"
      aria-label="Juri"
      className={cx(styles.mark, className)}
      style={{ fontSize: size }}
    >
      <span aria-hidden="true">
        Jur
        <span className={styles.i}>
          ı<span className={styles.dot} />
        </span>
      </span>
    </span>
  );
}
