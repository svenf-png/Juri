import type { CSSProperties } from 'react';
import { BUILD, buildLabel } from '@/app/build';
import { instanceById } from '@/app/instance';
import { AppIconMark } from '../../components/AppIconMark';
import { ButtonAnchor, ButtonLink } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Wordmark } from '../../components/Wordmark';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import styles from './Start.module.css';

const MILESTONES = 12;
const DONE = 1;

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` };
}

function Arrow() {
  return (
    <svg
      className={styles.arrow}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Übergangs-Startseite bis zum Heute-Screen (M2). */
export function Start() {
  const isTest = __JURI_INSTANCE__ === 'test';
  return (
    <Screen className={styles.start}>
      <div className={styles.hero}>
        <div className={rise.rise}>
          <AppIconMark size={88} variant={isTest ? 'test' : 'app'} />
        </div>
        <div className={rise.rise} style={delay(0.05)}>
          <Wordmark size={72} />
        </div>
        <p className={cx(styles.tagline, rise.rise)} style={delay(0.1)}>
          Karteikarten für das <em>Referendariat.</em> Ruhig, klar, nur auf deinem Gerät.
        </p>
      </div>

      <section className={cx(styles.card, rise.rise)} style={delay(0.16)} aria-labelledby="stand">
        <span className={styles.label}>Im Aufbau</span>
        <h2 id="stand" className={styles.cardTitle}>
          Meilenstein M0: Fundament
        </h2>
        <p className={styles.cardText}>
          Juri entsteht Schritt für Schritt. Farben, Schrift und Bewegung sind schon da.
        </p>
        <div
          className={styles.steps}
          role="img"
          aria-label={`${DONE} von ${MILESTONES} Meilensteinen`}
        >
          {Array.from({ length: MILESTONES }, (_, i) => (
            <span
              key={i}
              className={cx(styles.step, i < DONE && styles.stepDone)}
              style={delay(0.3 + i * 0.03)}
            />
          ))}
        </div>
      </section>

      <div className={cx(styles.actions, rise.rise)} style={delay(0.22)}>
        <ButtonLink to="/styleguide" variant="primary" block>
          <span>Styleguide ansehen</span>
          <Arrow />
        </ButtonLink>
        {isTest ? (
          <ButtonLink to="/geraetecheck" variant="ink" size="md" block>
            Geräte-Check starten
          </ButtonLink>
        ) : (
          <ButtonAnchor href={instanceById('test').base} variant="soft" size="md" block>
            Testinstanz öffnen
          </ButtonAnchor>
        )}
      </div>

      <p className={styles.footer}>
        {isTest ? 'Juri Test' : 'Juri'} · Version {buildLabel(BUILD)}
      </p>
    </Screen>
  );
}
