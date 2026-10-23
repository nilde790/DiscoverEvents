import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registrationStatus } from '@discoverevent/shared/types';
import { CategoryBadge, Capacity, EventActions, StatusBadge } from '@/features/events/components/EventBadges';
import { MapView } from '@/features/events/components/MapView';
import { SearchFilters } from '@/features/events/components/SearchFilters';
import { CATEGORY_COLORS, MAX_RADIUS_KM } from '@/lib/constants';
import { useApp } from '@/features/events/EventsContext';
import { useEventFilters } from '@/features/events/hooks/useEventFilters';
import { useNearbyEvents } from '@/features/events/hooks/useNearbyEvents';
import { endOf, formatDate, formatDistance, formatPrice, formatTime } from '@/lib/format';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/** Mappa della zona con dashboard laterale: la vista "vicino a me". */
export function ExplorePage() {
  const { events, loading } = useApp();
  const nearby = useNearbyEvents(events);
  const filters = useEventFilters();
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Sulla mappa solo eventi futuri o in corso: quelli conclusi stanno nel catalogo.
  const visible = nearby.events
    .filter((e) => e.distanceKm <= radiusKm && filters.matches(e) && registrationStatus(e) !== 'closed')
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const selected = visible.find((e) => e.id === selectedId) ?? null;
  const available = visible.filter((e) => ['open', 'almost-full'].includes(registrationStatus(e))).length;

  if (nearby.locating) return <div className="splash">Sto cercando la tua posizione…</div>;

  return (
    <div className="explore">
      <div className="subbar">
        <SearchFilters filters={filters}>
          <label className="radius">
            Raggio <strong>{radiusKm} km</strong>
            <input
              type="range"
              min={1}
              max={MAX_RADIUS_KM}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
          </label>
        </SearchFilters>
      </div>
      {nearby.notice && <div className="notice">{nearby.notice}</div>}

      <div className="explore-body">
        <section className="map-wrap">
          {loading && <div className="loading">Caricamento eventi…</div>}
          <MapView
            center={nearby.center}
            radiusKm={radiusKm}
            events={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        <aside className="dashboard">
          <div className="stats">
            <Stat label="Eventi in zona" value={String(visible.length)} />
            <Stat label="Con posti liberi" value={String(available)} />
            <Stat label="Il più vicino" value={visible[0] ? formatDistance(visible[0].distanceKm) : '—'} />
          </div>

          {selected ? (
            <article className="detail">
              <div className="card-top">
                <CategoryBadge event={selected} />
                <StatusBadge event={selected} />
              </div>
              <h2>{selected.title}</h2>
              <p className="muted">
                {selected.venue} · {formatDistance(selected.distanceKm)} da te
              </p>
              <dl className="facts">
                <dt>Quando</dt>
                <dd>
                  {formatDate(selected.start)} – {formatTime(endOf(selected.start, selected.durationMinutes))}
                </dd>
                <dt>Organizza</dt>
                <dd>{selected.organizer.name}</dd>
                <dt>Prezzo</dt>
                <dd>{formatPrice(selected.price)}</dd>
              </dl>
              <Capacity event={selected} />
              <EventActions event={selected} />
              <Link to={`/eventi/${selected.id}`} className="link">
                Apri la scheda completa →
              </Link>
            </article>
          ) : (
            <p className="placeholder">Seleziona un evento sulla mappa o nella lista per vederne i dettagli.</p>
          )}

          <h3>Eventi nel raggio</h3>
          <ul className="list">
            {visible.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={e.id === selectedId ? 'active' : ''}
                  onClick={() => setSelectedId(e.id)}
                >
                  <span className="dot" style={{ background: CATEGORY_COLORS[e.category] }} />
                  <span className="list-title">
                    {e.isFavorite && '★ '}
                    {e.title}
                  </span>
                  <span className="muted">
                    {formatDistance(e.distanceKm)} · {formatDate(e.start)}
                  </span>
                </button>
              </li>
            ))}
            {!loading && visible.length === 0 && (
              <li className="muted">Nessun evento con questi filtri: prova ad allargare il raggio.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
