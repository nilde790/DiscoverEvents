/**
 * SPIKE: quanti eventi restituisce Ticketmaster Discovery API per alcune città italiane?
 *
 * Esperimento usa-e-getta: serve a decidere SE costruire l'importatore, non fa parte dell'app.
 * Uso:  npm run spike:ticketmaster -w @discoverevent/api        (città predefinite)
 *       npm run spike:ticketmaster -w @discoverevent/api -- 45.46,9.19 (una posizione a scelta)
 *
 * La chiave si legge da TICKETMASTER_API_KEY nel file apps/api/.env e non viene mai stampata.
 */

export {}; // rende il file un modulo, necessario per usare await fuori dalle funzioni

try {
  process.loadEnvFile();
} catch {
  /* nessun .env: si usano le variabili d'ambiente già presenti */
}

const API_KEY = process.env.TICKETMASTER_API_KEY;
if (!API_KEY) {
  console.error('Manca TICKETMASTER_API_KEY nel file apps/api/.env (vedi apps/api/.env.example).');
  process.exit(1);
}

const RADIUS_KM = 15;
const DAYS_AHEAD = 30;

const CITIES: Record<string, string> = {
  Roma: '41.9028,12.4964',
  Milano: '45.4642,9.1900',
  Napoli: '40.8518,14.2681',
  Torino: '45.0703,7.6869',
  Bologna: '44.4949,11.3426',
  Firenze: '43.7696,11.2558',
};

/** Solo i campi che ci servono per capire se i dati sono utilizzabili. */
interface TmEvent {
  name: string;
  dates?: { start?: { dateTime?: string } };
  classifications?: { segment?: { name?: string } }[];
  priceRanges?: unknown[];
  _embedded?: { venues?: { name?: string; location?: { latitude?: string } }[] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Data ISO senza millisecondi, il formato richiesto dall'API. */
const isoNoMs = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

async function search(latlong: string) {
  const now = new Date();
  const params = new URLSearchParams({
    apikey: API_KEY!,
    latlong,
    radius: String(RADIUS_KM),
    unit: 'km',
    startDateTime: isoNoMs(now),
    endDateTime: isoNoMs(new Date(now.getTime() + DAYS_AHEAD * 86_400_000)),
    size: '200',
    sort: 'date,asc',
    locale: '*',
  });
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
  if (res.status === 401) throw new Error('Chiave non valida o non ancora attiva (401).');
  if (res.status === 429) throw new Error('Limite di richieste superato (429): riprova tra poco.');
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const data = (await res.json()) as { page?: { totalElements?: number }; _embedded?: { events?: TmEvent[] } };
  return { total: data.page?.totalElements ?? 0, events: data._embedded?.events ?? [] };
}

const pct = (n: number, of: number) => (of === 0 ? '—' : `${Math.round((n / of) * 100)}%`);

async function report(label: string, latlong: string) {
  const { total, events } = await search(latlong);
  const bySegment = new Map<string, number>();
  for (const e of events) {
    const segment = e.classifications?.[0]?.segment?.name ?? 'Non classificato';
    bySegment.set(segment, (bySegment.get(segment) ?? 0) + 1);
  }
  const withCoords = events.filter((e) => e._embedded?.venues?.[0]?.location?.latitude).length;
  const withTime = events.filter((e) => e.dates?.start?.dateTime).length;
  const withPrice = events.filter((e) => e.priceRanges?.length).length;

  console.log(`\n=== ${label} (${RADIUS_KM} km, prossimi ${DAYS_AHEAD} giorni) ===`);
  console.log(`Eventi totali: ${total}  (analizzati: ${events.length})`);
  if (events.length === 0) return;
  console.log(
    `Per categoria: ${[...bySegment]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `${s} ${n}`)
      .join(', ')}`,
  );
  console.log(
    `Qualità dati: coordinate ${pct(withCoords, events.length)}, orario ${pct(withTime, events.length)}, prezzo ${pct(withPrice, events.length)}`,
  );
  console.log('Esempi:');
  for (const e of events.slice(0, 3)) {
    console.log(
      `  - ${e.dates?.start?.dateTime?.slice(0, 10) ?? '?'}  ${e.name}  @ ${e._embedded?.venues?.[0]?.name ?? '?'}`,
    );
  }
}

const custom = process.argv[2];
const targets = custom ? { 'Posizione indicata': custom } : CITIES;

for (const [label, latlong] of Object.entries(targets)) {
  try {
    await report(label, latlong);
  } catch (err) {
    console.error(`\n=== ${label} === ${err instanceof Error ? err.message : err}`);
    if (err instanceof Error && err.message.includes('401')) process.exit(1);
  }
  await sleep(300); // l'API consente al massimo 5 richieste al secondo
}
