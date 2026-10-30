import { useState } from 'react';
import { CATEGORIES, type EventCategory, type EventSummary } from '@discoverevent/shared/types';

/** Ricerca testuale + categorie attive: stato comune a mappa e catalogo. */
export function useEventFilters() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Set<EventCategory>>(() => new Set(CATEGORIES));

  const toggleCategory = (c: EventCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  /** Solo la categoria `c`; se era già l'unica scelta, tornano tutte. */
  const onlyCategory = (c: EventCategory) =>
    setCategories((prev) => (prev.size === 1 && prev.has(c) ? new Set(CATEGORIES) : new Set([c])));

  /** Solo la ricerca testuale, senza guardare le categorie (serve per contare gli eventi per categoria). */
  const matchesQuery = (e: EventSummary) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.description, e.venue, e.organizer.name].some((s) => s.toLowerCase().includes(q));
  };

  const matches = (e: EventSummary) => categories.has(e.category) && matchesQuery(e);

  return { query, setQuery, categories, toggleCategory, onlyCategory, matches, matchesQuery };
}

export type EventFiltersState = ReturnType<typeof useEventFilters>;
