import { useMemo, useState } from 'react';
import { EventDashboard } from './components/EventDashboard';
import { Filters } from './components/Filters';
import { MapView } from './components/MapView';
import { useEvents } from './hooks/useEvents';
import { useGeolocation } from './hooks/useGeolocation';
import { CATEGORY_COLORS } from './services';
import type { EventCategory } from './types';

const ALL_CATEGORIES = new Set(Object.keys(CATEGORY_COLORS) as EventCategory[]);

export default function App() {
  const geo = useGeolocation();
  const { events, loading, error } = useEvents(geo.position);

  const [radiusKm, setRadiusKm] = useState(5);
  const [categories, setCategories] = useState<Set<EventCategory>>(ALL_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Il filtro è derivato: non si salva una seconda copia degli eventi nello stato.
  const visible = useMemo(
    () => events.filter((e) => e.distanceKm <= radiusKm && categories.has(e.category)),
    [events, radiusKm, categories],
  );
  const selected = visible.find((e) => e.id === selectedId) ?? null;

  const toggleCategory = (c: EventCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  if (!geo.position) return <div className="splash">Sto cercando la tua posizione…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <h1>DiscoverEvent</h1>
        <Filters
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          activeCategories={categories}
          onToggleCategory={toggleCategory}
        />
      </header>

      {geo.status === 'fallback' && (
        <div className="notice">Posizione non disponibile ({geo.error}): mostro gli eventi attorno a Roma.</div>
      )}
      {error && <div className="notice error">Errore nel caricamento eventi: {error}</div>}

      <main className="content">
        <section className="map-wrap">
          {loading && <div className="loading">Caricamento eventi…</div>}
          <MapView
            center={geo.position}
            radiusKm={radiusKm}
            events={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>
        <EventDashboard events={visible} selected={selected} onSelect={setSelectedId} />
      </main>
    </div>
  );
}
