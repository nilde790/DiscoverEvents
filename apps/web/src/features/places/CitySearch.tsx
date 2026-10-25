import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Place } from '@discoverevent/shared/types';
import { placeSearchSchema } from '@discoverevent/shared/validation';
import { api, ApiError } from '@/lib/api';
import { loadComuni, suggestComuni, type Comune } from './comuni';

interface Props {
  /** Città scelta, oppure `null` se si usa la posizione del dispositivo. */
  place: Place | null;
  /** Nome del centro attuale della mappa: la città scelta, "La tua posizione" o Roma. */
  centerLabel: string;
  onChoose: (place: Place | null) => void;
}

/**
 * Cerca una città per nome e sposta lì il centro della mappa.
 * Mentre si scrive, i suggerimenti arrivano dall'elenco ISTAT dei comuni, nel browser:
 * il servizio di coordinate (Nominatim) si chiama una sola volta, quando si sceglie un comune
 * o si preme "Cerca" (utile per frazioni e località che non sono comuni). Le sue regole lo richiedono.
 */
export function CitySearch({ place, centerLabel, onChoose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [comuni, setComuni] = useState<Comune[]>([]);
  const [open, setOpen] = useState(false);
  /** Suggerimento evidenziato con le frecce; -1 = nessuno. */
  const [active, setActive] = useState(-1);
  const listId = useId();

  const suggestions = open ? suggestComuni(comuni, query) : [];
  const expanded = suggestions.length > 0;

  // L'elenco serve solo a chi scrive: si scarica alla prima lettera, non all'apertura della pagina.
  const wantsComuni = query.length > 0 && comuni.length === 0;
  useEffect(() => {
    if (!wantsComuni) return;
    let cancelled = false;
    loadComuni()
      .then((list) => !cancelled && setComuni(list))
      .catch(() => undefined); // senza elenco niente suggerimenti, ma "Cerca" funziona lo stesso
    return () => {
      cancelled = true;
    };
  }, [wantsComuni]);

  const pick = (p: Place | null) => {
    onChoose(p);
    setResults(null);
    setQuery('');
    setOpen(false);
  };

  /** Una richiesta al server per le coordinate di `q`; `choose` decide cosa fare dei risultati. */
  async function lookup(q: string, choose: (found: Place[]) => void) {
    setError(null);
    setSearching(true);
    try {
      choose(await api.searchPlaces(q));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ricerca non riuscita');
    } finally {
      setSearching(false);
    }
  }

  function chooseComune(c: Comune) {
    setOpen(false);
    setQuery(c.name);
    // La regione evita gli omonimi (Castro c'è in Lombardia e in Puglia); "Trentino-Alto Adige/Südtirol" → la prima parte.
    lookup(`${c.name}, ${c.region.split('/')[0]}`, (found) => {
      if (found.length === 0) setError(`Non trovo la posizione di ${c.name}: riprova con "Cerca"`);
      else pick({ ...found[0], name: c.name, label: `${c.name} (${c.province})` });
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (expanded && active >= 0) return chooseComune(suggestions[active]);
    const parsed = placeSearchSchema.safeParse({ q: query });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setOpen(false);
    const q = parsed.data.q;
    lookup(q, (found) => {
      if (found.length === 1) pick(found[0]);
      else if (found.length === 0) setError(`Nessuna città trovata per "${q}"`);
      else setResults(found);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (!expanded) return;
      const n = suggestions.length;
      const down = e.key === 'ArrowDown';
      // Dall'ultimo si torna al primo e viceversa.
      setActive((i) => (i < 0 ? (down ? 0 : n - 1) : (i + (down ? 1 : -1) + n) % n));
    } else if (e.key === 'Escape' && expanded) {
      e.preventDefault(); // altrimenti il campo di ricerca cancella anche il testo
      setOpen(false);
      setActive(-1);
    }
    // Invio: lo gestisce il form (onSubmit), sia con un suggerimento evidenziato sia senza.
  }

  return (
    <div className="city-search">
      <span className="city-current" title="Centro della ricerca">
        📍 {centerLabel}
      </span>
      <form onSubmit={onSubmit} className="city-form" role="search">
        <div className="city-combo">
          <input
            type="text"
            className="search"
            placeholder="Cerca una città…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setResults(null); // i risultati di un "Cerca" precedente non valgono più
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
            role="combobox"
            aria-label="Cerca una città"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
          />
          <ul id={listId} role="listbox" aria-label="Comuni suggeriti" className="city-suggestions" hidden={!expanded}>
            {suggestions.map((c, i) => (
              <li
                key={`${c.name}-${c.province}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : undefined}
                // mousedown e non click: il click arriverebbe dopo il blur, a elenco già chiuso.
                onMouseDown={(e) => {
                  e.preventDefault();
                  chooseComune(c);
                }}
              >
                {c.name} <span className="muted">({c.province})</span>
              </li>
            ))}
          </ul>
        </div>
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
