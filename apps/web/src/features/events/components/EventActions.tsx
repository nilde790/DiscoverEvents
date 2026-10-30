import { Link, useLocation } from 'react-router';
import { Star } from 'lucide-react';
import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { loginLink } from '@/lib/navigation';

interface Props {
  event: EventSummary;
  /** Solo l'icona della stella: card della Mappa e barra in basso della scheda su telefono. */
  compact?: boolean;
  /** Azione principale della scheda evento: pulsante largo, anche l'invito ad accedere è in evidenza. */
  large?: boolean;
}

/** Pulsanti preferito e iscrizione, con lo stato corretto per l'utente corrente. */
export function EventActions({ event, compact = false, large = false }: Props) {
  const { currentUser } = useAuth();
  const { toggleFavorite, toggleRegistration } = useEvents();
  const location = useLocation();
  const status = registrationStatus(event);
  const className = `actions ${compact ? 'compact' : ''} ${large ? 'large' : ''}`;
  // Completo o concluso: lo stato vale per tutti, anche per chi non ha fatto l'accesso.
  const unavailable = status === 'full' || status === 'closed';
  const unavailableButton = (
    <button type="button" className="btn" disabled>
      {status === 'full' ? 'Completo' : 'Concluso'}
    </button>
  );

  if (!currentUser) {
    return (
      <div className={className}>
        {unavailable ? (
          unavailableButton
        ) : (
          <Link to={loginLink(location.pathname)} className={`btn ${large ? '' : 'btn-secondary'}`}>
            Accedi per iscriverti
          </Link>
        )}
      </div>
    );
  }

  const isOwner = event.organizer.id === currentUser.id;

  let registerButton = null;
  if (isOwner) {
    registerButton = <span className="muted">Sei l'organizzatore</span>;
  } else if (event.isRegistered) {
    registerButton =
      status === 'closed' ? (
        unavailableButton
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => toggleRegistration(event)}>
          Annulla iscrizione
        </button>
      );
  } else if (unavailable) {
    registerButton = unavailableButton;
  } else {
    registerButton = (
      <button type="button" className="btn" onClick={() => toggleRegistration(event)}>
        Iscriviti
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        className={`fav ${event.isFavorite ? 'on' : ''}`}
        aria-pressed={event.isFavorite}
        aria-label={compact ? (event.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti') : undefined}
        title={event.isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        onClick={() => toggleFavorite(event)}
      >
        <Star size={16} fill={event.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
        {!compact && (event.isFavorite ? 'Nei preferiti' : 'Preferito')}
      </button>
      {registerButton}
    </div>
  );
}
