import { CATEGORY_COLORS } from '../services';
import type { EventWithDistance } from '../types';
import { formatDate, formatDistance, formatPrice } from '../utils/format';

interface Props {
  events: EventWithDistance[];
  selected: EventWithDistance | null;
  onSelect: (id: string) => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function EventDetail({ event }: { event: EventWithDistance }) {
  const fill = Math.round((event.attendees / event.capacity) * 100);
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  return (
    <article className="detail">
      <span className="badge" style={{ background: CATEGORY_COLORS[event.category] }}>
        {event.category}
      </span>
      <h2>{event.title}</h2>
      <p className="muted">{event.venue} · {formatDistance(event.distanceKm)} da te</p>
      <p>{event.description}</p>
      <dl className="facts">
        <dt>Inizio</dt>
        <dd>{formatDate(event.start)}</dd>
        <dt>Fine</dt>
        <dd>{formatDate(end)}</dd>
        <dt>Prezzo</dt>
        <dd>{formatPrice(event.price)}</dd>
        <dt>Partecipanti</dt>
        <dd>
          {event.attendees} / {event.capacity}
          <div className="bar" aria-label={`Riempimento ${fill}%`}>
            <div style={{ width: `${fill}%` }} />
          </div>
        </dd>
      </dl>
    </article>
  );
}

export function EventDashboard({ events, selected, onSelect }: Props) {
  const free = events.filter((e) => e.price === 0).length;
  const nearest = events[0];

  return (
    <aside className="dashboard">
      <div className="stats">
        <Stat label="Eventi in zona" value={String(events.length)} />
        <Stat label="Gratuiti" value={String(free)} />
        <Stat label="Il più vicino" value={nearest ? formatDistance(nearest.distanceKm) : '—'} />
      </div>

      {selected ? (
        <EventDetail event={selected} />
      ) : (
        <p className="placeholder">Seleziona un evento sulla mappa o nella lista per vederne i dettagli.</p>
      )}

      <h3>Tutti gli eventi</h3>
      <ul className="list">
        {events.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className={e.id === selected?.id ? 'active' : ''}
              onClick={() => onSelect(e.id)}
            >
              <span className="dot" style={{ background: CATEGORY_COLORS[e.category] }} />
              <span className="list-title">{e.title}</span>
              <span className="muted">{formatDistance(e.distanceKm)} · {formatDate(e.start)}</span>
            </button>
          </li>
        ))}
        {events.length === 0 && <li className="muted">Nessun evento con questi filtri.</li>}
      </ul>
    </aside>
  );
}
