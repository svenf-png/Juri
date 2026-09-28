import { useRef, useState, type ReactNode } from 'react';
import { checkCard, type CardErrors, type CardFields } from '@/domain/cards/card';
import { draftToMarkup, EMPTY_DRAFT } from '@/domain/cards/clozeDraft';
import type { CreateGoal } from '@/domain/cards/goal';
import { Button } from '../../components/Button';
import { ChevronRightIcon, FileIcon, ImageIcon, TrashIcon } from '../../components/icons';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import { ClozeEditor } from './ClozeEditor';
import type { FormState, Tab } from './form';
import styles from './Erstellen.module.css';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'qa', label: 'Frage' },
  { value: 'cloze', label: 'Lücke' },
  { value: 'schema', label: 'Schema' },
  { value: 'cover', label: 'Abdeckung' },
];

const COMING: Partial<Record<Tab, { title: string; text: string }>> = {
  schema: {
    title: 'Schema-Karten kommen mit M5',
    text: 'Bis dahin lege Fragen und Lückentexte an.',
  },
  cover: {
    title: 'Abdeckungs-Karten kommen mit M6',
    text: 'Bis dahin lege Fragen und Lückentexte an.',
  },
};

export interface CardScreenProps {
  mode: 'new' | 'edit';
  initial: FormState;
  /** „Diebstahl & Betrug · SR“; `null`, solange kein Stapel gewählt ist. */
  deckLabel: string | null;
  onPickDeck: () => void;
  /**
   * Speichert die geprüften Felder: `true` gespeichert, `false` nicht gespeichert und nichts zu
   * melden (z. B. der Stapel wird erst gewählt). Wirft, wenn das Speichern scheitert.
   */
  onSubmit: (fields: CardFields) => Promise<boolean>;
  onClose: () => void;
  /** Nur beim Anlegen: Tagesziel und Meldung nach dem Speichern. */
  goal?: CreateGoal;
  toast?: ReactNode;
  /** Nur beim Bearbeiten. */
  onDelete?: () => void;
  edited?: string;
}

/**
 * Karte anlegen („Speichern & nächste“) und bearbeiten (Erstellen.dc.html, KarteBearbeiten).
 * Die Felder gehören dem Bildschirm; Speichern und Meldungen liefert der Aufrufer.
 */
