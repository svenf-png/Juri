import { lazy, Suspense, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { BUILD, buildLabel } from '@/app/build';
import { formatBytes } from '@/domain/format/bytes';
import { normalizeName } from '@/domain/profile/name';
import type { AppData, ProfileData } from '@/features/app/appData';
import {
  applyBackup,
  backupErrorMessage,
  backupStatus,
  createBackupFile,
  readBackupFile,
  saveBackupFile,
  type BackupPreview,
} from '@/features/backup/backup';
import { renameProfile } from '@/features/profile/profile';
import { useStorageStatus } from '@/features/storage/useStorageStatus';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import field from '../../components/Field.module.css';
import { BackLink, Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
import styles from './Einstellungen.module.css';
import { Entwicklung } from './Entwicklung';

// Nur in der Testinstanz; der Build der echten App enthält das Testdaten-Menü nicht.
const Testdaten =
  __JURI_INSTANCE__ === 'test'
    ? lazy(() => import('./Testdaten').then((m) => ({ default: m.Testdaten })))
    : null;

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

/** Einstellungen nach Profil.dc.html: Profil, Speicher, Backup (Sheets: BackupExport, BackupImport). */
export function Einstellungen({ data }: { data: ProfileData }) {
  return (
    <Screen className={styles.screen}>
      <BackLink to="/" label="Heute" />
      <h1 className={styles.title}>Einstellungen</h1>
      <ProfileForm key={data.profile.name} name={data.profile.name} />
      <StorageSection />
      <BackupSection data={data} />
      {Testdaten ? (
        <Suspense fallback={null}>
          <Testdaten />
        </Suspense>
      ) : null}
      <Entwicklung />
      <p className={styles.footer}>
        {__JURI_INSTANCE__ === 'test' ? 'Juri Test' : 'Juri'} · Version {buildLabel(BUILD)}
      </p>
    </Screen>
  );
}

function ProfileForm({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const cleaned = normalizeName(value);
  const changed = cleaned !== '' && cleaned !== name;

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    if (!changed) return;
    try {
      await renameProfile(cleaned);
    } catch {
      setError('Das Speichern hat nicht geklappt.');
    }
  }

  return (
    <form className={styles.profile} onSubmit={(e) => void submit(e)}>
      <Avatar name={cleaned || name} size={56} />
      <div className={cx(field.field, styles.nameField)}>
        <label className={styles.nameText}>
          <span className={field.label}>Name</span>
          <input
            className={field.input}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="done"
            spellCheck={false}
            maxLength={80}
          />
        </label>
        {changed ? (
          <button type="submit" className={styles.save}>
            <span className={styles.saveFace}>Sichern</span>
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

function StorageSection() {
  const { status, request } = useStorageStatus();
  const persisted =
    status === null
      ? '…'
      : status.persisted === null
        ? 'Unbekannt'
        : status.persisted
          ? 'Ja'
          : 'Nein';
  const used =
    status === null
      ? '…'
      : status.usage !== null && status.quota !== null
        ? `${formatBytes(status.usage)} von ${formatBytes(status.quota)}`
        : 'Unbekannt';
  return (
    <section className={styles.section} aria-labelledby="speicher">
      <h2 id="speicher" className={styles.sectionLabel}>
        Speicher
      </h2>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Dauerhaft gespeichert</dt>
          <dd className={status?.persisted ? styles.accent : undefined} data-testid="persisted">
            {persisted}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Belegt</dt>
          <dd data-testid="usage">{used}</dd>
        </div>
      </dl>
      {status?.persisted === false ? (
        <Button variant="soft" size="sm" onClick={() => void request()}>
          Dauerhaft speichern anfordern
        </Button>
      ) : null}
      <p className={styles.help}>
        Dauerhaft gespeicherte Daten löscht iOS nicht von sich aus, um Platz zu schaffen. Gegen das
        Löschen der App oder den Verlust des Geräts hilft nur ein Backup.
      </p>
    </section>
  );
}

function BackupSection({ data }: { data: AppData }) {
  const [now] = useState(Date.now);
  const { label, due } = backupStatus(data.meta, now);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      setMessage({ text: backupErrorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (picked) await run(async () => setPreview(await readBackupFile(picked)));
  }

  return (
    <section className={styles.section} aria-labelledby="backup">
      <h2 id="backup" className={styles.sectionLabel}>
        Backup
      </h2>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt className={styles.rowText}>
            Letztes Backup
            {due ? <span className={styles.due}>Zeit für ein neues Backup</span> : null}
          </dt>
          <dd data-testid="last-backup">{label}</dd>
        </div>
      </dl>
      <div className={styles.buttons}>
        <Button
          variant="ink"
          size="md"
          block
          disabled={busy}
          onClick={() => void run(async () => setFile(await createBackupFile()))}
        >
          Backup erstellen
        </Button>
        <Button
          variant="outline"
          size="md"
          block
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Backup einspielen
        </Button>
        {/* Ohne accept-Filter, sonst graut iOS die Datei aus (A10). */}
        <input
          ref={input}
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onFile(e)}
        />
      </div>
      {message ? (
        <p
          role={message.error ? 'alert' : 'status'}
          className={message.error ? styles.error : styles.success}
        >
          {message.text}
        </p>
      ) : null}
      <p className={styles.help}>
        Tipp: Beim Teilen „In Dateien sichern“ wählen. Dann liegt das Backup in iCloud Drive und
        hilft auch auf einem neuen Gerät.
      </p>

      <Sheet
        open={file !== null}
        onClose={() => {
          setFile(null);
        }}
        eyebrow="Backup bereit"
        title={file?.name ?? ''}
      >
        <p className={styles.sheetText}>
          {formatBytes(file?.size ?? 0)} mit Profil und allen Daten. Im nächsten Schritt „In Dateien
          sichern“ wählen, dann liegt es in iCloud Drive.
        </p>
        <Button
          variant="primary"
          block
          className={styles.sheetAction}
          onClick={() => {
            if (!file) return;
            void run(async () => {
              try {
                // Abgebrochen: Sheet bleibt offen für einen neuen Versuch.
                if ((await saveBackupFile(file)) === 'abgebrochen') return;
                setMessage({ text: 'Backup gesichert.', error: false });
              } catch (error) {
                setFile(null);
                throw error;
              }
              setFile(null);
            });
          }}
        >
          Sichern oder teilen
        </Button>
        <Button variant="ghost" size="md" block onClick={() => setFile(null)}>
          Abbrechen
        </Button>
      </Sheet>

      <Sheet
        open={preview !== null}
        onClose={() => {
          setPreview(null);
        }}
        eyebrow="Backup einspielen"
        title="Alle Daten durch das Backup ersetzen?"
      >
        <dl className={styles.facts}>
          <div>
            <dt>Profil</dt>
            <dd>{preview?.profileName}</dd>
          </div>
          <div>
            <dt>Erstellt</dt>
            <dd>{preview ? dateTime.format(preview.createdAt) : ''}</dd>
          </div>
          {preview?.instance === 'test' ? (
            <div>
              <dt>Aus</dt>
              <dd>Juri Test</dd>
            </div>
          ) : null}
        </dl>
        <p className={styles.sheetText}>
          Was jetzt auf diesem Gerät ist, wird ersetzt. Das lässt sich nicht rückgängig machen.
        </p>
        <Button
          variant="ink"
          block
          className={styles.sheetAction}
          disabled={busy}
          onClick={() => {
            if (!preview) return;
            setPreview(null);
            void run(async () => {
              await applyBackup(preview);
              setMessage({ text: 'Backup eingespielt.', error: false });
            });
          }}
        >
          Einspielen
        </Button>
        <Button variant="ghost" size="md" block onClick={() => setPreview(null)}>
          Abbrechen
        </Button>
      </Sheet>
    </section>
  );
}
