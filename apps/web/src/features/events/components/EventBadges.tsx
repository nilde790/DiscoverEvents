import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { CATEGORY_COLORS, STATUS_LABELS } from '@/lib/constants';

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
