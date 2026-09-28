import { useEffect, useId, useRef, type ReactNode } from 'react';
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
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
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
      <div className={styles.body}>
        <span className={styles.handle} aria-hidden="true" />
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
