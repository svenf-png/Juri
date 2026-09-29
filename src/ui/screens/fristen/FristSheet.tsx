import { useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import type { Day } from '@/domain/calendar/day';
import { formShortcut } from '@/domain/device/shortcuts';
import {
  checkDraft,
  KIND_LABELS,
  KIND_ORDER,
  normalizeTag,
  selectAll,
  toggleScope,
  type DeadlineDraft,
  type DraftErrors,
} from '@/domain/deadlines/form';
import { sortAreas } from '@/domain/library/areas';
import type { Area, Deadline, Deck } from '@/domain/model/records';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
import { keyInput } from '../../useKeys';
import tap from '../../motion/tap.module.css';
import styles from './FristSheet.module.css';

/** Meldung, wenn Speichern scheitert; Eingaben bleiben stehen. */
const SAVE_FAILED = 'Das hat nicht geklappt. Bitte versuche es noch einmal.';

export type FristValue = Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>;

export interface FristSheetProps {
  /** `null` legt eine neue Frist an, sonst wird die Frist bearbeitet. */
  editing: { id: string; canExport: boolean } | null;
  initial: DeadlineDraft;
  /** Datum der bestehenden Frist: Es darf auch in der Vergangenheit unverändert bleiben. */
  keepDate?: string | undefined;
  today: Day;
  areas: readonly Area[];
  decks: readonly Deck[];
  /** Alle Tags der Karten zur Auswahl. */
  tags: readonly string[];
  onSave: (value: FristValue) => Promise<void>;
  onClose: () => void;
  onDelete?: (() => void) | undefined;
  /** Kalenderdatei dieser Frist; liefert die Rückmeldung für den Nutzer. */
  onExport?: (() => Promise<string>) | undefined;
  /** Für Vorschauen: Fehler und Schritt schon gesetzt. */
  preview?: { errors?: DraftErrors; step?: 'form' | 'scope' } | undefined;
}

/** Text auf einem Chip des Umfangs. */
function scopeChips(
  draft: DeadlineDraft,
  areas: readonly Area[],
  decks: readonly Deck[],
): { field: 'areaIds' | 'deckIds' | 'tags'; value: string; label: string }[] {
  const { scope } = draft;
  return [
    ...sortAreas(areas)
      .filter((a) => scope.areaIds.includes(a.id))
      .map((a) => ({ field: 'areaIds' as const, value: a.id, label: a.code })),
    ...decks
      .filter((d) => scope.deckIds.includes(d.id))
      .map((d) => ({ field: 'deckIds' as const, value: d.id, label: d.name })),
    ...scope.tags.map((t) => ({ field: 'tags' as const, value: t, label: `#${t}` })),
  ];
}

/**
 * Frist anlegen oder bearbeiten (Fristen.dc.html, FristNeu, FristBearbeiten, FristFehler) mit dem
 * zweiten Schritt „Umfang wählen“ (FristUmfang). Prüft mit `checkDraft`; Fehler stehen unter den
 * Feldern. Strg oder Cmd plus Eingabe speichert.
 */
export function FristSheet(props: FristSheetProps) {
  const { editing, today, areas, decks, tags, onClose } = props;
  const [draft, setDraft] = useState(props.initial);
  const [errors, setErrors] = useState<DraftErrors>(props.preview?.errors ?? {});
  const [step, setStep] = useState<'form' | 'scope'>(props.preview?.step ?? 'form');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [tagInput, setTagInput] = useState('');

  const change = (next: Partial<DeadlineDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
  };

  async function save() {
    if (busy) return;
    const result = checkDraft(draft, today, props.keepDate);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    setFailed(false);
    try {
      await props.onSave(result.value);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  const onSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    void save();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (formShortcut(keyInput(event.nativeEvent)) !== 'save') return;
    event.preventDefault();
    void save();
  };

  const addTag = () => {
    const tag = normalizeTag(tagInput);
    if (tag && !draft.scope.tags.includes(tag))
      change({ scope: toggleScope(draft.scope, 'tags', tag) });
    setTagInput('');
  };

  const messages = [errors.name, errors.date, errors.scope].filter((m): m is string => !!m);

  if (step === 'scope') {
    const { scope } = draft;
    const pick = (on: boolean) => cx(styles.chip, on ? styles.pickOn : styles.pick, tap.tap);
    const allTags = [...new Set([...tags, ...scope.tags])].sort();
    return (
      <Sheet
        open
        titled
        title="Umfang wählen"
        onClose={onClose}
        onEscape={() => {
          setStep('form');
        }}
      >
        <div className={styles.group}>
          <span className={styles.groupLabel}>Alle Karten</span>
          <div className={styles.chips}>
            <button
              type="button"
              className={pick(scope.all)}
              aria-pressed={scope.all}
              onClick={() => {
                change({ scope: selectAll() });
              }}
            >
              Alle Karten
            </button>
          </div>
        </div>
        {areas.length > 0 ? (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Rechtsgebiete</span>
            <div className={styles.chips}>
              {sortAreas(areas).map((a) => {
                const on = scope.areaIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={pick(on)}
                    aria-pressed={on}
                    aria-label={`${a.code}, ${a.name}`}
                    onClick={() => {
                      change({ scope: toggleScope(scope, 'areaIds', a.id) });
                    }}
                  >
                    {a.code}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {decks.length > 0 ? (
          <div className={styles.group}>
            <span className={styles.groupLabel}>Stapel</span>
            <div className={styles.chips}>
              {[...decks]
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .map((d) => {
                  const on = scope.deckIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={pick(on)}
                      aria-pressed={on}
                      onClick={() => {
                        change({ scope: toggleScope(scope, 'deckIds', d.id) });
                      }}
                    >
                      {d.name}
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}
        <div className={styles.group}>
          <span className={styles.groupLabel}>Tags</span>
          {allTags.length > 0 ? (
            <div className={styles.chips}>
              {allTags.map((t) => {
                const on = scope.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={pick(on)}
                    aria-pressed={on}
                    onClick={() => {
                      change({ scope: toggleScope(scope, 'tags', t) });
                    }}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <form
          className={styles.tagRow}
          onSubmit={(event) => {
            event.preventDefault();
            addTag();
          }}
        >
          <label className={styles.tagField}>
            <span className={styles.srOnly}>Tag hinzufügen</span>
            <input
              className={styles.tagInput}
              placeholder="#Tag hinzufügen"
              value={tagInput}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              onChange={(e) => {
                setTagInput(e.target.value);
              }}
            />
          </label>
          <button type="submit" className={cx(styles.tagAdd, tap.tap)}>
            Hinzufügen
          </button>
        </form>
        <button
          type="button"
          className={cx(styles.save, tap.tap)}
          onClick={() => {
            setStep('form');
          }}
        >
          Fertig
        </button>
      </Sheet>
    );
  }

  const chips = scopeChips(draft, areas, decks);
  const nameId = 'frist-name';
  const problems = 'frist-fehler';
  return (
    <Sheet open titled title={editing ? 'Frist bearbeiten' : 'Neue Frist'} onClose={onClose}>
      <form className={styles.form} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate>
        <div className={styles.kinds} role="group" aria-label="Art der Frist">
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className={cx(styles.kind, draft.kind === kind && styles.kindOn, tap.tap)}
              aria-pressed={draft.kind === kind}
              onClick={() => {
                change({ kind });
              }}
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
        </div>
        <div className={styles.fields}>
          <label className={cx(styles.field, errors.name && styles.invalid)}>
            <span className={styles.label}>Name</span>
            <input
              id={nameId}
              className={styles.input}
              placeholder="z. B. Klausur ÖR"
              value={draft.name}
              maxLength={80}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={messages.length ? problems : undefined}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => {
                change({ name: e.target.value });
              }}
            />
          </label>
          <label className={cx(styles.field, errors.date && styles.invalid)}>
            <span className={styles.label}>Datum</span>
            <input
              type="date"
              className={cx(styles.input, styles.date)}
              value={draft.date}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={messages.length ? problems : undefined}
              onChange={(e) => {
                change({ date: e.target.value });
              }}
            />
          </label>
        </div>
        {messages.length > 0 ? (
          <div id={problems} className={styles.errors} role="alert">
            {messages.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        ) : null}

        <div className={styles.group}>
          <span className={styles.groupLabel}>Umfang: Rechtsgebiete, Stapel oder Tags</span>
          <div className={styles.chips}>
            {draft.scope.all ? (
              <span className={styles.chip}>Alle Karten</span>
            ) : (
              chips.map((c) => (
                <button
                  key={`${c.field}:${c.value}`}
                  type="button"
                  className={cx(styles.chip, tap.tap)}
                  aria-label={`${c.label} entfernen`}
                  onClick={() => {
                    change({ scope: toggleScope(draft.scope, c.field, c.value) });
                  }}
                >
                  {c.label}
                </button>
              ))
            )}
            <button
              type="button"
              className={cx(styles.chip, styles.chipAdd, tap.tap)}
              onClick={() => {
                setStep('scope');
              }}
            >
              {draft.scope.all ? '+ Eingrenzen' : '+ Hinzufügen'}
            </button>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={draft.sprint}
          className={cx(styles.switch, tap.tap)}
          onClick={() => {
            change({ sprint: !draft.sprint });
          }}
        >
          <span className={styles.switchText}>
            <span className={styles.switchTitle}>Endspurt</span>
            <span className={styles.switchHint}>Letzte 7 Tage: jede Karte noch einmal</span>
          </span>
          <span className={cx(styles.track, draft.sprint && styles.trackOn)}>
            <span className={cx(styles.knob, draft.sprint && styles.knobOn)} />
          </span>
        </button>

        {failed ? (
          <p className={styles.error} role="alert">
            {SAVE_FAILED}
          </p>
        ) : null}
        <button type="submit" className={cx(styles.save, tap.tap)} disabled={busy}>
          {editing ? 'Änderungen speichern' : 'Frist speichern'}
        </button>
        {editing ? (
          <>
            <div className={styles.pair}>
              <button
                type="button"
                className={cx(styles.secondary, tap.tap)}
                disabled={!editing.canExport || !props.onExport}
                onClick={() => {
                  void props.onExport?.().then(setNote);
                }}
              >
                Im Kalender sichern
              </button>
              <button
                type="button"
                className={cx(styles.secondary, styles.danger, tap.tap)}
                onClick={props.onDelete}
              >
                Löschen
              </button>
            </div>
            {note ? (
              <p className={styles.note} role="status">
                {note}
              </p>
            ) : null}
          </>
        ) : null}
      </form>
    </Sheet>
  );
}
