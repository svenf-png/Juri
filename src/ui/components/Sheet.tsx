import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../cx';
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
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: ReactNode;
  title: string;
  /** Mindesthöhe in Pixeln, wenn das Design eine feste Höhe vorgibt (Schema.dc.html: 356). */
  minHeight?: number;
  /** Wie Schema.dc.html: Kopfzeile ohne Abstand nach oben, Titel in der Display-Schrift. */
  compact?: boolean;
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
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={cx(styles.body, compact && styles.compact)}
        style={minHeight ? { minHeight } : undefined}
      >
        <span className={styles.handle} aria-hidden="true" />
        <p className={cx(styles.eyebrow, compact && styles.flush)}>{eyebrow}</p>
        <h2 id={titleId} className={cx(styles.title, compact && styles.display)}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
