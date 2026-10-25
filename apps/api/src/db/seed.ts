import bcrypt from 'bcryptjs';
import type { DatabaseSync } from 'node:sqlite';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@discoverevent/shared/demo';
import type { EventCategory } from '@discoverevent/shared/types';

/** Raggio predefinito attorno al centro di ogni città. */
const RADIUS_KM = 8;

type Local = Partial<Record<EventCategory, string[]>>;
interface City {
  name: string;
  center: { lat: number; lng: number };
  eventCount: number;
  /** Titoli e luoghi che hanno senso solo in questa città, aggiunti a quelli generici. */
  titles: Local;
  venues: Local;
  radiusKm?: number;
  /** Settore del cerchio in cui generare i punti (gradi, 0 = est, 90 = nord): evita il mare. */
  sector?: [number, number];
}

/** Città dei dati demo. Milano e Torino ne hanno qualcuno in più: sono le più ricche di eventi reali. */
const CITIES: City[] = [
  {
    name: 'Roma',
    center: { lat: 41.9028, lng: 12.4964 },
    eventCount: 35,
    titles: { Musica: ['DJ set sul Tevere'], Cibo: ['Degustazione vini laziali'] },
    venues: {
      Sport: ['Lungotevere', 'Villa Borghese'],
      Musica: ['Club a Testaccio'],
      Arte: ['Galleria al Pigneto'],
      Cibo: ['Mercato di Testaccio'],
      Teatro: ['Teatro di Trastevere'],
      Tech: ['Coworking San Lorenzo'],
    },
  },
  {
    name: 'Milano',
    center: { lat: 45.4642, lng: 9.19 },
    eventCount: 40,
    titles: {
      Cibo: ['Aperitivo sui Navigli', 'Degustazione vini lombardi'],
      Tech: ['Startup pitch night'],
    },
    venues: {
      Sport: ['Parco Sempione', 'Idroscalo'],
      Musica: ['Live club sui Navigli'],
      Arte: ['Galleria a Brera', 'Spazio in zona Tortona'],
      Cibo: ['Darsena'],
      Teatro: ['Teatro di Porta Romana'],
      Tech: ['Coworking Isola'],
    },
  },
  {
    name: 'Torino',
    center: { lat: 45.0703, lng: 7.6869 },
    eventCount: 38,
    titles: { Musica: ['DJ set ai Murazzi'], Cibo: ['Degustazione vini piemontesi', 'Merenda sinoira'] },
    venues: {
      Sport: ['Parco del Valentino', 'Lungo Po'],
      Musica: ['Club ai Murazzi'],
      Arte: ['Spazio a San Salvario'],
      Cibo: ['Mercato di Porta Palazzo'],
      Teatro: ['Teatro in Vanchiglia'],
      Tech: ['Coworking Aurora'],
    },
  },
  {
    name: 'Bologna',
    center: { lat: 44.4949, lng: 11.3426 },
    eventCount: 32,
    titles: { Cibo: ['Laboratorio di tortellini', 'Degustazione vini emiliani'] },
    venues: {
      Sport: ['Giardini Margherita', 'Colli bolognesi'],
      Musica: ['Club al Pratello'],
      Arte: ['Galleria in Strada Maggiore'],
      Cibo: ['Mercato delle Erbe', 'Quadrilatero'],
      Teatro: ['Teatro in Bolognina'],
      Tech: ['Aula Magna in zona universitaria'],
    },
  },
  {
    name: 'Napoli',
    // Centro spostato un po' a nord e solo la metà settentrionale del cerchio: a sud c'è il golfo.
    // Raggio più corto, così la metà di cerchio non resta troppo rada.
    center: { lat: 40.845, lng: 14.255 },
    eventCount: 33,
    radiusKm: 6,
    sector: [0, 180],
    titles: {
      Musica: ['Concerto sul lungomare'],
      Cibo: ['Degustazione vini campani', 'Festa della pizza napoletana'],
    },
    venues: {
      Sport: ['Lungomare Caracciolo', 'Bosco di Capodimonte'],
      Musica: ['Club al Vomero'],
      Arte: ['Galleria a Chiaia'],
      Cibo: ['Mercato della Pignasecca'],
      Teatro: ['Teatro ai Quartieri Spagnoli'],
      Tech: ['Coworking a Bagnoli'],
    },
  },
  {
    name: 'Firenze',
    center: { lat: 43.7696, lng: 11.2558 },
    eventCount: 32,
    titles: {
      Musica: ['DJ set sull’Arno'],
      Arte: ['Visita alle botteghe artigiane'],
      Cibo: ['Degustazione vini toscani'],
    },
    venues: {
      Sport: ['Parco delle Cascine', 'Lungarno'],
      Musica: ['Club in Santo Spirito'],
      Arte: ['Galleria in Oltrarno'],
      Cibo: ['Mercato di Sant’Ambrogio'],
      Teatro: ['Teatro in San Frediano'],
      Tech: ['Coworking a Novoli'],
    },
  },
];

