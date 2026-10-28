import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { CATEGORIES, registrationStatus } from '@discoverevent/shared/types';
import { Capacity } from '@/features/events/components/Capacity';
import { EventActions } from '@/features/events/components/EventActions';
import { CategoryBadge, StatusBadge } from '@/features/events/components/EventBadges';
import { MapView, type MapPadding } from '@/features/events/components/MapView';
import { SearchFilters } from '@/features/events/components/SearchFilters';
import { categoryClass, MAX_RADIUS_KM } from '@/lib/constants';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useEvents } from '@/features/events/EventsContext';
import { useEventFilters } from '@/features/events/hooks/useEventFilters';
import { useNearbyEvents } from '@/features/events/hooks/useNearbyEvents';
import { CitySearch } from '@/features/places/CitySearch';
import { useChosenPlace } from '@/features/places/useChosenPlace';
import { endOf, formatDate, formatDistance, formatPrice, formatTime } from '@/lib/format';

/** Stessa soglia del CSS: sotto questa larghezza filtri ed eventi diventano pannelli a scomparsa. */
const NARROW = '(max-width: 900px)';
/** Margine tra i pannelli e il bordo della mappa (--space-5) e larghezza del pannello eventi (.map-panel). */
const GAP = 24;
const PANEL_WIDTH = 400;
/** Su schermi stretti: barra di ricerca e crediti della mappa in alto, pannello chiuso in basso. */
const NARROW_PADDING: MapPadding = [100, 12, 220, 12];

/**
 * Altezza di un elemento, aggiornata quando cambia (es. le categorie vanno a capo).
 * Restituisce una callback ref: l'elemento può comparire dopo il primo render (prima c'è "Sto cercando…").
 */
function useHeight() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, height] as const;
}

/** Mappa a tutto schermo con filtri ed eventi in pannelli sopra: la vista "vicino a me". */
export function ExplorePage() {
  const { events, loading } = useEvents();
  const { place, choose } = useChosenPlace();
  const nearby = useNearbyEvents(events, place);
  const filters = useEventFilters();
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const narrow = useMediaQuery(NARROW);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const toolbarRef = useRef<HTMLButtonElement>(null);
  const [filtersRef, filtersHeight] = useHeight();
  const [panelRef, panelHeight] = useHeight();

  // Sulla mappa solo eventi futuri o in corso: quelli conclusi stanno nel catalogo.
  const visible = nearby.events
    .filter((e) => e.distanceKm <= radiusKm && filters.matches(e) && registrationStatus(e) !== 'closed')
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const selected = visible.find((e) => e.id === selectedId) ?? null;
  const available = visible.filter((e) => ['open', 'almost-full'].includes(registrationStatus(e))).length;
  // Quanti filtri si discostano da quelli iniziali (tutte le categorie, nessun testo).
  const changedFilters = (filters.query.trim() ? 1 : 0) + (filters.categories.size < CATEGORIES.length ? 1 : 0);

  // La mappa inquadra il raggio nella parte che i pannelli lasciano scoperta.
  const padding: MapPadding = narrow ? NARROW_PADDING : [filtersHeight + 2 * GAP, PANEL_WIDTH + 2 * GAP, GAP, GAP];
  // Su schermi stretti il dettaglio alza il pannello in basso: l'evento scelto va mostrato sopra.
  const focusPadding: MapPadding =
    narrow && !listOpen ? [NARROW_PADDING[0], NARROW_PADDING[1], panelHeight + 12, NARROW_PADDING[3]] : padding;

  const count =
    visible.length === 0 ? 'Nessun evento' : `${visible.length} ${visible.length === 1 ? 'evento' : 'eventi'}`;

  // Esc chiude i filtri e riporta il focus sulla barra, così chi usa la tastiera non si perde.
  const onFiltersKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && !e.defaultPrevented && filtersOpen) {
      setFiltersOpen(false);
      toolbarRef.current?.focus();
    }
  };

  if (nearby.locating) return <div className="splash">Sto cercando la tua posizione…</div>;

  return (
    <div className="explore">
      {nearby.notice && <div className="notice">{nearby.notice}</div>}

      <div className="explore-map">
        {loading && <div className="loading">Caricamento eventi…</div>}
        <MapView
          center={nearby.center}
          radiusKm={radiusKm}
          events={visible}
          selectedId={selectedId}
          onSelect={setSelectedId}
          padding={padding}
          focusPadding={focusPadding}
        />

        {/* Solo su schermi stretti: i filtri stanno dietro a questa barra, così la mappa arriva per prima. */}
        <button
          ref={toolbarRef}
          type="button"
          className="map-toolbar"
          aria-expanded={filtersOpen}
          aria-controls="filtri-mappa"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="map-toolbar-place">
            {nearby.label} · {radiusKm} km
          </span>
          <span className="map-toolbar-filters">Filtri{changedFilters > 0 && ` (${changedFilters})`}</span>
        </button>

        <section
          id="filtri-mappa"
          ref={filtersRef}
          className={`map-filters ${filtersOpen ? 'open' : ''}`}
          aria-label="Filtri"
          onKeyDown={onFiltersKeyDown}
        >
          <CitySearch place={place} centerLabel={nearby.label} onChoose={choose} />
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
          <button type="button" className="btn map-filters-done" onClick={() => setFiltersOpen(false)}>
            {visible.length === 0 ? 'Chiudi i filtri' : `Mostra ${count}`}
          </button>
        </section>

        <aside
          ref={panelRef}
          className={`map-panel ${listOpen ? 'open' : ''} ${selected ? 'has-selection' : ''}`}
          aria-label="Eventi nel raggio"
        >
          <div className="map-panel-head">
            <div>
              <strong>
                {count} entro {radiusKm} km
              </strong>
              {visible.length > 0 && (
                <span className="muted">
                  {available} con posti liberi · il più vicino a {formatDistance(visible[0].distanceKm)}
                </span>
              )}
            </div>
            <button
              type="button"
              className="link map-panel-toggle"
              aria-expanded={listOpen}
              onClick={() => setListOpen((open) => !open)}
            >
              {listOpen ? 'Torna alla mappa' : 'Vedi elenco'}
            </button>
          </div>

          {selected && (
            // La chiave fa ripartire l'animazione di comparsa a ogni nuova selezione.
            <article className="detail" key={selected.id}>
              <div className="card-top">
                <CategoryBadge event={selected} />
                <StatusBadge event={selected} />
                <button type="button" className="link detail-close" onClick={() => setSelectedId(null)}>
                  Chiudi
                </button>
              </div>
              <h2>{selected.title}</h2>
              <p className="muted">
                {selected.venue} · {formatDistance(selected.distanceKm)} {nearby.from}
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
          )}

          <ul className="list">
            {visible.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={e.id === selectedId ? 'active' : ''}
                  onClick={() => setSelectedId(e.id)}
                >
                  <span className={`dot ${categoryClass(e.category)}`} />
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
