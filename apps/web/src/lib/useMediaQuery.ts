import { useSyncExternalStore } from 'react';

/** `true` finché la media query CSS è soddisfatta; si aggiorna quando la finestra cambia. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
