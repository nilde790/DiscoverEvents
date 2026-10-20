import type { EventItem, LatLng } from '../types';

/**
 * Contratto che ogni sorgente di eventi deve rispettare.
 * Per passare a un'API reale (es. Ticketmaster) basta scrivere una nuova
 * implementazione e cambiarla in `services/index.ts`.
 */
export interface EventProvider {
  getEventsNear(center: LatLng, radiusKm: number): Promise<EventItem[]>;
}
