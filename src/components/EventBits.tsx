import { registrationStatus, type EventSummary } from '../../shared/types';
import { CATEGORY_COLORS, STATUS_LABELS } from '../constants';
import { useApp } from '../context/AppContext';

export function CategoryBadge({ event }: { event: EventSummary }) {
  return (
    <span className="badge" style={{ background: CATEGORY_COLORS[event.category] }}>
      {event.category}
    </span>
  );
}

export function StatusBadge({ event }: { event: EventSummary }) {
  const status = registrationStatus(event);
  return (
    <>
      <span className={`status status-${status}`}>{STATUS_LABELS[status]}</span>
      {event.isRegistered && (
        <span className="status status-registered">{status === 'closed' ? 'Hai partecipato' : 'Sei iscritto'}</span>
      )}
    </>
  );
}

/** Posti occupati con barra di riempimento. */
export function Capacity({ event }: { event: EventSummary }) {
  const fill = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  const left = Math.max(0, event.capacity - event.registeredCount);
  return (
    <div className="capacity">
      <span>
        {event.registeredCount} / {event.capacity} iscritti
        {left > 0 && registrationStatus(event) !== 'closed' && (
          <span className="muted"> · {left === 1 ? '1 posto libero' : `${left} posti liberi`}</span>
        )}
      </span>
      <div className="bar" role="progressbar" aria-valuenow={fill} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/** Pulsanti preferito e iscrizione, con lo stato corretto per l'utente corrente. */
export function EventActions({ event, compact = false }: { event: EventSummary; compact?: boolean }) {
  const { currentUser, toggleFavorite, toggleRegistration } = useApp();
  if (!currentUser) return null;

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
        {event.isFavorite ? '★' : '☆'}
        {!compact && (event.isFavorite ? ' Nei preferiti' : ' Preferito')}
      </button>
      {registerButton}
    </div>
  );
}
