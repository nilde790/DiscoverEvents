import { useMemo } from 'react';
import type { EventSummary } from '../../shared/types';
import { FALLBACK_CENTER, MAX_RADIUS_KM } from '../constants';
import { distanceKm, type LatLng } from '../utils/geo';
import { useGeolocation } from './useGeolocation';

export type EventWithDistance = EventSummary & { distanceKm: number };

/**
 * Sceglie il centro della ricerca e calcola la distanza di ogni evento.
 * Usa la posizione reale se ci sono eventi nei dintorni, altrimenti ripiega su Roma.
 */
export function useNearbyEvents(events: EventSummary[]) {
  const geo = useGeolocation();

  return useMemo(() => {
    let center: LatLng = FALLBACK_CENTER;
    let notice: string | null = null;

    if (geo.status === 'ok') {
      const anyNearby = events.some((e) => distanceKm(geo.position, e) <= MAX_RADIUS_KM);
      if (anyNearby || events.length === 0) center = geo.position;
      else notice = 'Non ci sono eventi vicino a te: ti mostro quelli di Roma.';
    } else if (geo.status === 'denied') {
      notice = `Posizione non disponibile (${geo.error}): ti mostro gli eventi di Roma.`;
    }

    const withDistance: EventWithDistance[] = events.map((e) => ({ ...e, distanceKm: distanceKm(center, e) }));
    return { center, notice, locating: geo.status === 'loading', events: withDistance };
  }, [events, geo]);
}
