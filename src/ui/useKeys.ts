import { useEffect, useRef } from 'react';
import type { KeyInput } from '@/domain/device/shortcuts';

/** Sitzt der Fokus in einem Feld, in das getippt wird? */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest('input, textarea, select') !== null;
}

export function keyInput(event: KeyboardEvent): KeyInput {
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    editable: isEditable(event.target),
  };
}

/**
 * Hört auf Tasten im ganzen Fenster, solange der Bildschirm steht. `handler` gibt `true` zurück,
 * wenn er die Taste verwendet hat (dann verhindert der Hook das Standardverhalten). Bei offenem
 * Sheet (`<dialog>`) schweigt er, damit Kürzel nichts hinter dem Sheet auslösen.
 */
export function useKeys(handler: (input: KeyInput, event: KeyboardEvent) => boolean): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (document.querySelector('dialog[open]')) return;
      if (latest.current(keyInput(event), event)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
