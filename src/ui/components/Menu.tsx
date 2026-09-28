import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '../cx';
import { MoreIcon } from './icons';
import styles from './Menu.module.css';

export interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

/**
 * Überlaufmenü („⋯“) mit Popover (Schatten popover): schließt bei Auswahl, Escape und Tippen
 * daneben, der Fokus geht danach zurück auf den Knopf. Trefferfläche des Knopfes: 44 px.
 */
export function Menu({
  label,
  items,
  align,
  size = 44,
}: {
  label: string;
  items: readonly MenuItem[];
  /** Kante des Knopfes, an der das Menü ausgerichtet ist. */
  align: 'left' | 'right';
  size?: 44 | 48;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const first = root.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    const close = (event: Event) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={button}
        type="button"
        className={cx(styles.button, size === 48 && styles.large)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <MoreIcon size={24} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cx(styles.popover, styles[align])}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={cx(styles.item, item.danger && styles.danger)}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
