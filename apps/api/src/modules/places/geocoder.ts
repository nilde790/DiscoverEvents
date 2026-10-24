import type { Place } from '@discoverevent/shared/types';
import { HttpError } from '../../lib/http';

/** Trasforma un nome di città in coordinate. Le rotte dipendono da questa interfaccia, i test ne usano una finta. */
export interface Geocoder {
  search(query: string): Promise<Place[]>;
}

interface NominatimOptions {
  /** Nominatim chiede di identificare l'app che fa le richieste (regole d'uso del servizio). */
  userAgent: string;
  baseUrl?: string;
  /** Sostituibile nei test, per non chiamare davvero il servizio. */
  fetchFn?: typeof fetch;
  /** Pausa minima tra due richieste: le regole d'uso consentono al massimo 1 richiesta al secondo. */
  minIntervalMs?: number;
}

/** Solo i campi della risposta di Nominatim che usiamo. */
interface NominatimResult {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string };
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const RESULTS_LIMIT = 5;

/**
 * Geocoding con Nominatim (OpenStreetMap): gratuito e senza chiave, ma con regole d'uso precise.
 * Per rispettarle le richieste passano dal server, che le mette in fila (1 al secondo)
 * e ricorda i risultati per un giorno: tante persone cercano le stesse città.
 */
export function createNominatimGeocoder({
  userAgent,
  baseUrl = 'https://nominatim.openstreetmap.org',
  fetchFn = fetch,
  minIntervalMs = 1100,
}: NominatimOptions): Geocoder {
  const cache = new Map<string, { at: number; places: Place[] }>();
  let queue: Promise<unknown> = Promise.resolve();
  let lastCallAt = 0;

  /** Esegue le richieste una alla volta, distanziate di almeno `minIntervalMs`. */
  const throttled = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(async () => {
      const wait = lastCallAt + minIntervalMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();
      return task();
    });
    queue = run.catch(() => undefined); // un errore non deve bloccare le richieste successive
    return run;
  };

  const fetchPlaces = async (query: string): Promise<Place[]> => {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'it', // per ora l'app è pensata per l'Italia: evita omonimi all'estero
      featureType: 'settlement', // solo città, paesi e frazioni, non vie o negozi
      limit: String(RESULTS_LIMIT),
      'accept-language': 'it',
    });
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}/search?${params}`, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new HttpError(502, 'Ricerca città non disponibile: riprova tra poco');
    }
    if (!res.ok) throw new HttpError(502, 'Ricerca città non disponibile: riprova tra poco');

    const results = (await res.json()) as NominatimResult[];
    const places = results.map((r) => {
      const name = r.name || r.display_name.split(',')[0];
      return {
        name,
        label: r.address?.state ? `${name}, ${r.address.state}` : name,
        lat: Number(r.lat),
        lng: Number(r.lon),
      };
    });
    // Lo stesso luogo può comparire più volte (es. comune e frazione omonima nella stessa regione).
    return places.filter((p, i) => places.findIndex((o) => o.label === p.label) === i);
  };

  return {
    async search(query) {
      const key = query.trim().toLowerCase();
      const cached = cache.get(key);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.places;

      const places = await throttled(() => fetchPlaces(key));
      if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!); // via la voce più vecchia
      cache.set(key, { at: Date.now(), places });
      return places;
    },
  };
}
