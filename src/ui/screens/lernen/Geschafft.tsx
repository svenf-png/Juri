import type { RatingKey } from '@/domain/scheduler/rating';
import { endSummary, plural } from '@/domain/session/present';
import type { SessionEnd } from '@/features/study/useSession';
import { Button } from '../../components/Button';
import { Celebration } from '../../components/Celebration';
import { cx } from '../../cx';
import styles from './Lernen.module.css';

const TILES: readonly { key: RatingKey; label: string; className: string }[] = [
  { key: 'again', label: 'Nochmal', className: styles.statAgain ?? '' },
  { key: 'hard', label: 'Schwer', className: styles.statHard ?? '' },
  { key: 'good', label: 'Gut', className: styles.statGood ?? '' },
  { key: 'easy', label: 'Leicht', className: styles.statEasy ?? '' },
];

/** Ende einer Session (Lernen.dc.html „Geschafft.“). */
export function Geschafft({
  end,
  back,
  onBack,
  onMore,
}: {
  end: SessionEnd;
  back: string;
  onBack: () => void;
  onMore: () => void;
}) {
  return (
    <main className={styles.done} aria-label="Geschafft">
      <div className={styles.doneInner}>
        <Celebration />
        <div className={styles.doneText}>
          <h1 className={styles.doneTitle}>Geschafft.</h1>
          <p className={styles.doneLead}>{endSummary(end)}</p>
        </div>
        <div className={styles.stats}>
          {TILES.map((tile) => (
            <div key={tile.key} className={cx(styles.stat, tile.className)}>
              <span className={styles.statNumber}>{end.counts[tile.key]}</span>
              <span className={styles.statLabel}>{tile.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.doneActions}>
          <Button variant="primary" block onClick={onBack}>
            {back}
          </Button>
          {end.stillDue > 0 ? (
            <Button variant="soft" size="md" block onClick={onMore}>
              {plural(end.stillDue, 'Karte', 'Karten')} noch einmal lernen
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
