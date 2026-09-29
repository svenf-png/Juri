import type { ReactNode, RefObject } from 'react';
import type { CardErrors } from '@/domain/cards/card';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import type { FormState, Tab } from './form';
import styles from './SplitForm.module.css';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'qa', label: 'Frage' },
  { value: 'cloze', label: 'Lücke' },
  { value: 'schema', label: 'Schema' },
  { value: 'cover', label: 'Abdeckung' },
];

export interface SplitFormProps {
  form: FormState;
  set: (change: Partial<FormState>) => void;
  errors: CardErrors;
  onTab: (tab: Tab) => void;
  /** „3 von 5 heute“ */
  made: string;
  applied: { front: boolean; back: boolean };
  /** Inhalt des Reiters Lücke, Schema oder Abdeckung, wie im iPhone-Formular. */
  panel: ReactNode;
  /** Zusammenfassung der Abdeckung (Felder auf S. 14), wenn das Bild aus dem PDF stammt. */
  coverSummary: ReactNode;
  deckLabel: string | null;
  onPickDeck: () => void;
  /** „PDF S. 14“ */
  source: string;
  goal: { pct: number; text: string } | null;
  busy: boolean;
  failed: boolean;
  onSave: (next: boolean) => void;
  frontRef: RefObject<(HTMLInputElement & HTMLTextAreaElement) | null>;
  backRef: RefObject<(HTMLInputElement & HTMLTextAreaElement) | null>;
  toast?: ReactNode;
}

/** Formular neben der PDF-Ansicht (iPad quer, ab 1100 px). */
export function SplitForm({
  form,
  set,
  errors,
  onTab,
  made,
  applied,
  panel,
  coverSummary,
  deckLabel,
  onPickDeck,
  source,
  goal,
  busy,
  failed,
  onSave,
  frontRef,
  backRef,
  toast,
}: SplitFormProps) {
  return (
    <main className={styles.form}>
      <div className={styles.head}>
        <h1 className={styles.title}>Neue Karte</h1>
        <span className={styles.made}>{made}</span>
      </div>
      <div className={styles.types} role="group" aria-label="Kartentyp">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={cx(styles.type, tap.tap, form.tab === t.value && styles.typeOn)}
            aria-pressed={form.tab === t.value}
            onClick={() => {
              onTab(t.value);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {form.tab === 'qa' ? (
        <>
          <TextField
            label="Vorderseite"
            multiline
            rows={2}
            value={form.front}
            onChange={(front) => {
              set({ front });
            }}
            error={errors.front}
            inputRef={frontRef}
            className={styles.field}
            inputStyle={{ fontSize: 19, lineHeight: 1.4 }}
          />
          <TextField
            label="Rückseite"
            multiline
            rows={3}
            value={form.back}
            onChange={(back) => {
              set({ back });
            }}
            error={errors.back}
            inputRef={backRef}
            className={styles.field}
            inputStyle={{ fontSize: 17, lineHeight: 1.45 }}
            labelExtra={
              applied.back ? <span className={styles.applied}>aus PDF übernommen</span> : undefined
            }
          />
        </>
      ) : form.tab === 'cover' ? (
        coverSummary
      ) : (
        panel
      )}

      <div className={styles.grid}>
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
          />
        </label>
        <button type="button" className={styles.mini} onClick={onPickDeck}>
          <span className={styles.miniLabel}>Stapel</span>
          <span className={styles.miniValue}>{deckLabel ?? 'Stapel wählen'}</span>
        </button>
        <div className={styles.mini}>
          <span className={styles.miniLabel}>Quelle</span>
          <span className={cx(styles.miniValue, styles.miniLink)}>{source}</span>
        </div>
      </div>

      <div className={styles.spacer} />
      {goal ? (
        <div className={styles.goal}>
          <div className={styles.goalTrack} aria-hidden="true">
            <div className={styles.goalFill} style={{ width: `${String(goal.pct)}%` }} />
          </div>
          <span>{goal.text}</span>
        </div>
      ) : null}
      {failed ? (
        <p className={styles.failed} role="alert">
          Das hat nicht geklappt. Bitte versuche es noch einmal.
        </p>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.save, tap.tap)}
          disabled={busy}
          onClick={() => {
            onSave(false);
          }}
        >
          Speichern
        </button>
        <button
          type="button"
          className={cx(styles.next, tap.tap)}
          disabled={busy}
          onClick={() => {
            onSave(true);
          }}
        >
          Speichern &amp; nächste aus PDF
        </button>
      </div>
      {toast}
    </main>
  );
}
