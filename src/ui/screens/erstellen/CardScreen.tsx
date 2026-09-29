import { useRef, useState, type ReactNode } from 'react';
import { checkCard, type CardErrors, type CardFields } from '@/domain/cards/card';
import { draftToMarkup, EMPTY_DRAFT } from '@/domain/cards/clozeDraft';
import type { CreateGoal } from '@/domain/cards/goal';
import { Button } from '../../components/Button';
import { ChevronRightIcon, FileIcon, ImageIcon, TrashIcon } from '../../components/icons';
import { plural } from '@/domain/session/present';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import { ClozeEditor } from './ClozeEditor';
import { SchemaEditor } from './SchemaEditor';
import type { FormState, Tab } from './form';
import styles from './Erstellen.module.css';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'qa', label: 'Frage' },
  { value: 'cloze', label: 'Lücke' },
  { value: 'schema', label: 'Schema' },
  { value: 'cover', label: 'Abdeckung' },
];

const COMING: Partial<Record<Tab, { title: string; text: string }>> = {
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
  /** Stapel der Karte für Verknüpfungen im Schema: Kennung, Name und Rechtsgebiete („ZR, ÖR“). */
  deck?: { id: string; name: string; areaCodes: string } | null;
  /** Kennung der bearbeiteten Karte (Schema: keine Verknüpfung auf sich selbst). */
  cardId?: string;
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
  deck = null,
  cardId,
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
  const [more, setMore] = useState(
    editing && (initial.norm !== '' || initial.tags !== '' || initial.note !== ''),
  );
  const [errors, setErrors] = useState<CardErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const frontRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [outline, setOutline] = useState(false);
  const set = (change: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...change }));
  };
  const coming = COMING[form.tab];

  async function submit() {
    if (busy || coming) return;
    const checked = checkCard({
      type: form.tab === 'cloze' ? 'cloze' : form.tab === 'schema' ? 'schema' : 'qa',
      front: form.front,
      back: form.back,
      text: draftToMarkup(form.draft),
      title: form.title,
      points: form.points,
      norm: form.norm,
      tags: form.tags,
      note: form.note,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      if (checked.errors.norm || checked.errors.note) setMore(true);
      if (checked.errors.schema) {
        if (checked.errors.schema.title) titleRef.current?.focus();
        else if (checked.errors.schema.point) setOutline(true);
        return;
      }
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
      // Nächste Karte: Inhalt, Norm und Notiz leeren, Typ, Stapel und Tags bleiben stehen.
      setForm((f) => ({
        ...f,
        front: '',
        back: '',
        draft: EMPTY_DRAFT,
        title: '',
        points: [],
        norm: '',
        note: '',
      }));
      (form.tab === 'cloze'
        ? textRef
        : form.tab === 'schema'
          ? titleRef
          : frontRef
      ).current?.focus();
    }
  }

  if (outline) {
    return (
      <SchemaEditor
        title={form.title.trim()}
        norm={form.norm.trim()}
        areaCodes={deck?.areaCodes ?? ''}
        initial={form.points}
        pointErrors={errors.schema?.point}
        deckId={deck?.id ?? null}
        deckName={deck?.name ?? null}
        selfId={cardId}
        onSave={(points) => {
          set({ points });
          setErrors({});
          setOutline(false);
        }}
        onBack={() => {
          setOutline(false);
        }}
      />
    );
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
      {form.tab === 'schema' ? (
        <div className={cx(styles.schemaPanel, rise.rise)}>
          <TextField
            label="Titel des Schemas"
            value={form.title}
            onChange={(title) => {
              set({ title });
            }}
            placeholder="z. B. Amtshaftungsanspruch"
            error={errors.schema?.title}
            inputRef={titleRef}
          />
          <button
            type="button"
            className={cx(styles.outlineButton, tap.tap)}
            onClick={() => {
              setOutline(true);
            }}
          >
            Gliederung bearbeiten
            <ChevronRightIcon size={18} strokeWidth={2.2} />
          </button>
          {errors.schema?.points || errors.schema?.point ? (
            <span className={styles.errorText} role="alert">
              {errors.schema.points ?? 'Bitte prüfe die markierten Punkte in der Gliederung.'}
            </span>
          ) : (
            <span className={styles.outlineInfo}>
              {form.points.length === 0
                ? 'Noch keine Punkte'
                : plural(form.points.length, 'Punkt', 'Punkte')}
            </span>
          )}
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
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errors.norm ? true : undefined}
            />
            {errors.norm ? (
              <span className={styles.errorText} role="alert">
                {errors.norm}
              </span>
            ) : null}
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
          <label className={styles.mini}>
            <span className={styles.miniLabel}>Notiz</span>
            <textarea
              className={cx(styles.miniInput, styles.miniArea)}
              value={form.note}
              onChange={(e) => {
                set({ note: e.target.value });
              }}
              placeholder="Merksatz, Eselsbrücke oder Fundstelle. Erscheint beim Lernen unter der Antwort."
              rows={3}
              aria-invalid={errors.note ? true : undefined}
            />
            {errors.note ? (
              <span className={styles.errorText} role="alert">
                {errors.note}
              </span>
            ) : null}
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
            Das hat nicht geklappt. Bitte versuche es noch einmal.
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
