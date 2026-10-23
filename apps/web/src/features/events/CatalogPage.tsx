import { useState } from 'react';
import { registrationStatus } from '@discoverevent/shared/types';
import { EventCard } from '@/features/events/components/EventCard';
import { SearchFilters } from '@/features/events/components/SearchFilters';
import { useEvents } from '@/features/events/EventsContext';
import { useEventFilters } from '@/features/events/hooks/useEventFilters';
import { useNearbyEvents, type EventWithDistance } from '@/features/events/hooks/useNearbyEvents';

type SortKey = 'date' | 'distance' | 'popular';

const SORTERS: Record<SortKey, (a: EventWithDistance, b: EventWithDistance) => number> = {
  date: (a, b) => a.start.localeCompare(b.start),
  distance: (a, b) => a.distanceKm - b.distanceKm,
  popular: (a, b) => b.registeredCount / b.capacity - a.registeredCount / a.capacity,
};

export function CatalogPage() {
  const { events, loading, error } = useEvents();
  const nearby = useNearbyEvents(events);
  const filters = useEventFilters();
  const [sort, setSort] = useState<SortKey>('date');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const list = nearby.events
    .filter((e) => {
      const status = registrationStatus(e);
      if (!showPast && status === 'closed') return false;
      if (onlyAvailable && (status === 'full' || status === 'closed')) return false;
      return filters.matches(e);
    })
    .sort(SORTERS[sort]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Catalogo eventi</h1>
        <p className="muted">{loading ? 'Caricamento…' : `${list.length} eventi trovati`}</p>
      </div>
      <SearchFilters filters={filters}>
        <label className="inline">
          Ordina per
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="date">Data</option>
            <option value="distance">Distanza</option>
            <option value="popular">Più richiesti</option>
          </select>
        </label>
        <label className="inline">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Solo con posti liberi
        </label>
        <label className="inline">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          Mostra eventi conclusi
        </label>
      </SearchFilters>

      {error && <div className="notice error">{error}</div>}
      <div className="grid">
        {list.map((e) => (
          <EventCard key={e.id} event={e} distanceKm={e.distanceKm} />
        ))}
      </div>
      {!loading && list.length === 0 && <p className="placeholder">Nessun evento corrisponde alla ricerca.</p>}
    </div>
  );
}
