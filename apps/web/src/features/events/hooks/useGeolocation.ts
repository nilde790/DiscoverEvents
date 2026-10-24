import { useEffect, useState } from 'react';
import type { LatLng } from '@/lib/geo';

type GeoState =
  | { status: 'loading'; position: null; error: null }
  | { status: 'ok'; position: LatLng; error: null }
  | { status: 'denied'; position: null; error: string };

/** Codici di errore della Geolocation API (1, 2, 3). */
const GEO_ERRORS: Record<number, string> = {
  1: 'Non hai dato il permesso di usare la posizione',
  2: 'Posizione non rilevabile',
  3: 'La posizione ci ha messo troppo',
};

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'loading', position: null, error: null });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'denied', position: null, error: 'Il browser non supporta la posizione' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: 'ok',
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        }),
      // err.message è in inglese e cambia da browser a browser: meglio un testo nostro per ogni caso.
      (err) =>
        setState({ status: 'denied', position: null, error: GEO_ERRORS[err.code] ?? 'Posizione non disponibile' }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return state;
}
