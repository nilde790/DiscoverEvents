// Tipi condivisi tra server e client: il contratto dell'API vive in un solo posto.

export const CATEGORIES = ['Musica', 'Sport', 'Arte', 'Cibo', 'Teatro', 'Tech'] as const;
export type EventCategory = (typeof CATEGORIES)[number];

export type Role = 'participant' | 'organizer' | 'admin';

/** Utente autenticato, come lo vede lui stesso (l'email non viene mai mostrata ad altri). */
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** Richiesta di un partecipante per diventare organizzatore. */
export interface OrganizerRequest {
  id: number;
  user: { id: number; name: string; email: string };
  message: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** Dati che un organizzatore inserisce per creare o modificare un evento. */
export interface EventInput {
  title: string;
  category: EventCategory;
  description: string;
  venue: string;
  lat: number;
  lng: number;
  /** Data e ora di inizio in formato ISO 8601 (UTC). */
  start: string;
  durationMinutes: number;
  /** Prezzo in euro; 0 = gratuito. */
  price: number;
  capacity: number;
}

/** Evento come lo restituisce l'API, con i dati calcolati per l'utente corrente. */
export interface EventSummary extends EventInput {
  id: number;
  organizer: { id: number; name: string };
  registeredCount: number;
  isFavorite: boolean;
  isRegistered: boolean;
}

export interface Participant {
  id: number;
  name: string;
  registeredAt: string;
}

/** Dettaglio evento: la lista iscritti è presente solo per l'organizzatore che lo gestisce. */
export interface EventDetail extends EventSummary {
  participants?: Participant[];
}

export type RegistrationStatus = 'open' | 'almost-full' | 'full' | 'closed';

/** Soglia oltre la quale un evento è "quasi completo". */
export const ALMOST_FULL_RATIO = 0.8;

export function registrationStatus(
  e: Pick<EventSummary, 'start' | 'capacity' | 'registeredCount'>,
  now = Date.now(),
): RegistrationStatus {
  if (new Date(e.start).getTime() <= now) return 'closed';
  if (e.registeredCount >= e.capacity) return 'full';
  if (e.registeredCount >= e.capacity * ALMOST_FULL_RATIO) return 'almost-full';
  return 'open';
}
