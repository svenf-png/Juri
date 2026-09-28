import { useState } from 'react';
import { loadDemoProfile, resetAllData } from '@/features/demo/demo';
import { Button } from '../../components/Button';
import styles from './Einstellungen.module.css';

/** Testdaten-Menü der Testinstanz (Entscheidung 10): Demo-Profil laden oder alles löschen. */
export function Testdaten() {
  const [busy, setBusy] = useState(false);

  function run(question: string, task: () => Promise<void>) {
    if (!window.confirm(question)) return;
    setBusy(true);
    void task().finally(() => {
      setBusy(false);
    });
  }

  return (
    <section className={styles.section} aria-labelledby="testdaten">
      <h2 id="testdaten" className={styles.sectionLabel}>
        Testdaten
      </h2>
      <div className={styles.buttons}>
        <Button
          variant="soft"
          size="md"
          block
          disabled={busy}
          onClick={() => {
            run('Demo-Profil laden? Alle Daten der Testinstanz werden ersetzt.', loadDemoProfile);
          }}
        >
          Demo-Profil laden
        </Button>
        <Button
          variant="outline"
          size="md"
          block
          disabled={busy}
          onClick={() => {
            run('Alle Daten der Testinstanz löschen?', resetAllData);
          }}
        >
          Alles zurücksetzen
        </Button>
      </div>
      <p className={styles.help}>Nur in der Testinstanz. Die echte App bleibt unberührt.</p>
    </section>
  );
}
