import type { ReactNode } from 'react';
import { cx } from '../cx';
import styles from './Kbd.module.css';

/**
 * Tastenhinweis (Chip) an einer Stelle, wo das Kürzel gilt. Erscheint nur am Rechner (ab 1280 px)
 * und ist für Vorlesegeräte verborgen; das Kürzel selbst steht als `aria-keyshortcuts` am Element.
 */
export function Kbd({
  children,
  tone = 'light',
  className,
}: {
  children: ReactNode;
  /** `dark` auf Violett oder Tinte, `surface` auf einer Fläche. */
  tone?: 'light' | 'dark' | 'surface';
  className?: string | undefined;
}) {
  return (
    <kbd
      className={cx(
        styles.kbd,
        tone === 'dark' && styles.dark,
        tone === 'surface' && styles.onSurface,
        className,
      )}
      aria-hidden="true"
    >
      {children}
    </kbd>
  );
}