/**
 * Ogni organizzatore demo si occupa di categorie coerenti con il suo nome.
 * `cities` limita l'organizzatore ad alcune città (altrimenti vale ovunque).
 */
const ORGANIZERS: { name: string; email: string; categories: EventCategory[]; cities?: string[] }[] = [
  { name: 'Associazione Arte Viva', email: 'arteviva@example.com', categories: ['Arte', 'Teatro', 'Musica'] },
  { name: 'Sport Insieme ASD', email: 'sportinsieme@example.com', categories: ['Sport'] },
  { name: 'Gusto Locale APS', email: 'gustolocale@example.com', categories: ['Cibo'] },
  { name: 'Tech Community Roma', email: DEMO_ACCOUNTS.organizer.email, categories: ['Tech'], cities: ['Roma'] },
  // Una community "Roma" fuori da Roma non sarebbe credibile: altrove il Tech lo organizza lei.
  {
    name: 'Officina Digitale',
    email: 'officinadigitale@example.com',
    categories: ['Tech'],
    cities: ['Milano', 'Torino', 'Bologna', 'Napoli', 'Firenze'],
  },
];

/** "Martina De Luca" -> "martina.de.luca@example.com" (example.com è un dominio riservato agli esempi). */
const toDemoEmail = (name: string) =>
  `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}@example.com`;
const PARTICIPANTS = [
  'Giulia Rossi',
  'Marco Bianchi',
  'Sara Romano',
  'Luca Colombo',
  'Chiara Ricci',
  'Matteo Marino',
  'Francesca Greco',
  'Davide Bruno',
  'Elena Gallo',
  'Andrea Conti',
  'Martina De Luca',
  'Simone Costa',
  'Valentina Giordano',
  'Alessio Mancini',
  'Federica Rizzo',
  'Paolo Lombardi',
  'Silvia Moretti',
  'Giorgio Barbieri',
  'Laura Fontana',
  'Riccardo Santoro',
];

const TEMPLATES: Record<EventCategory, { titles: string[]; venues: string[]; description: string }> = {
  Musica: {
    titles: ['Concerto jazz al tramonto', 'Live rock night', 'Orchestra in piazza', 'DJ set all’aperto'],
    venues: ['Auditorium', 'Live Club', 'Piazza Centrale', 'Arena Estiva'],
    description: 'Una serata di musica dal vivo con artisti locali e ospiti speciali. Apertura porte 30 minuti prima.',
  },
  Sport: {
    titles: ['Corsa non competitiva 10K', 'Torneo di basket 3x3', 'Yoga al parco', 'Calcetto amatoriale'],
    venues: ['Parco Comunale', 'Palazzetto', 'Campo Sportivo'],
    description: 'Evento sportivo aperto a tutti i livelli. Porta scarpe comode e una bottiglia d’acqua.',
  },
  Arte: {
    titles: ['Mostra di fotografia urbana', 'Vernissage pittura contemporanea', 'Tour della street art'],
    venues: ['Galleria Moderna', 'Spazio Ex-Fabbrica', 'Museo Civico'],
    description: 'Esposizione con visita guidata e incontro con gli autori al termine del percorso.',
  },
  Cibo: {
    titles: ['Street food festival', 'Mercato contadino', 'Laboratorio di pasta fresca'],
    venues: ['Piazza del Mercato', 'Enoteca Storica', 'Cortile del Castello'],
    description: 'Stand gastronomici, prodotti tipici e degustazioni guidate da produttori locali.',
  },
  Teatro: {
    titles: ['Commedia brillante', 'Serata di improvvisazione', 'Monologo d’autore'],
    venues: ['Teatro Comunale', 'Teatro Off', 'Chiostro'],
    description: 'Spettacolo teatrale adatto a tutto il pubblico, durata circa due ore con intervallo.',
  },
  Tech: {
    titles: ['Meetup React & TypeScript', 'Hackathon AI weekend', 'Talk: sviluppare con agenti AI'],
    venues: ['Coworking Hub', 'Incubatore Startup', 'Aula Magna Università'],
    description: 'Talk tecnici, networking e pizza finale. Posti limitati, iscrizione obbligatoria.',
  },
};

