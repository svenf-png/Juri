import type { WeekDay } from '@/domain/today/today';
import { cx } from '../cx';
import styles from './WeekStrip.module.css';

const LEVEL = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4] as const;

function describe(day: WeekDay): string {
  const base = day.level === 0 ? 'nicht gelernt' : `gelernt, Stufe ${day.level} von 4`;
  return `${base}${day.record ? ', Rekord' : ''}`;
}

/**
 * Letzte 7 Tage als Punkte (Main.dc.html): Stufen der Heatmap, leere Tage gestrichelt, der
 * Rekordtag mit Ring, heute in Tinte beschriftet. Größen über --dot-size, --dot-gap und
 * --dot-label-size anpassbar.
 */
export function WeekStrip({ days }: { days: readonly WeekDay[] }) {
  return (
    <ol className={styles.week}>
      {days.map((day) => (
        <li key={day.key} className={styles.day}>
          <span
            className={cx(styles.dot, LEVEL[day.level], day.record && styles.record)}
            aria-hidden="true"
          />
          <span className={cx(styles.label, day.today && styles.today)}>
            {day.label}
            <span className="visually-hidden">: {describe(day)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
