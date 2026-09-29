import { LinkIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './Lernen.module.css';

/**
 * Verknüpfte Karte eines Schema-Punkts (Schema.dc.html): Vorschau der Karte, zurück zum Schema
 * oder die Karte lernen. Rein; Lernen.tsx liest die Karte.
 */
export function LinkedCardSheet({
  open,
  title,
  text,
  missing,
  onClose,
  onStudy,
}: {
  open: boolean;
  title: string;
  text: string;
  /** Die Karte gibt es nicht mehr (gelöscht, während das Schema offen war). */
  missing: boolean;
  onClose: () => void;
  onStudy: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={
        <>
          <LinkIcon size={14} strokeWidth={2.4} />
          Verknüpfte Karte
        </>
      }
      title={missing ? 'Karte nicht gefunden' : title}
      minHeight={359}
      compact
    >
      <p className={styles.linkText}>{missing ? 'Diese Karte gibt es nicht mehr.' : text}</p>
      <div className={styles.linkActions}>
        <button
          type="button"
          className={cx(styles.linkBtn, styles.linkBtnSoft, tap.tap)}
          onClick={onClose}
        >
          Zurück zum Schema
        </button>
        <button
          type="button"
          className={cx(styles.linkBtn, styles.linkBtnInk, tap.tap)}
          disabled={missing}
          onClick={onStudy}
        >
          Karte lernen
        </button>
      </div>
    </Sheet>
  );
}
