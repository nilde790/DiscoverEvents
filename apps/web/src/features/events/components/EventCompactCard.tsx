import { Link } from 'react-router';
import type { EventSummary } from '@discoverevent/shared/types';
import { useAuth } from '@/features/auth/AuthContext';
import { useEvents } from '@/features/events/EventsContext';
import { formatDate, formatDistance, formatPrice, formatTime } from '@/lib/format';
import { CategoryBadge, SeatsBadge } from './EventBadges';

interface Props {
  event: EventSummary;
  distanceKm?: number;
  /** Solo l'ora quando la card sta già sotto l'intestazione del suo giorno, altrimenti data e ora. */
  timeOnly?: boolean;
}

/** Card piccola per gli elenchi lunghi: tutta la card porta alla scheda, dove ci si iscrive. */
export function EventCompactCard({ event, distanceKm, timeOnly = false }: Props) {
  const { currentUser } = useAuth();
  const { toggleFavorite } = useEvents();

  return (
    <article className="ec">
      <div className="ec-top">
        <span className="ec-time">{timeOnly ? formatTime(event.start) : formatDate(event.start)}</span>
        <CategoryBadge event={event} />
        {/* I preferiti sono personali: senza accesso la stella non c'è. */}
        {currentUser && (
          <button
            type="button"
            className={`star-btn ${event.isFavorite ? 'on' : ''}`}
            aria-pressed={event.isFavorite}
            aria-label={
              event.isFavorite ? `Rimuovi ${event.title} dai preferiti` : `Aggiungi ${event.title} ai preferiti`
            }
            onClick={() => toggleFavorite(event)}
          >
            {event.isFavorite ? '★' : '☆'}
          </button>
        )}
      </div>
      <Link to={`/eventi/${event.id}`} className="ec-title">
        {event.title}
      </Link>
      <span className="ec-meta">
        {event.venue}
        {distanceKm !== undefined && ` · ${formatDistance(distanceKm)}`}
      </span>
      <div className="ec-foot">
        <strong>{formatPrice(event.price)}</strong>
        <SeatsBadge event={event} />
      </div>
    </article>
  );
}
