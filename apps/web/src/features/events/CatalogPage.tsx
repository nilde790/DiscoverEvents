import { useState } from 'react';
import { CATEGORIES, registrationStatus } from '@discoverevent/shared/types';
import { EventCompactCard } from '@/features/events/components/EventCompactCard';
import { SearchFilters } from '@/features/events/components/SearchFilters';
import { useEvents } from '@/features/events/EventsContext';
import { useEventFilters } from '@/features/events/hooks/useEventFilters';
import { useNearbyEvents, type EventWithDistance } from '@/features/events/hooks/useNearbyEvents';
import { CitySearch } from '@/features/places/CitySearch';
import { useChosenPlace } from '@/features/places/useChosenPlace';
import { formatDayHeading, startOfDay } from '@/lib/format';

type SortKey = 'date' | 'distance' | 'popular';

const SORTERS: Record<SortKey, (a: EventWithDistance, b: EventWithDistance) => number> = {
  date: (a, b) => a.start.localeCompare(b.start),
  distance: (a, b) => a.distanceKm - b.distanceKm,
  popular: (a, b) => b.registeredCount / b.capacity - a.registeredCount / a.capacity,
};

/** Distanze proposte; "Tutta Italia" toglie il limite. */
const RADIUS_OPTIONS = [10, 25, 50];
const ALL_ITALY = 'tutta-italia';

/** Raggruppa per giorno una lista già ordinata per data. */
function groupByDay(list: EventWithDistance[]) {
  const groups: { day: Date; events: EventWithDistance[] }[] = [];
  for (const e of list) {
    const day = startOfDay(e.start);
    const last = groups.at(-1);
    if (last && last.day.getTime() === day.getTime()) last.events.push(e);
    else groups.push({ day, events: [e] });
  }
  return groups;
}

export function CatalogPage() {
  const { events, loading, error } = useEvents();
  // Città e distanze sono le stesse della mappa (la città scelta è ricordata nel browser).
  const { place, choose } = useChosenPlace();
  const nearby = useNearbyEvents(events, place);
  const filters = useEventFilters();
  const [sort, setSort] = useState<SortKey>('date');
  const [radiusKm, setRadiusKm] = useState<number | null>(25);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [changingCity, setChangingCity] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = nearby.events
    .filter((e) => {
      const status = registrationStatus(e);
      if (radiusKm !== null && e.distanceKm > radiusKm) return false;
      if (!showPast && status === 'closed') return false;
      if (onlyAvailable && (status === 'full' || status === 'closed')) return false;
      return filters.matches(e);
    })
    .sort(SORTERS[sort]);

  // Quanti filtri si discostano da quelli iniziali, per il pulsante su telefono.
  const changedFilters =
    (filters.query.trim() ? 1 : 0) +
    (filters.categories.size < CATEGORIES.length ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (showPast ? 1 : 0) +
    (sort !== 'date' ? 1 : 0);

  const count = `${list.length} ${list.length === 1 ? 'evento' : 'eventi'}`;
  const where = radiusKm === null ? 'in tutta Italia' : `entro ${radiusKm} km ${nearby.from}`;

  return (
    <div className="page">
      <div className="catalog-head">
        <div className="page-head">
          <h1>{radiusKm === null ? 'Tutti gli eventi' : 'Eventi vicino a te'}</h1>
          <p className="muted">{loading ? 'Caricamento…' : `${count} ${where}`}</p>
        </div>
        <div className="catalog-place">
          <label className="inline">
            Distanza
            <select
              value={radiusKm ?? ALL_ITALY}
              onChange={(e) => setRadiusKm(e.target.value === ALL_ITALY ? null : Number(e.target.value))}
            >
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  Entro {km} km
                </option>
              ))}
              <option value={ALL_ITALY}>Tutta Italia</option>
            </select>
          </label>
          <button
            type="button"
            className="link"
            aria-expanded={changingCity}
            onClick={() => setChangingCity((open) => !open)}
          >
            {changingCity ? 'Chiudi' : 'Cambia città'}
          </button>
        </div>
      </div>

      {changingCity && (
        <CitySearch
          place={place}
          centerLabel={nearby.label}
          onChoose={(p) => {
            choose(p);
            setChangingCity(false);
          }}
        />
      )}

      {/* Su telefono i filtri stanno dietro a questo pulsante, così gli eventi arrivano subito. */}
      <button
        type="button"
        className="btn btn-secondary catalog-filters-toggle"
        aria-expanded={filtersOpen}
        aria-controls="filtri-catalogo"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        Filtri{changedFilters > 0 && ` (${changedFilters})`}
      </button>
      <div id="filtri-catalogo" className={`catalog-filters ${filtersOpen ? 'open' : ''}`}>
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
      </div>

      {error && <div className="notice error">{error}</div>}

      {/* Per data gli eventi stanno sotto il loro giorno; con gli altri ordinamenti i giorni si mescolano. */}
      {sort === 'date' ? (
        groupByDay(list).map((g) => (
          <section key={g.day.getTime()} className="section">
            <h2 className="day-head">{formatDayHeading(g.day)}</h2>
            <div className="ec-grid">
              {g.events.map((e) => (
                <EventCompactCard key={e.id} event={e} distanceKm={e.distanceKm} timeOnly />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="ec-grid">
          {list.map((e) => (
            <EventCompactCard key={e.id} event={e} distanceKm={e.distanceKm} />
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <p className="placeholder">
          Nessun evento corrisponde alla ricerca
          {radiusKm !== null && ': prova ad aumentare la distanza o a scegliere "Tutta Italia"'}.
        </p>
      )}
    </div>
  );
}
