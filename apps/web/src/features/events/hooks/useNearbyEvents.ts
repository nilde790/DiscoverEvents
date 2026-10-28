import { useMemo } from 'react';
import type { EventSummary, Place } from '@discoverevent/shared/types';
import { FALLBACK_CENTER, MAX_RADIUS_KM } from '@/lib/constants';
import { distanceKm, type LatLng } from '@/lib/geo';
import { useGeolocation } from './useGeolocation';

export type EventWithDistance = EventSummary & { distanceKm: number };

/**
 * Sceglie il centro della ricerca e calcola la distanza di ogni evento.
 * Priorità: la città cercata dall'utente; poi la posizione reale, anche se nei dintorni non ci sono eventi
 * (altrimenti sembrerebbe che la posizione non funzioni); Roma solo se la posizione non è disponibile.
 */
export function useNearbyEvents(events: EventSummary[], place: Place | null) {
  const geo = useGeolocation();

  return useMemo(() => {
    let center: LatLng = FALLBACK_CENTER;
    let notice: string | null = null;
    /** Come descrivere il centro accanto alle distanze: "1,2 km da te". */
    let from = 'dal centro di Roma';
    /** Nome del centro mostrato sopra la mappa. */
    let label = 'Roma';
    const noneNear = (c: LatLng) => events.length > 0 && !events.some((e) => distanceKm(c, e) <= MAX_RADIUS_KM);

    if (place) {
      center = place;
      from = `da ${place.name}`;
      label = place.label;
      if (noneNear(place)) {
        notice = `Ancora nessun evento entro ${MAX_RADIUS_KM} km da ${place.name}: cerca un’altra città qui sotto.`;
      }
    } else if (geo.status === 'ok') {
      center = geo.position;
      from = 'da te';
      label = 'La tua posizione';
      if (noneNear(geo.position)) {
        notice = `Ancora nessun evento entro ${MAX_RADIUS_KM} km da te: cerca un’altra città qui sotto.`;
      }
    } else if (geo.status === 'denied') {
      notice = `${geo.error}: ti mostro gli eventi di Roma. Puoi cercare la tua città qui sotto.`;
    }

    const withDistance: EventWithDistance[] = events.map((e) => ({ ...e, distanceKm: distanceKm(center, e) }));
    // Con una città scelta non serve aspettare il GPS.
    return { center, notice, from, label, locating: !place && geo.status === 'loading', events: withDistance };
  }, [events, geo, place]);
}
