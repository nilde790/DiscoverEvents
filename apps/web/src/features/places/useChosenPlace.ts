import { useState } from 'react';
import type { Place } from '@discoverevent/shared/types';

const STORAGE_KEY = 'discoverevent.place';

function readSaved(): Place | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return null; // navigazione privata o dato rovinato: si riparte dalla posizione del dispositivo
  }
}

/**
 * Città scelta con la ricerca, ricordata nel browser per la visita successiva.
 * `null` = usa la posizione del dispositivo.
 */
export function useChosenPlace() {
  const [place, setPlace] = useState<Place | null>(readSaved);

  const choose = (next: Place | null) => {
    setPlace(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* il browser non permette di salvare: la scelta vale solo per questa visita */
    }
  };

  return { place, choose };
}
