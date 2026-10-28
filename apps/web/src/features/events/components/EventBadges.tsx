import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { categoryClass, STATUS_LABELS } from '@/lib/constants';

export function CategoryBadge({ event }: { event: EventSummary }) {
  return <span className={`badge ${categoryClass(event.category)}`}>{event.category}</span>;
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

/** Una sola pillola con i posti rimasti, per le card compatte: "17 posti liberi", "Ultimo posto", "Completo". */
export function SeatsBadge({ event }: { event: EventSummary }) {
  const status = registrationStatus(event);
  if (event.isRegistered) {
    return <span className="status status-registered">{status === 'closed' ? 'Hai partecipato' : 'Sei iscritto'}</span>;
  }
  const left = Math.max(0, event.capacity - event.registeredCount);
  let label: string = STATUS_LABELS[status];
  if (status === 'open') label = left === 1 ? '1 posto libero' : `${left} posti liberi`;
  if (status === 'almost-full') label = left === 1 ? 'Ultimo posto' : `Ultimi ${left} posti`;
  return <span className={`status status-${status}`}>{label}</span>;
}
