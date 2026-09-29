import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../cx';
import { CloseIcon } from './icons';
import styles from './Sheet.module.css';

/**
 * Bottom Sheet nach Schema.dc.html und BackupImport.dc.html, als natives <dialog>:
 * Fokus, Escape und inaktiver Hintergrund kommen vom Browser. Tippen auf die Abdunklung schließt.
 */
export function Sheet({
  open,
  onClose,
  eyebrow,
  title,
  minHeight,
  compact = false,
  titled = false,
  onEscape,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Kleine Zeile über dem Titel; entfällt bei `titled`. */
  eyebrow?: ReactNode;
  title: string;
  /** Mindesthöhe in Pixeln, wenn das Design eine feste Höhe vorgibt (Schema.dc.html: 356). */
  minHeight?: number;
  /** Wie Schema.dc.html: Kopfzeile ohne Abstand nach oben, Titel in der Display-Schrift. */
  compact?: boolean;
  /** Wie Fristen.dc.html: Titel in der Display-Schrift mit Schließen-Knopf in einer Zeile. */
  titled?: boolean;
  /** Escape und der Schließen-Knopf gehen einen Schritt zurück, statt das Sheet zu schließen. */
  onEscape?: (() => void) | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (!onEscape) return;
        event.preventDefault();
        onEscape();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cx(styles.body, compact && styles.compact, titled && styles.titled)}
        style={minHeight ? { minHeight } : undefined}
      >
        <span className={styles.handle} aria-hidden="true" />
        {titled ? (
          <div className={styles.head}>
            <h2 id={titleId} className={cx(styles.title, styles.display, styles.headTitle)}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label={onEscape ? 'Zurück' : 'Schließen'}
              onClick={onEscape ?? onClose}
            >
              <CloseIcon size={18} strokeWidth={2.4} />
            </button>
          </div>
        ) : (
          <>
            <p className={cx(styles.eyebrow, compact && styles.flush)}>{eyebrow}</p>
            <h2 id={titleId} className={cx(styles.title, compact && styles.display)}>
              {title}
            </h2>
          </>
        )}
        {children}
      </div>
    </dialog>
  );
}
