import { useEffect, useState } from 'react';
import { eventProvider } from '../services';
import type { EventWithDistance, LatLng } from '../types';
import { distanceKm } from '../utils/geo';

/** Raggio massimo entro cui si chiedono gli eventi; il filtro UI lavora dentro questo. */
export const MAX_RADIUS_KM = 15;

export function useEvents(center: LatLng | null) {
  const [events, setEvents] = useState<EventWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) return;
    let cancelled = false; // evita di aggiornare lo stato se il centro cambia nel frattempo
    setLoading(true);
    setError(null);

    eventProvider
      .getEventsNear(center, MAX_RADIUS_KM)
      .then((items) => {
        if (cancelled) return;
        setEvents(
          items
            .map((e) => ({ ...e, distanceKm: distanceKm(center, e.position) }))
            .sort((a, b) => a.distanceKm - b.distanceKm),
        );
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // Dipendenze su lat/lng e non sull'oggetto: un nuovo oggetto uguale non deve rifare la richiesta.
  }, [center?.lat, center?.lng]);

  return { events, loading, error };
}
