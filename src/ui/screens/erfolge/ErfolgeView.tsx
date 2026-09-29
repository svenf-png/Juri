import { useState } from 'react';
import { Link } from 'react-router';
import type { Badge } from '@/domain/progress/milestones';
import type { ErfolgeModel } from '@/domain/progress/erfolge';
import type { Heatmap } from '@/domain/progress/heatmap';
import type { Mode } from '@/domain/progress/summary';
import { ChevronRightIcon, HighFiveIcon } from '../../components/icons';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import { BadgeIcon } from './BadgeIcon';
import styles from './Erfolge.module.css';

const RING = 2 * Math.PI * 34;
const MODES: readonly { value: Mode; label: string }[] = [
  { value: 'learn', label: 'Gelernt' },
  { value: 'make', label: 'Angelegt' },
];

/** Ring und Icon eines Abzeichens (76 px), auch für die Feier. */
export function BadgeMark({ badge, size = 76 }: { badge: Badge; size?: number }) {
  const dash = badge.done ? '0 999' : `${(RING * badge.fraction).toFixed(1)} 999`;
  return (
    <div
      className={cx(styles.mark, badge.fresh && styles.fresh)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 76 76"
        className={styles.markSvg}
        aria-hidden="true"
      >
        <circle
          cx="38"
          cy="38"
          r="34"
          fill={badge.done ? 'var(--violet)' : 'var(--bg)'}
          stroke="var(--violet-100)"
          strokeWidth="5"
        />
        <circle
          cx="38"
          cy="38"
          r="34"
          fill="none"
          stroke="var(--violet)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={dash}
          transform="rotate(-90 38 38)"
        />
      </svg>
      <div
        className={styles.markIcon}
        style={{
          width: size,
          height: size,
          color: badge.done ? 'var(--bg)' : 'var(--violet-700)',
        }}
      >
        <BadgeIcon icon={badge.icon} size={Math.round((size * 28) / 76)} />
      </div>
    </div>
  );
}

const LEVEL = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4] as const;

function Grid({ heat, weeks, label }: { heat: Heatmap; weeks: 12 | 26; label: string }) {
  const days = heat.cells.filter((c) => c.level !== null && c.level > 0).length;
  return (
    <div
      className={cx(styles.grid, weeks === 12 ? styles.gridPhone : styles.gridWide)}
      role="img"
      aria-label={`${label}, ${weeks} Wochen, ${days} Tage mit Aktivität`}
    >
      {heat.cells.map((cell, i) => {
        const week = Math.floor(i / 7);
        const delay = week * (weeks === 12 ? 0.025 : 0.015) + (i % 7) * 0.01;
        return (
          <div
            key={cell.key}
            className={cx(
              styles.cell,
              cell.level === null ? styles.future : LEVEL[cell.level],
              cell.record && styles.recordCell,
            )}
            title={cell.tip || undefined}
            style={{ animationDelay: `${delay.toFixed(3)}s` }}
          />
        );
      })}
    </div>
  );
}

/**
 * Erfolge (Erfolge.dc.html, iPadErfolge.dc.html) als reine Ansicht eines ErfolgeModel. Ein DOM
 * für alle Breiten: unter 1100 px eine Spalte mit 12 Wochen wie auf dem iPhone, ab 1100 px
 * Kennzahlen in einer Zeile und 26 Wochen wie auf dem iPad.
 */
