import { AppIconMark } from '../../components/AppIconMark';
import { ButtonLink } from '../../components/Button';
import { Screen } from '../../components/Screen';
import styles from './Installieren.module.css';

const STEPS: { title: string; sub?: string }[] = [
  { title: 'In Safari auf „Teilen“ tippen', sub: 'Je nach Ansicht zuerst auf „•••“.' },
  {
    title: '„Zum Home-Bildschirm“ wählen',
    sub: 'Fehlt der Eintrag, in der Liste nach unten blättern.',
  },
  { title: '„Hinzufügen“ tippen und Juri über das neue Symbol öffnen' },
];

/**
 * Install-Anleitung im Safari-Tab (Installieren.dc.html, A13). Schritte nach Apple Support,
 * „Turn a website into an app in Safari on iPhone“.
 */
export function Installieren() {
  const isTest = __JURI_INSTANCE__ === 'test';
  return (
    <Screen className={styles.screen}>
      <AppIconMark size={72} variant={isTest ? 'test' : 'app'} />
      <h1 className={styles.title}>
        Erst installieren, <br />
        dann lernen.
      </h1>
      <p className={styles.lead}>
        Juri läuft als App vom Home-Bildschirm: im Vollbild, offline und mit dauerhaftem Speicher.
      </p>
      <ol className={styles.steps}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.text}>
              <span className={styles.stepTitle}>{step.title}</span>
              {step.sub ? <span className={styles.sub}>{step.sub}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <section className={styles.why} aria-labelledby="warum">
        <h2 id="warum" className={styles.whyLabel}>
          Warum?
        </h2>
        <p className={styles.whyText}>
          Safari und die App auf dem Home-Bildschirm haben getrennte Speicher. Karten aus dem
          Browser fehlen später in der App, deshalb legt Juri hier nichts an.
        </p>
      </section>
      {isTest ? (
        <ButtonLink to="/geraetecheck" variant="ink" size="md" block>
          Geräte-Check im Browser starten
        </ButtonLink>
      ) : null}
    </Screen>
  );
}
