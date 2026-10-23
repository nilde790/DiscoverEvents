import { useState, type FormEvent } from 'react';
import type { Place } from '@discoverevent/shared/types';
import { placeSearchSchema } from '@discoverevent/shared/validation';
import { api, ApiError } from '@/lib/api';

interface Props {
  /** Città scelta, oppure `null` se si usa la posizione del dispositivo. */
  place: Place | null;
  /** Nome del centro attuale della mappa: la città scelta, "La tua posizione" o Roma. */
  centerLabel: string;
  onChoose: (place: Place | null) => void;
}

/**
 * Cerca una città per nome e sposta lì il centro della mappa.
 * La ricerca parte solo con "Cerca" (non a ogni lettera): il servizio gratuito che usiamo lo richiede.
 */
export function CitySearch({ place, centerLabel, onChoose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const pick = (p: Place | null) => {
    onChoose(p);
    setResults(null);
    setQuery('');
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = placeSearchSchema.safeParse({ q: query });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const found = await api.searchPlaces(parsed.data.q);
      if (found.length === 1) pick(found[0]);
      else if (found.length === 0) setError(`Nessuna città trovata per "${parsed.data.q}"`);
      else setResults(found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ricerca non riuscita');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="city-search">
      <span className="city-current" title="Centro della ricerca">
        📍 {centerLabel}
      </span>
      <form onSubmit={onSubmit} className="city-form" role="search">
        <input
          type="search"
          className="search"
          placeholder="Cerca una città…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          aria-label="Cerca una città"
        />
        <button type="submit" className="btn btn-secondary" disabled={searching}>
          {searching ? 'Cerco…' : 'Cerca'}
        </button>
        {place && (
          <button type="button" className="btn btn-secondary" onClick={() => pick(null)}>
            Usa la mia posizione
          </button>
        )}
      </form>
      {error && (
        <p className="city-error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <ul className="city-results" aria-label="Città trovate">
          {results.map((p) => (
            <li key={p.label}>
              <button type="button" onClick={() => pick(p)}>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
