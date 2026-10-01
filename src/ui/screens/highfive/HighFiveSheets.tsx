import { useState } from 'react';
import type { ContactView } from '@/domain/highfive/view';
import { Button } from '../../components/Button';
import { ChevronRightIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import sheets from '../stapel/Sheets.module.css';
import styles from './HighFive.module.css';

/** Bildkarte-Vorschau: das PNG, das Canvas gezeichnet hat, und die Wege, es zu verschicken. */
export function CardSheet({
  url,
  alt,
  shareLabel,
  canGreet,
  busy,
  note,
  onShare,
  onGreeting,
  onClose,
}: {
  /** Objekt-URL des PNG; `null`, solange die Karte entsteht. */
  url: string | null;
  alt: string;
  shareLabel: string;
  /** Es gibt eine Gruß-Datei (nur mit Kontakt). */
  canGreet: boolean;
  busy: boolean;
  note: { text: string; error: boolean } | null;
  onShare: () => void;
  onGreeting: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="High five" title="Bildkarte">
      {url ? (
        <img className={styles.cardPreview} src={url} alt={alt} />
      ) : (
        <div className={styles.cardPreview} role="img" aria-label="Bildkarte wird erstellt" />
      )}
      <p className={sheets.paraMuted}>Das Bild schickst du per Nachricht an wen du magst.</p>
      {note ? (
        <p
          className={note.error ? styles.problem : styles.hint}
          role={note.error ? 'alert' : 'status'}
        >
          {note.text}
        </p>
      ) : null}
      <Button block disabled={url === null || busy} onClick={onShare}>
        {shareLabel}
      </Button>
      {canGreet ? (
        <Button variant="soft" size="md" block disabled={busy} onClick={onGreeting}>
          Als Gruß-Datei für Juri
        </Button>
      ) : null}
      <Button variant="ghost" size="md" block onClick={onClose}>
        Zurück
      </Button>
    </Sheet>
  );
}

/** Kontaktliste („Deine Leute“): Name, Serie, zuletzt gesehen. Tippen öffnet das Bearbeiten. */
export function ContactsSheet({
  contacts,
  onEdit,
  onClose,
}: {
  contacts: readonly ContactView[];
  onEdit: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} title="Deine Leute" titled>
      <div className={styles.contactList}>
        {contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cx(styles.contactRow, tap.tap)}
            onClick={() => {
              onEdit(c.id);
            }}
          >
            <span className={styles.avatar} aria-hidden="true">
              {c.initial}
            </span>
            <span className={styles.contactText}>
              <span className={styles.contactName}>{c.name}</span>
              <span className={styles.contactSub}>{c.sub}</span>
            </span>
            <span className={styles.chevron}>
              <ChevronRightIcon size={18} />
            </span>
          </button>
        ))}
      </div>
      <p className={sheets.paraMuted}>
        Die Namen kommen aus den Dateien. Hier kannst du sie für dich umbenennen.
      </p>
    </Sheet>
  );
}

/** Kontakt bearbeiten: für dich umbenennen oder entfernen. */
export function ContactSheet({
  contact,
  busy,
  failed,
  onSave,
  onRemove,
  onBack,
}: {
  contact: ContactView;
  busy: boolean;
  failed: boolean;
  onSave: (name: string) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(contact.name);
  return (
    <Sheet open onClose={onBack} title="Kontakt" titled onEscape={onBack}>
      <TextField label="Name" value={name} onChange={setName} maxLength={40} enterKeyHint="done" />
      <p className={styles.hint}>
        {contact.renamed
          ? `Gesendet als „${contact.sentName}“. Leer lassen, um diesen Namen zu nehmen.`
          : `So hat sich die Person in ihrer Datei genannt.`}
      </p>
      {failed ? (
        <p className={styles.problem} role="alert">
          Das hat nicht geklappt. Deine Daten sind unverändert.
        </p>
      ) : null}
      <Button
        block
        disabled={busy}
        onClick={() => {
          onSave(name);
        }}
      >
        Speichern
      </Button>
      <Button variant="ghost" size="md" block disabled={busy} onClick={onRemove}>
        Kontakt entfernen
      </Button>
    </Sheet>
  );
}

/** Gruß-Datei empfangen: wer schickt was, danach „Annehmen“. */
export function GreetingSheet({
  initial,
  name,
  text,
  hint,
  busy,
  failed,
  onAccept,
  onClose,
}: {
  initial: string;
  name: string;
  /** „Mara schickt dir ein High five für 12 Tage in Folge.“ */
  text: string;
  /** Zusatz, z. B. „Mara kommt zu deinen Kontakten.“ */
  hint: string | null;
  busy: boolean;
  failed: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="High five" title="Gruß-Datei">
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {initial}
        </span>
        <div className={styles.whoText}>
          <span className={styles.whoName}>{name}</span>
          <span className={styles.whoMeta}>Gruß-Datei</span>
        </div>
      </div>
      <p className={sheets.para}>{text}</p>
      {hint ? <p className={sheets.paraMuted}>{hint}</p> : null}
      {failed ? (
        <p className={styles.problem} role="alert">
          Das hat nicht geklappt. Deine Daten sind unverändert.
        </p>
      ) : null}
      <Button block disabled={busy} onClick={onAccept}>
        Annehmen
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

/** Gruß-Datei nicht angenommen: der Grund in einem Satz, es wurde nichts verändert. */
export function GreetingErrorSheet({
  message,
  onOpenFile,
  onClose,
}: {
  message: string;
  onOpenFile: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="High five" title="Datei nicht angenommen">
      <p className={styles.problem} role="alert">
        {message}
      </p>
      <p className={sheets.paraMuted}>Es wurde nichts verändert.</p>
      <Button block onClick={onOpenFile}>
        Andere Datei wählen
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Schließen
      </Button>
    </Sheet>
  );
}
