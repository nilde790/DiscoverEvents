import { Link } from 'react-router-dom';
import type { EventSummary } from '../../shared/types';
import { formatDate, formatDistance, formatPrice } from '../utils/format';
import { Capacity, CategoryBadge, EventActions, StatusBadge } from './EventBits';

interface Props {
  event: EventSummary;
  distanceKm?: number;
}

export function EventCard({ event, distanceKm }: Props) {
  return (
    <article className="card">
      <div className="card-top">
        <CategoryBadge event={event} />
        <StatusBadge event={event} />
      </div>
      <h3>
        <Link to={`/eventi/${event.id}`}>{event.title}</Link>
      </h3>
      <p className="muted">
        {formatDate(event.start)} · {event.venue}
        {distanceKm !== undefined && ` · ${formatDistance(distanceKm)}`}
      </p>
      <p className="muted">
        di {event.organizer.name} · <strong>{formatPrice(event.price)}</strong>
      </p>
      <Capacity event={event} />
      <EventActions event={event} />
    </article>
  );
}
