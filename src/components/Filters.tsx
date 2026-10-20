import type { CSSProperties } from 'react';
import { MAX_RADIUS_KM } from '../hooks/useEvents';
import { CATEGORY_COLORS } from '../services';
import type { EventCategory } from '../types';

interface Props {
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  activeCategories: Set<EventCategory>;
  onToggleCategory: (c: EventCategory) => void;
}

const CATEGORIES = Object.keys(CATEGORY_COLORS) as EventCategory[];

export function Filters({ radiusKm, onRadiusChange, activeCategories, onToggleCategory }: Props) {
  return (
    <div className="filters">
      <label className="radius">
        Raggio: <strong>{radiusKm} km</strong>
        <input
          type="range"
          min={1}
          max={MAX_RADIUS_KM}
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        />
      </label>
      <div className="chips">
        {CATEGORIES.map((c) => {
          const active = activeCategories.has(c);
          return (
            <button
              key={c}
              type="button"
              className={`chip ${active ? 'active' : ''}`}
              style={{ '--chip-color': CATEGORY_COLORS[c] } as CSSProperties}
              aria-pressed={active}
              onClick={() => onToggleCategory(c)}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
