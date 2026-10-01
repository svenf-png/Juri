import { lazy, Suspense, useState, type CSSProperties, type SyntheticEvent } from 'react';
import { normalizeName } from '@/domain/profile/name';
import { completeOnboarding } from '@/features/profile/profile';
import { AppIconMark } from '../../components/AppIconMark';
import { Button } from '../../components/Button';
import field from '../../components/Field.module.css';
import { Screen } from '../../components/Screen';
import { useMediaQuery } from '../../useMediaQuery';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import styles from './Onboarding.module.css';

// Nur in der Testinstanz; der Build der echten App enthält den Demo-Knopf nicht.
const DemoStart =
  __JURI_INSTANCE__ === 'test'
    ? lazy(() => import('./DemoStart').then((m) => ({ default: m.DemoStart })))
    : null;

function delay(seconds: number): CSSProperties {
  return { animationDelay: `${seconds}s` };
}

/**
 * Onboarding nach Onboarding.dc.html. Nach dem Sichern wechselt der Routen-Wächter von selbst
 * zur Startseite, sobald das Profil in der Datenbank steht.
 */
export function Onboarding() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = normalizeName(name) !== '';
  // Desktop-Gestaltung (ADR-017): Fläche in Violett links, Formular rechts.
  const desktop = useMediaQuery('(min-width: 1280px)');

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding(name);
    } catch {
      setError('Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.');
      setBusy(false);
    }
  }

  const mark = <AppIconMark size={72} variant={__JURI_INSTANCE__ === 'test' ? 'test' : 'app'} />;
  const lead = (
    <>
      <span className={styles.claim}>Karteikarten für das Referendariat.</span>{' '}
      <span className={styles.sub}>Alles bleibt auf deinem Gerät, ohne Konto und ohne Server.</span>
    </>
  );

  const form = (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      {desktop ? null : <div className={rise.rise}>{mark}</div>}
      <h1 className={cx(styles.title, rise.rise)} style={delay(0.05)}>
        Willkommen <br />
        bei <span className={styles.accent}>Juri.</span>
      </h1>
      {desktop ? null : (
        <p className={cx(styles.lead, rise.rise)} style={delay(0.1)}>
          {lead}
        </p>
      )}
      <label className={cx(field.field, rise.rise)} style={delay(0.16)}>
        <span className={field.label}>Wie heißt du?</span>
        <input
          className={field.input}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Vorname"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="done"
          spellCheck={false}
          maxLength={80}
          aria-describedby="name-hinweis"
        />
      </label>
      <p id="name-hinweis" className={styles.hint}>
        Dein Name steht nur auf diesem Gerät und in Dateien, die du selbst teilst.
      </p>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" block disabled={!valid || busy}>
          <span>Los geht’s</span>
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
        </Button>
        {DemoStart ? (
          <Suspense fallback={null}>
            <DemoStart />
          </Suspense>
        ) : null}
      </div>
    </form>
  );

  if (desktop) {
    return (
      <main className={styles.split}>
        <div className={styles.panel}>
          {mark}
          <p className={styles.panelLead}>{lead}</p>
        </div>
        <div className={styles.formSide}>{form}</div>
      </main>
    );
  }

  return <Screen className={styles.screen}>{form}</Screen>;
}
