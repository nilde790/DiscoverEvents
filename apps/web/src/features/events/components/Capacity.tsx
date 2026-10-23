import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';

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
