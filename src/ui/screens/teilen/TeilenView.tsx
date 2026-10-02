import { Link } from 'react-router';
import type { IncomingView } from '@/domain/juri/text';
import { ChevronRightIcon, ShareIcon } from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { Screen } from '../../components/Screen';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './Teilen.module.css';

export type ImportMode = 'update' | 'copy';

export type ExportModel =
  /** Es gibt noch keinen Stapel. */
  | { kind: 'empty' }
  | {
      kind: 'ready';
      fileName: string;
      /** „21 Karten · 3 PDFs · 2,4 MB“ oder „Wird vorbereitet …“ */
      summary: string;
      /** „Amtshaftung · ZR“ oder „3 Stapel“; leer, wenn nichts gewählt ist. */
      deckLabel: string;
      notes: boolean;
      achievements: boolean;
      /** Beschriftung des Knopfes, z. B. „AirDrop, Nachrichten, Mail …“. */
      action: string;
      /** Knopf bedienbar: Datei ist fertig. */
      canSend: boolean;
      /** Rückmeldung nach dem Teilen oder ein Fehler. */
      note?: { text: string; error: boolean } | null;
    };

export type IncomingModel =
  | { kind: 'idle'; hint: string }
  | {
      kind: 'preview';
      view: IncomingView;
      mode: ImportMode;
      updateHint: string;
      copyHint: string;
      /** Nichts zu importieren. */
      nothing: string | null;
      busy: boolean;
    }
  | { kind: 'error'; message: string };

export interface TeilenViewProps {
  export: ExportModel;
  incoming: IncomingModel;
  onPickDecks: () => void;
  onToggleNotes: () => void;
  onToggleAchievements: () => void;
  onSend: () => void;
  onOpenFile: () => void;
  onHelp: () => void;
  onMode: (mode: ImportMode) => void;
  onImport: () => void;
}

function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={cx(styles.switch, tap.tap)}
      onClick={onToggle}
    >
      <span className={styles.switchText}>{label}</span>
      <span className={cx(styles.track, on && styles.trackOn)}>
        <span className={cx(styles.knob, on && styles.knobOn)} />
      </span>
    </button>
  );
}

function ExportCard(props: TeilenViewProps) {
  const model = props.export;
  if (model.kind === 'empty') {
    return (
      <section className={styles.export} aria-label="Stapel teilen">
        <span className={styles.emptyTitle}>Noch nichts zu teilen</span>
        <p className={styles.emptyText}>
          Lege zuerst einen Stapel mit Karten an. Dann kannst du ihn hier als Datei weitergeben.
        </p>
        <Link to="/stapel" className={cx(styles.send, tap.tap)}>
          Zu den Stapeln
        </Link>
      </section>
    );
  }
  return (
    <section className={styles.export} aria-label="Stapel teilen">
      <div className={styles.file}>
        <span className={styles.stack} aria-hidden="true">
          <span className={styles.sheetBack} />
          <span className={styles.sheetFront}>JURI</span>
        </span>
        <div className={styles.fileText}>
          <span className={styles.fileName}>{model.fileName}</span>
          <span className={styles.fileMeta}>{model.summary}</span>
        </div>
      </div>
      <button type="button" className={cx(styles.pick, tap.tap)} onClick={props.onPickDecks}>
        <span className={styles.pickLabel}>Stapel</span>
        <span className={styles.pickValue}>
          {model.deckLabel === '' ? 'Stapel wählen' : model.deckLabel}
          <ChevronRightIcon size={16} strokeWidth={2.2} />
        </span>
      </button>
      <Switch label="Eigene Notizen mitschicken" on={model.notes} onToggle={props.onToggleNotes} />
      <Switch
        label="Erfolge mitschicken"
        on={model.achievements}
        onToggle={props.onToggleAchievements}
      />
      <div className={styles.hint}>Dein Lernfortschritt bleibt immer privat auf deinem Gerät.</div>
      <button
        type="button"
        className={cx(styles.send, tap.tap)}
        disabled={!model.canSend}
        onClick={props.onSend}
        aria-keyshortcuts="E"
      >
        <ShareIcon size={20} strokeWidth={2.2} />
        {model.action}
        <Kbd tone="dark">E</Kbd>
      </button>
      {model.note ? (
        <p className={model.note.error ? styles.error : styles.note} role="status">
          {model.note.text}
        </p>
      ) : null}
    </section>
  );
}

