import { useEffect, useState } from 'react';
import type { LatLng } from '../types';

/** Posizione di ripiego se l'utente nega il permesso: Roma centro. */
export const FALLBACK_POSITION: LatLng = { lat: 41.9028, lng: 12.4964 };

type GeoState =
  | { status: 'loading'; position: null; error: null }
  | { status: 'ok'; position: LatLng; error: null }
  | { status: 'fallback'; position: LatLng; error: string };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'loading', position: null, error: null });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'fallback', position: FALLBACK_POSITION, error: 'Geolocalizzazione non supportata' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: 'ok',
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        }),
      (err) => setState({ status: 'fallback', position: FALLBACK_POSITION, error: err.message }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return state;
}
