import { Link } from 'react-router';
import type { FertigModel } from '@/domain/progress/celebrate';
import { Celebration } from '../../components/Celebration';
import { WeekStrip } from '../../components/WeekStrip';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import { BadgeIcon } from '../erfolge/BadgeIcon';
import styles from './Fertig.module.css';

/**
 * Feier „Tagesziel erreicht.“ (Fertig.dc.html) als Ansicht eines FertigModel. „Erfolge ansehen“
 * führt nach Erfolge, „Fertig“ zurück zu dem, was den Ort der Session ausmacht.
 */
export function Fertig({
  model,
  onDone,
  onErfolge,
}: {
  model: FertigModel;
  onDone: () => void;
  /** Wird vor dem Wechsel nach Erfolge aufgerufen (Meilenstein als gefeiert markieren). */
  onErfolge?: (() => void) | undefined;
}) {
  return (
    <main className={styles.fertig} aria-label="Tagesziel erreicht">
      <Celebration size={150} label="Tagesziel erreicht" />
      <div className={styles.text}>
        <h1 className={cx('display', styles.title, rise.rise)}>Tagesziel erreicht.</h1>
        <p className={cx(styles.lead, rise.rise)}>{model.summary}</p>
      </div>

      <div className={cx(styles.week, rise.rise)}>
        <WeekStrip days={model.week} />
        <p className={styles.caption}>{model.caption}</p>
      </div>

      {model.milestone ? (
        <section className={cx(styles.milestone, rise.rise)} aria-label="Neuer Meilenstein">
          <span className={styles.milestoneIcon}>
            <BadgeIcon icon={model.milestone.icon} size={26} />
          </span>
          <span className={styles.milestoneText}>
            <span className={styles.milestoneEyebrow}>Neuer Meilenstein</span>
            <span className={styles.milestoneName}>{model.milestone.name}</span>
            {model.moreMilestones > 0 ? (
              <span className={styles.milestoneMore}>
                und {model.moreMilestones} weitere in Erfolge
              </span>
            ) : null}
          </span>
        </section>
      ) : null}

      <div className={styles.actions}>
        <Link to="/erfolge" className={cx(styles.primary, tap.tap)} onClick={onErfolge}>
          Erfolge ansehen
        </Link>
        <button type="button" className={cx(styles.secondary, tap.tap)} onClick={onDone}>
          Fertig
        </button>
      </div>
    </main>
  );
}
