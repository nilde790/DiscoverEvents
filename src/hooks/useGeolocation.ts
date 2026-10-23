import { useEffect, useState } from 'react';
import type { LatLng } from '../utils/geo';

type GeoState =
  | { status: 'loading'; position: null; error: null }
  | { status: 'ok'; position: LatLng; error: null }
  | { status: 'denied'; position: null; error: string };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'loading', position: null, error: null });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'denied', position: null, error: 'Geolocalizzazione non supportata' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: 'ok',
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
        }),
      (err) => setState({ status: 'denied', position: null, error: err.message }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  return state;
}
