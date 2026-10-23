import { useState } from 'react';
import { CATEGORIES, type EventCategory, type EventSummary } from '../../shared/types';

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

  const matches = (e: EventSummary) => {
    if (!categories.has(e.category)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.description, e.venue, e.organizer.name].some((s) => s.toLowerCase().includes(q));
  };

  return { query, setQuery, categories, toggleCategory, matches };
}

export type EventFiltersState = ReturnType<typeof useEventFilters>;
