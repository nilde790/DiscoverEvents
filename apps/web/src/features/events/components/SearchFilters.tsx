import type { ReactNode } from 'react';
import { CATEGORIES } from '@discoverevent/shared/types';
import { categoryClass } from '@/lib/constants';
import type { EventFiltersState } from '@/features/events/hooks/useEventFilters';

interface Props {
  filters: EventFiltersState;
  /** Controlli extra specifici della pagina (raggio, ordinamento...). */
  children?: ReactNode;
}

export function SearchFilters({ filters, children }: Props) {
  return (
    <div className="filters">
      <input
        type="search"
        className="search"
        placeholder="Cerca per titolo, luogo, organizzatore…"
        value={filters.query}
        onChange={(e) => filters.setQuery(e.target.value)}
        aria-label="Cerca eventi"
      />
      <div className="chips">
        {CATEGORIES.map((c) => {
          const active = filters.categories.has(c);
          return (
            <button
              key={c}
              type="button"
              className={`chip ${categoryClass(c)} ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => filters.toggleCategory(c)}
            >
              {c}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
