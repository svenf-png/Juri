import { cx } from '../cx';
import styles from './Segments.module.css';

/**
 * Segmentleiste für Tagesziele (Main.dc.html): Segmente wachsen gestaffelt von links ein
 * (0,5 s, ab 0,15 s alle 18 ms). Rein visuell; die Zahl steht daneben als Text.
 * Größen über --seg-height, --seg-radius und --seg-gap anpassbar.
 */
export function Segments({
  segments,
  className,
}: {
  segments: readonly boolean[];
  className?: string | undefined;
}) {
  return (
    <div
      className={cx(styles.segments, className)}
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {segments.map((done, i) => (
        <span
          key={i}
          className={cx(styles.segment, done && styles.done)}
          style={{ animationDelay: `${(0.15 + i * 0.018).toFixed(3)}s` }}
        />
      ))}
    </div>
  );
}
