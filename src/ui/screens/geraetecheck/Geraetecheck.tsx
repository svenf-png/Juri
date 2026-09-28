import { useState, type ChangeEvent, type ReactNode } from 'react';
import { QUESTIONS, SECTIONS, type Answer, type CheckStatus } from '@/features/geraetecheck/report';
import { SHARE_VARIANTS } from '@/features/geraetecheck/testFiles';
import { useDeviceCheck } from '@/features/geraetecheck/useDeviceCheck';
import { Button } from '../../components/Button';
import { BackLink, Screen, ScreenTitle } from '../../components/Screen';
import { Segmented } from '../../components/Segmented';
import { cx } from '../../cx';
import styles from './Geraetecheck.module.css';

const CHIP: Record<CheckStatus, string> = {
  ok: 'OK',
  hinweis: 'Hinweis',
  fehlt: 'Fehlt',
  info: 'Info',
  läuft: 'Läuft',
};

const ANSWERS = [
  { value: 'offen', label: 'Offen' },
  { value: 'ja', label: 'Ja' },
  { value: 'nein', label: 'Nein' },
] as const satisfies readonly { value: Answer; label: string }[];

function FilePick({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept?: string;
  onFile: (file: File) => void;
}) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };
  return (
    <label className={styles.fileLabel}>
      {label}
      <input
        className={styles.fileInput}
        type="file"
        {...(accept ? { accept } : {})}
        onChange={onChange}
      />
    </label>
  );
}

export function Geraetecheck() {
  const { results, answers, surfaceOn, report, actions, exportActions } =
    useDeviceCheck(__JURI_INSTANCE__);
  const [feedback, setFeedback] = useState('');
  const standalone = results.standalone?.value === 'ja';

  const sectionActions: Partial<Record<string, ReactNode>> = {
    speicher: (
      <Button variant="ink" size="sm" onClick={() => void actions.requestPersist()}>
        persist() anfordern
      </Button>
    ),
    datenbank: (
      <Button variant="ink" size="sm" onClick={() => void actions.runBlobTest()}>
        50-MB-Test starten
      </Button>
    ),
    marker: (
      <>
        <Button variant="ink" size="sm" onClick={() => void actions.setMarker()}>
          Marker setzen
        </Button>
        <Button variant="soft" size="sm" onClick={() => void actions.clearMarker()}>
          Marker löschen
        </Button>
      </>
    ),
    teilen: SHARE_VARIANTS.map((v) => (
      <Button key={v.id} variant="soft" size="sm" onClick={() => void actions.share(v.id)}>
        Teilen: {v.label}
      </Button>
    )),
    dateien: (
      <>
        <FilePick
          label="Datei wählen (ohne Filter)"
          onFile={(f) => void actions.inspectFile(f, false)}
        />
        <FilePick
          label="Datei wählen (Filter .juri)"
          accept=".juri"
          onFile={(f) => void actions.inspectFile(f, true)}
        />
      </>
    ),
    bilder: (
      <FilePick label="Foto wählen" accept="image/*" onFile={(f) => void actions.inspectImage(f)} />
    ),
    kalender: (
      <>
        <Button variant="ink" size="sm" onClick={() => actions.icsDownload()}>
          Termin öffnen
        </Button>
        <Button variant="soft" size="sm" onClick={() => void actions.icsShare()}>
          Termin teilen
        </Button>
      </>
    ),
    statusleiste: (
      <Button
        variant={surfaceOn ? 'soft' : 'ink'}
        size="sm"
        onClick={() => actions.toggleSurface()}
        aria-pressed={surfaceOn}
      >
        {surfaceOn ? 'Lern-Fläche aus' : 'Lern-Fläche an'}
      </Button>
    ),
  };

  return (
    <Screen>
      <BackLink to="/" label="Start" />
      <ScreenTitle lead="Prüft, was dein iPhone oder iPad für Juri kann. Manche Punkte brauchen einen Tipp von dir. Am Ende „Ergebnisse kopieren“ und an Claude schicken.">
        Geräte-Check
      </ScreenTitle>

      {!standalone && results.standalone ? (
        <p className={styles.notice} role="note">
          Für aussagekräftige Ergebnisse „Juri Test“ zum Home-Bildschirm hinzufügen und von dort
          öffnen. Safari und die installierte App haben getrennte Speicher.
        </p>
      ) : null}

      {SECTIONS.map((section) => {
        const rows = Object.entries(results).filter(([, r]) => r.section === section.id);
        const questions = QUESTIONS.filter((q) => q.section === section.id);
        const extra = sectionActions[section.id];
        return (
          <section key={section.id} className={styles.section} aria-labelledby={`gc-${section.id}`}>
            <h2 id={`gc-${section.id}`} className={styles.sectionTitle}>
              {section.title}
            </h2>
            <p className={styles.intro}>{section.intro}</p>
            {extra ? <div className={styles.actions}>{extra}</div> : null}
            {rows.length > 0 ? (
              <div className={styles.rows}>
                {rows.map(([id, r]) => (
                  <div key={id} className={styles.row} data-testid={`check-${id}`}>
                    <div className={styles.rowText}>
                      <span className={styles.rowLabel}>{r.label}</span>
                      <span className={styles.rowValue}>{r.value}</span>
                    </div>
                    <span className={cx(styles.chip, styles[r.status])}>{CHIP[r.status]}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {questions.map((q) => (
              <div key={q.id} className={styles.question}>
                <span>{q.question}</span>
                <Segmented
                  label={q.question}
                  options={ANSWERS}
                  value={answers[q.id] ?? 'offen'}
                  onChange={(a) => actions.setAnswer(q.id, a)}
                />
              </div>
            ))}
          </section>
        );
      })}

      <section className={styles.section} aria-labelledby="gc-bericht">
        <h2 id="gc-bericht" className={styles.sectionTitle}>
          Bericht
        </h2>
        <pre className={styles.report} data-testid="report">
          {report}
        </pre>
      </section>

      <div className={styles.export}>
        <Button
          variant="primary"
          block
          onClick={() =>
            void exportActions
              .copy()
              .then((ok) => setFeedback(ok ? 'Kopiert.' : 'Kopieren nicht möglich, bitte teilen.'))
          }
        >
          Ergebnisse kopieren
        </Button>
        <Button
          variant="soft"
          size="md"
          block
          onClick={() => void exportActions.share().then((o) => setFeedback(`Teilen: ${o}`))}
        >
          Als Datei teilen
        </Button>
        <p className={styles.feedback} aria-live="polite">
          {feedback}
        </p>
      </div>
    </Screen>
  );
}