export function ErfolgeView({
  model,
  onGoals,
}: {
  model: ErfolgeModel;
  /** Öffnet das Sheet „Tagesziele“; ohne Angabe gibt es den Knopf nicht. */
  onGoals?: (() => void) | undefined;
}) {
  const [mode, setMode] = useState<Mode>('learn');
  const heat = model.heat[mode];
  const { streak, highFives } = model;
  return (
    <main className={styles.erfolge}>
      <header className={styles.head}>
        <h1 className={cx('display', styles.title)}>Erfolge</h1>
        <p className={styles.lead}>Jede Wiederholung zählt. Jede neue Karte auch.</p>
        {onGoals ? (
          <button
            type="button"
            className={cx(styles.goalsButton, tap.tap)}
            onClick={onGoals}
            data-addition
          >
            Tagesziele
          </button>
        ) : null}
      </header>

      <div className={styles.top}>
        <section className={cx(styles.streak, rise.rise)} aria-label="Serie">
          <span className={cx('display', styles.streakNumber)}>{streak.days}</span>
          <div className={styles.streakText}>
            <span className={styles.streakUnit}>{streak.unit}</span>
            <span className={styles.streakNote}>{streak.note}</span>
            <span className={styles.streakNoteShort}>{streak.noteShort}</span>
          </div>
        </section>

        <div className={cx(styles.stats, rise.rise)} style={{ animationDelay: '0.08s' }}>
          <div className={styles.stat}>
            <span className={cx('display', styles.statValue)}>{model.reviews.value}</span>
            <span className={styles.statLabel}>{model.reviews.label}</span>
          </div>
          <div className={styles.stat}>
            <span className={cx('display', styles.statValue)}>{model.created.value}</span>
            <span className={styles.statLabel}>{model.created.label}</span>
          </div>
        </div>

        {highFives ? (
          <>
            <Link
              to="/high-fives"
              className={cx(styles.highFive, tap.tap, rise.rise)}
              style={{ animationDelay: '0.12s' }}
            >
              <span className={styles.highFiveIcon}>
                <HighFiveIcon size={22} />
              </span>
              <span className={styles.highFiveText}>
                <span className={styles.highFiveTitle}>{highFives.title}</span>
                <span className={styles.highFiveSub}>{highFives.sub}</span>
              </span>
              <ChevronRightIcon size={18} className={styles.chevron} />
            </Link>
            <Link to="/high-fives" className={cx(styles.stat, styles.highFiveTile, tap.tap)}>
              <span className={cx('display', styles.statValue)}>
                {highFives.title.split(' ')[0]}
              </span>
              <span className={styles.statLabel}>
                {highFives.title.split(' ').slice(1).join(' ')}
              </span>
            </Link>
          </>
        ) : null}
      </div>

      {model.empty ? (
        <section className={cx(styles.emptyCard, rise.rise)} aria-labelledby="erfolge-leer">
          <h2 id="erfolge-leer" className={styles.emptyTitle}>
            Noch kein Verlauf
          </h2>
          <p className={styles.emptyText}>
            Lerne Karten oder lege eine neue an. Dann füllt sich hier die Heatmap, und deine Serie
            startet.
          </p>
          <Link to="/neu" className={cx(styles.emptyAction, tap.tap)}>
            Neue Karte anlegen
          </Link>
        </section>
      ) : (
        <section className={cx(styles.heat, rise.rise)} aria-labelledby="erfolge-heat">
          <div className={styles.heatHead}>
            <h2 id="erfolge-heat" className={styles.label}>
              <span className={styles.onlyPhone}>Letzte 12 Wochen</span>
              <span className={styles.onlyWide}>Letzte 26 Wochen</span>
            </h2>
            <div className={styles.modes} role="group" aria-label="Anzeige">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={cx(styles.mode, tap.tap, mode === m.value && styles.modeOn)}
                  aria-pressed={mode === m.value}
                  onClick={() => {
                    setMode(m.value);
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.onlyPhone}>
            <Grid heat={heat.phone} weeks={12} label="Heatmap" />
          </div>
          <div className={styles.onlyWide}>
            <Grid heat={heat.wide} weeks={26} label="Heatmap" />
          </div>
          <div className={cx(styles.months, styles.onlyPhone)} aria-hidden="true">
            {heat.phone.months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className={cx(styles.months, styles.onlyWide)} aria-hidden="true">
            {heat.wide.months.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className={styles.record}>
            <span className={styles.recordSwatch} aria-hidden="true" />
            <span className={styles.recordText}>{heat.recordText}</span>
            <div className={styles.legend} role="img" aria-label="Legende: wenig bis viel">
              {LEVEL.map((cls, i) => (
                <span key={i} className={cx(styles.legendCell, cls)} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className={cx(styles.badges, rise.rise)}
        aria-labelledby="erfolge-meilensteine"
        style={{ animationDelay: '0.16s' }}
      >
        <h2 id="erfolge-meilensteine" className={styles.label}>
          Meilensteine
        </h2>
        <ul className={styles.badgeGrid}>
          {model.badges.map((badge) => (
            <li key={badge.id} className={styles.badge}>
              <BadgeMark badge={badge} />
              <span className={styles.badgeText}>
                <span className={styles.badgeName}>{badge.name}</span>
                <span className={styles.badgeSub}>{badge.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