/** Generatore pseudo-casuale con seme: il database demo è sempre uguale. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seed(db: DatabaseSync, { includeAdmin = true } = {}) {
  const rand = mulberry32(42);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const categories = Object.keys(TEMPLATES) as EventCategory[];

  // Tutti gli account demo hanno la stessa password: basta calcolarne l'hash una volta.
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const addUser = (name: string, email: string, role: string) =>
    Number(insertUser.run(name, email, passwordHash, role).lastInsertRowid);

  // In produzione niente admin demo: la sua password è pubblica. Il vero admin si crea con admin:promote.
  if (includeAdmin) addUser('Amministratore Demo', DEMO_ACCOUNTS.admin.email, 'admin');
  // Chiave "città/categoria" -> id dell'organizzatore.
  const organizerFor = new Map<string, number>();
  for (const o of ORGANIZERS) {
    const id = addUser(o.name, o.email, 'organizer');
    for (const city of o.cities ?? CITIES.map((c) => c.name))
      for (const c of o.categories) organizerFor.set(`${city}/${c}`, id);
  }
  const participantIds = PARTICIPANTS.map((n) => addUser(n, toDemoEmail(n), 'participant'));

  // Due richieste in attesa, così l'area amministratore non parte vuota.
  const insertRequest = db.prepare('INSERT INTO organizer_requests (user_id, message) VALUES (?, ?)');
  insertRequest.run(participantIds[1], 'Organizzo serate di giochi da tavolo nel mio quartiere da due anni.');
  insertRequest.run(participantIds[4], 'Vorrei pubblicare le visite guidate gratuite della mia associazione.');

  const insertEvent = db.prepare(`
    INSERT INTO events (title, category, description, venue, lat, lng, start, duration_minutes, price, capacity, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertRegistration = db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)');

  for (const city of CITIES) {
    for (let i = 0; i < city.eventCount; i++) addEvent(city);
  }

  function addEvent(city: City) {
    const category = pick(categories);
    const t = TEMPLATES[category];
    const { center } = city;

    // Punto casuale nel cerchio (o nel suo settore), distribuito uniformemente sull'area.
    const [fromDeg, toDeg] = city.sector ?? [0, 360];
    const r = (city.radiusKm ?? RADIUS_KM) * Math.sqrt(rand());
    const theta = ((fromDeg + rand() * (toDeg - fromDeg)) * Math.PI) / 180;
    const dLat = (r / 6371) * (180 / Math.PI);
    const lat = center.lat + dLat * Math.sin(theta);
    const lng = center.lng + (dLat / Math.cos((center.lat * Math.PI) / 180)) * Math.cos(theta);

    // Da 3 giorni fa a 2 settimane avanti: alcuni eventi risultano già chiusi.
    const start = new Date();
    start.setDate(start.getDate() - 3 + Math.floor(rand() * 17));
    start.setHours(10 + Math.floor(rand() * 13), rand() < 0.5 ? 0 : 30, 0, 0);

    const capacity = pick([5, 8, 10, 15, 20, 30]);
    const eventId = Number(
      insertEvent.run(
        pick([...t.titles, ...(city.titles[category] ?? [])]),
        category,
        t.description,
        pick([...t.venues, ...(city.venues[category] ?? [])]),
        lat,
        lng,
        start.toISOString(),
        60 + Math.floor(rand() * 6) * 30,
        rand() < 0.35 ? 0 : Math.round(5 + rand() * 45),
        capacity,
        organizerFor.get(`${city.name}/${category}`)!,
      ).lastInsertRowid,
    );

    // Iscritti casuali, a volte fino a riempire l'evento.
    const howMany = Math.min(capacity, Math.floor(rand() * (capacity + 4)), participantIds.length);
    const shuffled = [...participantIds].sort(() => rand() - 0.5);
    for (const userId of shuffled.slice(0, howMany)) insertRegistration.run(userId, eventId);
  }
}
