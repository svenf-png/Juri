import { Link } from 'react-router';
import type { TodayModel } from '@/domain/today/today';
import { AvatarLink } from '../../components/Avatar';
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronRightIcon,
  HighFiveIcon,
} from '../../components/icons';
import { Segments } from '../../components/Segments';
import { WeekStrip } from '../../components/WeekStrip';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import styles from './Heute.module.css';

/**
 * Heute (Main.dc.html, iPadHeute.dc.html) als reine Ansicht eines TodayModel.
 * Ein DOM für alle Breiten: unter 1100 px eine Spalte wie auf dem iPhone, ab 1100 px zwei
 * Spalten wie auf dem iPad. Fristen und High five erscheinen erst ab 768 px (nur im iPad-Design).
 * Ab 1280 px (Desktop-Gestaltung, ADR-017) bilden Kopf (`hero`), Fristen (`aside`), Gebiete und
 * Woche zwei Reihen mit zwei Spalten; darunter lösen sich die Hüllen auf (`display: contents`).
 */
export function HeuteView({ model, name }: { model: TodayModel; name: string }) {
  const { headline, chip, goal, created } = model;
  return (
    <main className={styles.heute}>
      <div className={styles.primary}>
        <div className={styles.hero}>
          <header className={styles.top}>
            <p className={styles.date}>{model.date}</p>
            <AvatarLink name={name} className={styles.avatar} />
          </header>

          <h1 className={cx('display', styles.title, rise.rise)}>
            <span className={styles.accent}>{headline.accent}</span>
            <br />
            {headline.rest}
          </h1>

          {chip ? (
            <Link to="/fristen" className={cx(styles.chipLink, tap.tap, rise.rise)}>
              <span className={styles.chip}>
                <CalendarIcon size={18} className={styles.chipIcon} />
                {chip.title} <strong className={styles.accent}>{chip.when}</strong>
              </span>
            </Link>
          ) : null}

          {goal.segments.length > 0 ? (
            <section className={cx(styles.goal, rise.rise)} aria-label="Tagesziel">
              <div className={styles.goalHead}>
                <span className={styles.muted}>Tagesziel</span>
                <span className={styles.goalCount}>
                  {goal.done} <span className={styles.muted}>von {goal.target}</span>
                </span>
              </div>
              <Segments segments={goal.segments} className={styles.segments} />
            </section>
          ) : null}

          {model.action === 'learn' ? (
            <Link to="/lernen" className={cx(styles.cta, tap.tap, rise.rise)}>
              <span>Lernen starten</span>
              <ArrowRightIcon className={styles.ctaIcon} />
            </Link>
          ) : (
            <Link to="/neu" className={cx(styles.cta, tap.tap, rise.rise)}>
              <span>Neue Karte anlegen</span>
              <ArrowRightIcon className={styles.ctaIcon} />
            </Link>
          )}
        </div>

        <section className={cx(styles.week, rise.rise)} aria-labelledby="heute-woche">
          <div className={styles.weekHead}>
            <h2 id="heute-woche" className={styles.label}>
              Letzte 7 Tage
            </h2>
            <Link
              to="/erfolge"
              className={cx(styles.erfolge, !created && styles.erfolgeOnly)}
              aria-label={created ? `${created}, Erfolge` : 'Erfolge'}
            >
              {created ? <span className={styles.pill}>{created}</span> : null}
              <span className={styles.erfolgeText}>Erfolge</span>
            </Link>
          </div>
          <WeekStrip days={model.week} />
        </section>
      </div>

      <div className={styles.secondary}>
        {model.areas.length > 0 ? (
          <section className={cx(styles.areas, rise.rise)} aria-labelledby="heute-gebiete">
            <h2 id="heute-gebiete" className={cx(styles.label, styles.areasLabel)}>
              Fällig nach Rechtsgebiet
            </h2>
            <ul className={styles.areaList}>
              {model.areas.map((area) => (
                <li key={area.id}>
                  <Link to="/stapel" className={cx(styles.area, tap.tap)}>
                    <span className={styles.code}>{area.code}</span>
                    <span className={styles.areaName}>{area.name}</span>
                    <span className={styles.areaDue}>
                      {area.due}
                      <span className={styles.dueWord}> fällig</span>
                    </span>
                    <ChevronRightIcon size={18} className={styles.chevron} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.aside}>
          {model.deadlines.length > 0 ? (
            <section className={cx(styles.deadlines, rise.rise)} aria-labelledby="heute-fristen">
              <h2 id="heute-fristen" className={styles.label}>
                Nächste Fristen
              </h2>
              {model.deadlines.map((d, i) => (
                <div key={d.id} className={cx(styles.deadline, i === 0 && styles.deadlineNext)}>
                  <span className={styles.deadlineText}>
                    <span className={styles.deadlineTitle}>{d.title}</span>
                    <span className={styles.deadlineDetail}>{d.detail}</span>
                  </span>
                  <span className={cx('display', styles.countdown)}>{d.countdown}</span>
                </div>
              ))}
            </section>
          ) : null}

          {model.highFive ? (
            <Link to="/high-fives" className={cx(styles.highFive, tap.tap, rise.rise)}>
              <span className={styles.highFiveIcon}>
                <HighFiveIcon size={22} />
              </span>
              <span className={styles.highFiveText}>
                <strong>{model.highFive.name}</strong> {model.highFive.text}
              </span>
              <span className={styles.highFiveAction}>High five</span>
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
