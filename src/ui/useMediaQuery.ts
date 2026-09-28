import { useSyncExternalStore } from 'react';

/** Ob eine Medienabfrage gerade zutrifft, z. B. `(min-width: 1100px)`; folgt Drehen und Größenänderung. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
  );
}
