import bcrypt from 'bcryptjs';
import type { DatabaseSync } from 'node:sqlite';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@discoverevent/shared/demo';
import type { EventCategory } from '@discoverevent/shared/types';

/** Centro dei dati demo: Roma. */
const CENTER = { lat: 41.9028, lng: 12.4964 };
const RADIUS_KM = 10;
const EVENT_COUNT = 90;

/** Ogni organizzatore demo si occupa di categorie coerenti con il suo nome. */
const ORGANIZERS: { name: string; email: string; categories: EventCategory[] }[] = [
  { name: 'Associazione Arte Viva', email: 'arteviva@example.com', categories: ['Arte', 'Teatro', 'Musica'] },
  { name: 'Sport Insieme ASD', email: 'sportinsieme@example.com', categories: ['Sport'] },
  { name: 'Gusto Locale APS', email: 'gustolocale@example.com', categories: ['Cibo'] },
  { name: 'Tech Community Roma', email: DEMO_ACCOUNTS.organizer.email, categories: ['Tech'] },
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
    titles: ['Concerto jazz al tramonto', 'Live rock night', 'Orchestra in piazza', 'DJ set sul fiume'],
    venues: ['Auditorium', 'Live Club', 'Piazza Centrale', 'Arena Estiva'],
    description: 'Una serata di musica dal vivo con artisti locali e ospiti speciali. Apertura porte 30 minuti prima.',
  },
  Sport: {
    titles: ['Corsa non competitiva 10K', 'Torneo di basket 3x3', 'Yoga al parco', 'Calcetto amatoriale'],
    venues: ['Parco Comunale', 'Palazzetto', 'Campo Sportivo', 'Lungotevere'],
    description: 'Evento sportivo aperto a tutti i livelli. Porta scarpe comode e una bottiglia d’acqua.',
  },
  Arte: {
    titles: ['Mostra di fotografia urbana', 'Vernissage pittura contemporanea', 'Tour della street art'],
    venues: ['Galleria Moderna', 'Spazio Ex-Fabbrica', 'Museo Civico'],
    description: 'Esposizione con visita guidata e incontro con gli autori al termine del percorso.',
  },
  Cibo: {
    titles: ['Street food festival', 'Degustazione vini laziali', 'Mercato contadino', 'Laboratorio di pasta fresca'],
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

export function seed(db: DatabaseSync) {
  const rand = mulberry32(42);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const categories = Object.keys(TEMPLATES) as EventCategory[];

  // Tutti gli account demo hanno la stessa password: basta calcolarne l'hash una volta.
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const addUser = (name: string, email: string, role: string) =>
    Number(insertUser.run(name, email, passwordHash, role).lastInsertRowid);

  addUser('Amministratore Demo', DEMO_ACCOUNTS.admin.email, 'admin');
  const organizerByCategory = {} as Record<EventCategory, number>;
  for (const o of ORGANIZERS) {
    const id = addUser(o.name, o.email, 'organizer');
    for (const c of o.categories) organizerByCategory[c] = id;
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

  for (let i = 0; i < EVENT_COUNT; i++) {
    const category = pick(categories);
    const t = TEMPLATES[category];

    // Punto casuale nel cerchio, distribuito uniformemente sull'area.
    const r = RADIUS_KM * Math.sqrt(rand());
    const theta = rand() * 2 * Math.PI;
    const dLat = (r / 6371) * (180 / Math.PI);
    const lat = CENTER.lat + dLat * Math.sin(theta);
    const lng = CENTER.lng + (dLat / Math.cos((CENTER.lat * Math.PI) / 180)) * Math.cos(theta);

    // Da 3 giorni fa a 2 settimane avanti: alcuni eventi risultano già chiusi.
    const start = new Date();
    start.setDate(start.getDate() - 3 + Math.floor(rand() * 17));
    start.setHours(10 + Math.floor(rand() * 13), rand() < 0.5 ? 0 : 30, 0, 0);

    const capacity = pick([5, 8, 10, 15, 20, 30]);
    const eventId = Number(
      insertEvent.run(
        pick(t.titles),
        category,
        t.description,
        pick(t.venues),
        lat,
        lng,
        start.toISOString(),
        60 + Math.floor(rand() * 6) * 30,
        rand() < 0.35 ? 0 : Math.round(5 + rand() * 45),
        capacity,
        organizerByCategory[category],
      ).lastInsertRowid,
    );

    // Iscritti casuali, a volte fino a riempire l'evento.
    const howMany = Math.min(capacity, Math.floor(rand() * (capacity + 4)), participantIds.length);
    const shuffled = [...participantIds].sort(() => rand() - 0.5);
    for (const userId of shuffled.slice(0, howMany)) insertRegistration.run(userId, eventId);
  }
}
