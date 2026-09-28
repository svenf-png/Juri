import { useId, useState, type RefObject } from 'react';
import {
  ADD_GAP_MESSAGES,
  addGap,
  draftSegments,
  editText,
  removeGap,
  type ClozeDraft,
} from '@/domain/cards/clozeDraft';
import { CloseIcon } from '../../components/icons';
import { cx } from '../../cx';
import styles from './Erstellen.module.css';

/**
 * Lückentext-Editor (Erstellen.dc.html, Tab „Lücke“): Text schreiben, Wort markieren, „Markierung
 * wird Lücke“ antippen. Jede Lücke wird eine eigene Abfrage; die Liste darunter zeigt sie und
 * entfernt sie wieder, ohne den Text zu ändern.
 */
export function ClozeEditor({
  draft,
  onChange,
  error,
  textRef,
}: {
  draft: ClozeDraft;
  onChange: (draft: ClozeDraft) => void;
  error?: string | undefined;
  /** Das Eingabefeld, z. B. zum Fokussieren durch den Bildschirm. */
  textRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const errorId = useId();
  const numbers = [...new Set(draft.gaps.map((g) => g.n))];

  function mark() {
    const el = textRef.current;
    if (!el) return;
    const result = addGap(draft, el.selectionStart, el.selectionEnd);
    if ('error' in result) {
      setMessage(ADD_GAP_MESSAGES[result.error]);
      return;
    }
    setMessage(null);
    onChange(result.draft);
    // Auswahl aufheben, damit ein zweites Antippen nicht dieselbe Stelle noch einmal trifft.
    el.setSelectionRange(el.selectionEnd, el.selectionEnd);
  }

  return (
    <div className={styles.cloze}>
      <div className={cx(styles.textBox, error && styles.textInvalid)}>
        <span className={styles.label}>Text</span>
        <div className={styles.editor}>
          <div className={styles.mirror} aria-hidden="true">
            {draftSegments(draft).map((s, i) =>
              s.gap === null ? (
                s.text
              ) : (
                <span key={i} className={styles.gap}>
                  {s.text}
                </span>
              ),
            )}
            {'​'}
          </div>
          <textarea
            ref={textRef}
            className={styles.area}
            value={draft.text}
            onChange={(e) => {
              setMessage(null);
              onChange(editText(draft, e.target.value));
            }}
            aria-label="Text"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="Text schreiben, dann ein Wort markieren"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
      {error ? (
        <p id={errorId} className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={styles.mark}
        // Der Knopf soll die Markierung im Text nicht aufheben.
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={mark}
      >
        Markierung wird Lücke
      </button>
      <p className={cx(styles.hint, message && styles.hintStrong)} role="status">
        {message ?? 'Wort markieren, antippen, fertig. Jede Lücke wird eine eigene Abfrage.'}
      </p>
      {numbers.length > 0 ? (
        <section className={styles.gaps} aria-labelledby="luecken-titel">
          <h2 id="luecken-titel" className={styles.label}>
            Lücken · {numbers.length === 1 ? '1 Abfrage' : `${numbers.length} Abfragen`}
          </h2>
          <ul className={styles.gapChips}>
            {numbers.map((n) => {
              const text = draft.gaps
                .filter((g) => g.n === n)
                .map((g) => draft.text.slice(g.start, g.end))
                .join(' … ');
              return (
                <li key={n} className={styles.gapChip}>
                  <span className={styles.gapNumber} aria-hidden="true">
                    {n}
                  </span>
                  <span className={styles.gapText}>{text}</span>
                  <button
                    type="button"
                    className={styles.gapRemove}
                    aria-label={`Lücke ${n} entfernen: ${text}`}
                    onClick={() => {
                      onChange(removeGap(draft, n));
                    }}
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
