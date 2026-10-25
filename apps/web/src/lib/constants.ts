import type { EventCategory, RegistrationStatus, Role } from '@discoverevent/shared/types';

export const ROLE_LABELS: Record<Role, string> = {
  participant: 'Partecipante',
  organizer: 'Organizzatore',
  admin: 'Amministratore',
};
import type { LatLng } from '@/lib/geo';

/**
 * Classe CSS di una categoria (es. `cat-musica`): imposta la variabile `--cat`
 * con il colore definito in `styles/global.css`, usata da badge, chip, puntini e segnaposto.
 */
export const categoryClass = (category: EventCategory) => `cat-${category.toLowerCase()}`;

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