function Incoming(props: TeilenViewProps) {
  const model = props.incoming;
  if (model.kind === 'idle') {
    return (
      <div className={cx(styles.incoming, styles.dashed)}>
        <p className={styles.emptyText}>{model.hint}</p>
        <button
          type="button"
          className={cx(styles.go, tap.tap)}
          onClick={props.onOpenFile}
          aria-keyshortcuts="I"
        >
          Datei öffnen
          <Kbd tone="dark">I</Kbd>
        </button>
        <button type="button" className={cx(styles.textLink, tap.tap)} onClick={props.onHelp}>
          So geht&rsquo;s
        </button>
      </div>
    );
  }
  if (model.kind === 'error') {
    return (
      <div className={styles.incoming}>
        <div className={styles.who}>
          <span className={cx(styles.avatar, styles.avatarError)} aria-hidden="true">
            !
          </span>
          <div className={styles.whoText}>
            <span className={styles.whoName}>Datei nicht importiert</span>
            <span className={styles.whoMeta}>Es wurde nichts verändert.</span>
          </div>
        </div>
        <p className={styles.error} role="alert">
          {model.message}
        </p>
        <button type="button" className={cx(styles.outline, tap.tap)} onClick={props.onOpenFile}>
          Andere Datei wählen
        </button>
        <button type="button" className={cx(styles.textLink, tap.tap)} onClick={props.onHelp}>
          So geht&rsquo;s
        </button>
      </div>
    );
  }
  const options: { mode: ImportMode; title: string; sub: string }[] = [
    { mode: 'update', title: 'Aktualisieren', sub: model.nothing ?? model.updateHint },
    { mode: 'copy', title: 'Als Kopie anlegen', sub: model.copyHint },
  ];
  return (
    <div className={styles.incoming}>
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {model.view.letter}
        </span>
        <div className={styles.whoText}>
          <span className={styles.whoName}>{model.view.title}</span>
          <span className={styles.whoMeta}>{model.view.meta}</span>
        </div>
      </div>
      <div className={styles.options} role="radiogroup" aria-label="Wie importieren?">
        {options.map((o) => {
          const on = model.mode === o.mode;
          return (
            <button
              key={o.mode}
              type="button"
              role="radio"
              aria-checked={on}
              className={cx(styles.option, on && styles.optionOn, tap.tap)}
              onClick={() => {
                props.onMode(o.mode);
              }}
            >
              <span className={cx(styles.ring, on && styles.ringOn)} />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.optionSub}>{o.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={cx(styles.go, tap.tap)}
        disabled={model.busy || (model.nothing !== null && model.mode === 'update')}
        onClick={props.onImport}
      >
        Importieren
      </button>
    </div>
  );
}

/** Teilen (`/teilen`) nach Teilen.dc.html: Stapel als Datei weitergeben, Dateien empfangen. */
export function TeilenView(props: TeilenViewProps) {
  return (
    <Screen className={styles.root}>
      <h1 className={styles.title}>Teilen</h1>
      <ExportCard {...props} />
      <div className={styles.side}>
        <div className={styles.receive}>
          <span className={styles.label}>Empfangen</span>
          <Incoming {...props} />
        </div>
        <div className={styles.footer}>
          <span className={styles.footerMuted}>Alles sichern</span>
          <Link to="/einstellungen" className={styles.footerLink}>
            Backup exportieren
          </Link>
        </div>
      </div>
    </Screen>
  );
}
