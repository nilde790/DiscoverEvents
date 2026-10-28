import { Link, useLocation } from 'react-router';
import { Star } from 'lucide-react';
import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { loginLink } from '@/lib/navigation';

/** Pulsanti preferito e iscrizione, con lo stato corretto per l'utente corrente. */
export function EventActions({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  const { currentUser } = useAuth();
  const { toggleFavorite, toggleRegistration } = useEvents();
  const location = useLocation();
  if (!currentUser) {
    return (
      <div className={`actions ${compact ? 'compact' : ''}`}>
        <Link to={loginLink(location.pathname)} className="btn btn-secondary">
          Accedi per iscriverti
        </Link>
      </div>
    );
  }

  const status = registrationStatus(event);
  const isOwner = event.organizer.id === currentUser.id;

  let registerButton = null;
  if (isOwner) {
    registerButton = <span className="muted">Sei l'organizzatore</span>;
  } else if (event.isRegistered) {
    registerButton =
      status === 'closed' ? null : (
        <button type="button" className="btn btn-secondary" onClick={() => toggleRegistration(event)}>
          Annulla iscrizione
        </button>
      );
  } else {
    const disabled = status === 'closed' || status === 'full';
    registerButton = (
      <button type="button" className="btn" disabled={disabled} onClick={() => toggleRegistration(event)}>
        {status === 'full' ? 'Completo' : status === 'closed' ? 'Concluso' : 'Iscriviti'}
      </button>
    );
  }

  return (
    <div className={`actions ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className={`fav ${event.isFavorite ? 'on' : ''}`}
        aria-pressed={event.isFavorite}
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
