import type { CSSProperties } from 'react';
import { BUILD, buildLabel } from '@/app/build';
import { instanceById } from '@/app/instance';
import type { ProfileData } from '@/features/app/appData';
import { AppIconMark } from '../../components/AppIconMark';
import { AvatarLink } from '../../components/Avatar';
import { ButtonAnchor, ButtonLink } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Wordmark } from '../../components/Wordmark';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import styles from './Start.module.css';

const MILESTONES = 12;
const DONE = 2;

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

/** Übergangs-Startseite bis zum Heute-Screen (M2); Kopfzeile wie Main.dc.html. */
export function Start({ data }: { data: ProfileData }) {
  const isTest = __JURI_INSTANCE__ === 'test';
  return (
    <Screen className={styles.start}>
      <header className={styles.top}>
        <span className={styles.hello}>Hallo, {data.profile.name}</span>
        <AvatarLink name={data.profile.name} />
      </header>
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
          Meilenstein M1: Daten, Profil, Backup
        </h2>
        <p className={styles.cardText}>
          Dein Profil liegt sicher auf diesem Gerät, Backups findest du in den Einstellungen. Karten
          und Stapel kommen mit M3.
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
        <ButtonLink to="/einstellungen" variant="primary" block>
          <span>Einstellungen und Backup</span>
          <Arrow />
        </ButtonLink>
        <ButtonLink to="/styleguide" variant="soft" size="md" block>
          Styleguide ansehen
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
