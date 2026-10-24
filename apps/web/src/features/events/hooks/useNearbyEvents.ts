import { useMemo } from 'react';
import type { EventSummary, Place } from '@discoverevent/shared/types';
import { FALLBACK_CENTER, MAX_RADIUS_KM } from '@/lib/constants';
import { distanceKm, type LatLng } from '@/lib/geo';
import { useGeolocation } from './useGeolocation';

export type EventWithDistance = EventSummary & { distanceKm: number };

/**
 * Sceglie il centro della ricerca e calcola la distanza di ogni evento.
 * Priorità: la città cercata dall'utente; poi la posizione reale, se ci sono eventi nei dintorni;
 * altrimenti Roma, dove si trovano i dati demo.
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

    if (place) {
      center = place;
      from = `da ${place.name}`;
      label = place.label;
      if (events.length > 0 && !events.some((e) => distanceKm(place, e) <= MAX_RADIUS_KM)) {
        notice = `Ancora nessun evento entro ${MAX_RADIUS_KM} km da ${place.name}.`;
      }
    } else if (geo.status === 'ok') {
      const anyNearby = events.some((e) => distanceKm(geo.position, e) <= MAX_RADIUS_KM);
      if (anyNearby || events.length === 0) {
        center = geo.position;
        from = 'da te';
        label = 'La tua posizione';
      } else {
        notice = 'Non ci sono eventi vicino a te: ti mostro quelli di Roma. Puoi cercare un’altra città qui sopra.';
      }
    } else if (geo.status === 'denied') {
      notice = `${geo.error}: ti mostro gli eventi di Roma. Puoi cercare la tua città qui sopra.`;
    }

    const withDistance: EventWithDistance[] = events.map((e) => ({ ...e, distanceKm: distanceKm(center, e) }));
    // Con una città scelta non serve aspettare il GPS.
    return { center, notice, from, label, locating: !place && geo.status === 'loading', events: withDistance };
  }, [events, geo, place]);
}
