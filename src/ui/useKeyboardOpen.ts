import { useEffect, useState } from 'react';

/**
 * Ist die Bildschirmtastatur (vermutlich) offen? Auf iOS bleibt das Layout-Viewport gleich groß,
 * nur der sichtbare Bereich (visualViewport) schrumpft. Ohne visualViewport (Tests, ältere
 * Browser) ist die Antwort immer „nein“.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = () => {
      setOpen(window.innerHeight - viewport.height > 120);
    };
    update();
    viewport.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
    };
  }, []);
  return open;
}