export function CardScreen({
  mode,
  initial,
  deckLabel,
  onPickDeck,
  onSubmit,
  onClose,
  goal,
  toast,
  onDelete,
  edited,
}: CardScreenProps) {
  const editing = mode === 'edit';
  const [form, setForm] = useState<FormState>(initial);
  const [more, setMore] = useState(editing && (initial.norm !== '' || initial.tags !== ''));
  const [errors, setErrors] = useState<CardErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const frontRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const set = (change: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...change }));
  };
  const coming = COMING[form.tab];

  async function submit() {
    if (busy || coming) return;
    const checked = checkCard({
      type: form.tab === 'cloze' ? 'cloze' : 'qa',
      front: form.front,
      back: form.back,
      text: draftToMarkup(form.draft),
      norm: form.norm,
      tags: form.tags,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      (checked.errors.front ? frontRef : checked.errors.back ? backRef : textRef).current?.focus();
      return;
    }
    setErrors({});
    setFailed(false);
    setBusy(true);
    let saved: boolean;
    try {
      saved = await onSubmit(checked.fields);
    } catch {
      setFailed(true);
      setBusy(false);
      return;
    }
    setBusy(false);
    if (saved && !editing) {
      // Nächste Karte: Inhalt und Norm leeren, Typ, Stapel und Tags bleiben für die nächste stehen.
      setForm((f) => ({ ...f, front: '', back: '', draft: EMPTY_DRAFT, norm: '' }));
      (form.tab === 'cloze' ? textRef : frontRef).current?.focus();
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <button type="button" className={styles.topLink} onClick={onClose}>
          {editing ? 'Abbrechen' : 'Schließen'}
        </button>
        <h1 className={styles.topTitle}>{editing ? 'Karte bearbeiten' : 'Neue Karte'}</h1>
        <button
          type="button"
          className={cx(styles.more, tap.tap)}
          aria-pressed={more}
          onClick={() => {
            setMore(!more);
          }}
        >
          {more ? 'Einfach' : 'Mehr'}
        </button>
      </div>

      {editing ? (
        <div className={styles.typeFixed}>
          <span>Kartentyp</span>
          <span className={styles.typeFixedValue}>
            {TABS.find((t) => t.value === form.tab)?.label}
          </span>
        </div>
      ) : (
        <div className={styles.types} role="group" aria-label="Kartentyp">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={cx(styles.type, tap.tap, form.tab === t.value && styles.typeOn)}
              aria-pressed={form.tab === t.value}
              onClick={() => {
                setErrors({});
                set({ tab: t.value });
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {form.tab === 'qa' ? (
        <div className={cx(styles.fields, rise.rise)}>
          <TextField
            label="Vorderseite"
            multiline
            rows={3}
            value={form.front}
            onChange={(front) => {
              set({ front });
            }}
            placeholder="Frage, z. B. Was ist Gewahrsam?"
            error={errors.front}
            inputRef={frontRef}
            inputStyle={{ fontSize: 18, lineHeight: 1.4 }}
          />
          <TextField
            label="Rückseite"
            multiline
            rows={4}
            value={form.back}
            onChange={(back) => {
              set({ back });
            }}
            placeholder="Antwort"
            error={errors.back}
            inputRef={backRef}
            inputStyle={{ fontSize: 17, lineHeight: 1.45 }}
          />
        </div>
      ) : null}
      {form.tab === 'cloze' ? (
        <div className={rise.rise}>
          <ClozeEditor
            draft={form.draft}
            onChange={(draft) => {
              set({ draft });
            }}
            error={errors.text}
            textRef={textRef}
          />
        </div>
      ) : null}
      {coming ? (
        <div className={cx(styles.placeholderPanel, rise.rise)}>
          <span className={styles.placeholderTitle}>{coming.title}</span>
          <span className={styles.placeholderText}>{coming.text}</span>
        </div>
      ) : null}

      {more ? (
        <div className={cx(styles.extra, rise.rise)}>
          <label className={styles.mini}>
            <span className={styles.miniLabel}>Norm</span>
            <input
              className={styles.miniInput}
              value={form.norm}
              onChange={(e) => {
                set({ norm: e.target.value });
              }}
              placeholder="§ 242 StGB"
              maxLength={240}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className={styles.mini}>
            <span className={styles.miniLabel}>Tags</span>
            <input
              className={styles.miniInput}
              value={form.tags}
              onChange={(e) => {
                set({ tags: e.target.value });
              }}
              placeholder="#Klausur #AG"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
        </div>
      ) : null}

      {editing ? null : (
        <div className={styles.media}>
          <button
            type="button"
            className={styles.mediaButton}
            disabled
            aria-label="PDF, kommt mit M6"
          >
            <FileIcon size={18} />
            PDF
          </button>
          <button
            type="button"
            className={styles.mediaButton}
            disabled
            aria-label="Foto oder Bild, kommt mit M6"
          >
            <ImageIcon size={18} />
            Foto / Bild
          </button>
        </div>
      )}

      <button
        type="button"
        className={styles.deckRow}
        onClick={onPickDeck}
        aria-label={`Stapel: ${deckLabel ?? 'noch keiner gewählt'}. Ändern`}
      >
        <span className={styles.deckLabel}>Stapel</span>
        <span className={styles.deckValue}>
          {deckLabel ?? 'Stapel wählen'}
          <ChevronRightIcon size={16} />
        </span>
      </button>
      {edited ? <p className={styles.note}>{edited}</p> : null}

      <div className={styles.footer}>
        {goal ? (
          <div className={styles.goal}>
            <div className={styles.goalTrack} aria-hidden="true">
              <div className={styles.goalFill} style={{ width: `${goal.pct}%` }} />
            </div>
            <span>{goal.text}</span>
          </div>
        ) : null}
        {failed ? (
          <p className={styles.failed} role="alert">
            Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.
          </p>
        ) : null}
        <Button block disabled={busy || coming !== undefined} onClick={() => void submit()}>
          {editing ? 'Speichern' : 'Speichern & nächste'}
        </Button>
        {editing && onDelete ? (
          <button type="button" className={styles.delete} onClick={onDelete}>
            <TrashIcon size={18} />
            Karte löschen
          </button>
        ) : null}
      </div>
      {toast}
    </main>
  );
}
