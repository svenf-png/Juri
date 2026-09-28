import { BUILD } from '@/app/build';
import { roadmap, type MilestoneRow } from '@/domain/roadmap/roadmap';
import { CheckIcon } from '../../components/icons';
import { cx } from '../../cx';
import styles from './Entwicklungsstand.module.css';

function State({ row }: { row: MilestoneRow }) {
  if (row.state === 'done') {
    return (
      <span className={cx(styles.state, styles.done)}>
        <CheckIcon size={14} strokeWidth={2.6} />
        <span>{row.version}</span>
      </span>
    );
  }
  if (row.state === 'current')
    return <span className={cx(styles.state, styles.now)}>in Arbeit</span>;
  return <span className={cx(styles.state, styles.planned)}>ab {row.version}</span>;
}

/**
 * Entwicklungsstand: die Meilensteine M0 bis M11 mit ihrer Version, damit sich sehen lässt, wie
 * weit Juri ist. Zugeklappt eine Zeile mit Balken; aufgeklappt die Liste. Folgt der Version der App
 * (domain/roadmap), ohne weitere Pflege.
 */
export function Entwicklungsstand({ version = BUILD.version }: { version?: string }) {
  const stand = roadmap(version);
  return (
    <section className={styles.section} aria-labelledby="stand">
      <h2 id="stand" className={styles.label}>
        Entwicklungsstand
      </h2>
      <details className={styles.box}>
        <summary className={styles.summary}>
          <span className={styles.head}>
            <span className={styles.text}>{stand.summary}</span>
            <span className={styles.version}>Version {version}</span>
          </span>
          <span
            className={styles.track}
            role="progressbar"
            aria-label="Entwicklungsstand"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stand.percent}
          >
            <span className={styles.fill} style={{ width: `${stand.percent}%` }} />
          </span>
          <span className={styles.more} aria-hidden="true" />
        </summary>
        <ol className={styles.list}>
          {stand.rows.map((row) => (
            <li
              key={row.id}
              className={cx(styles.row, row.state === 'current' && styles.rowNow)}
              aria-current={row.state === 'current' ? 'step' : undefined}
            >
              <span className={styles.id}>{row.id}</span>
              <span className={styles.title}>{row.title}</span>
              <State row={row} />
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
