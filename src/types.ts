export interface LatLng {
  lat: number;
  lng: number;
}

export type EventCategory = 'Musica' | 'Sport' | 'Arte' | 'Cibo' | 'Teatro' | 'Tech';

export interface EventItem {
  id: string;
  title: string;
  category: EventCategory;
  description: string;
  venue: string;
  position: LatLng;
  start: Date;
  durationMinutes: number;
  /** Prezzo in euro; 0 = gratuito */
  price: number;
  capacity: number;
  attendees: number;
}

/** Evento arricchito con la distanza dall'utente, calcolata lato client. */
export interface EventWithDistance extends EventItem {
  distanceKm: number;
}
