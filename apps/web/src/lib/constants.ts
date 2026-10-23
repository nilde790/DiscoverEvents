import type { EventCategory, RegistrationStatus, Role } from '@discoverevent/shared/types';

export const ROLE_LABELS: Record<Role, string> = {
  participant: 'Partecipante',
  organizer: 'Organizzatore',
  admin: 'Amministratore',
};
import type { LatLng } from '@/lib/geo';

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  Musica: '#7c3aed',
  Sport: '#16a34a',
  Arte: '#db2777',
  Cibo: '#ea580c',
  Teatro: '#0891b2',
  Tech: '#2563eb',
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  open: 'Iscrizioni aperte',
  'almost-full': 'Ultimi posti',
  full: 'Completo',
  closed: 'Concluso',
};

/** Centro di ripiego (dove si trovano i dati demo): Roma. */
export const FALLBACK_CENTER: LatLng = { lat: 41.9028, lng: 12.4964 };

/** Raggio massimo selezionabile sulla mappa. */
export const MAX_RADIUS_KM = 15;
