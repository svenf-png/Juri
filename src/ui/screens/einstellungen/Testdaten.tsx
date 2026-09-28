import { useState } from 'react';
import { loadDemoDecks, loadDemoProfile, resetAllData } from '@/features/demo/demo';
import { Button } from '../../components/Button';
import styles from './Einstellungen.module.css';

/** Testdaten-Menü der Testinstanz (Entscheidung 10): Demo-Stapel, Demo-Profil oder alles löschen. */
export function Testdaten() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
            setBusy(true);
            setMessage(null);
            void loadDemoDecks()
              .then((added) => {
                setMessage(
                  added.decks === 0
                    ? 'Alle Demo-Stapel sind schon da.'
                    : `${String(added.decks)} Stapel mit ${String(added.cards)} Karten hinzugefügt.`,
                );
              })
              .finally(() => {
                setBusy(false);
              });
          }}
        >
          Demo-Stapel hinzufügen
        </Button>
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
      {message ? (
        <p className={styles.help} role="status">
          {message}
        </p>
      ) : null}
      <p className={styles.help}>
        Die Demo-Stapel kommen zu deinen Daten dazu (5 Stapel, 35 Karten, Inhalte in testdaten/).
        Nur in der Testinstanz, die echte App bleibt unberührt.
      </p>
    </section>
  );
}
