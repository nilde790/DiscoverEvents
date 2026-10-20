import type { EventCategory, EventItem, LatLng } from '../types';
import { randomPointNear } from '../utils/geo';
import type { EventProvider } from './eventProvider';

const TEMPLATES: Record<EventCategory, { titles: string[]; venues: string[]; description: string }> = {
  Musica: {
    titles: ['Concerto Jazz al tramonto', 'Live Rock Night', 'Orchestra in piazza', 'DJ set sul fiume'],
    venues: ['Auditorium', 'Live Club', 'Piazza Centrale', 'Arena Estiva'],
    description: 'Una serata di musica dal vivo con artisti locali e ospiti speciali.',
  },
  Sport: {
    titles: ['Corsa non competitiva 10K', 'Torneo di basket 3x3', 'Yoga al parco', 'Partita di calcio amatoriale'],
    venues: ['Parco Comunale', 'Palazzetto', 'Campo Sportivo', 'Lungofiume'],
    description: 'Evento sportivo aperto a tutti i livelli: porta scarpe comode e acqua.',
  },
  Arte: {
    titles: ['Mostra di fotografia urbana', 'Vernissage pittura contemporanea', 'Street art tour'],
    venues: ['Galleria Moderna', 'Spazio Ex-Fabbrica', 'Museo Civico'],
    description: 'Esposizione con visita guidata e incontro con gli autori.',
  },
  Cibo: {
    titles: ['Street food festival', 'Degustazione vini locali', 'Mercato contadino', 'Sagra della pasta fresca'],
    venues: ['Piazza del Mercato', 'Enoteca Storica', 'Cortile del Castello'],
    description: 'Stand gastronomici, prodotti tipici e degustazioni guidate.',
  },
  Teatro: {
    titles: ['Commedia brillante', 'Improvvisazione teatrale', 'Monologo d’autore'],
    venues: ['Teatro Comunale', 'Teatro Off', 'Chiostro'],
    description: 'Spettacolo teatrale adatto a tutto il pubblico, durata circa due ore.',
  },
  Tech: {
    titles: ['Meetup React & TypeScript', 'Hackathon AI weekend', 'Talk: lavorare con agenti AI'],
    venues: ['Coworking Hub', 'Incubatore Startup', 'Aula Magna Università'],
    description: 'Talk tecnici, networking e pizza finale. Ingresso con registrazione.',
  },
};

const CATEGORIES = Object.keys(TEMPLATES) as EventCategory[];

/** Generatore pseudo-casuale con seme: stessi input -> stessi eventi (utile per testare). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(arr: T[], rand: () => number) => arr[Math.floor(rand() * arr.length)];

export class MockEventProvider implements EventProvider {
  constructor(private readonly count = 120) {}

  async getEventsNear(center: LatLng, radiusKm: number): Promise<EventItem[]> {
    // Seme legato alla posizione arrotondata: la mappa non "cambia" a ogni ricarica.
    const rand = mulberry32(Math.round(center.lat * 100) * 100000 + Math.round(center.lng * 100));
    const now = Date.now();

    const events = Array.from({ length: this.count }, (_, i): EventItem => {
      const category = pick(CATEGORIES, rand);
      const t = TEMPLATES[category];
      const capacity = 50 + Math.floor(rand() * 950);
      // Nelle prossime 2 settimane, tra le 10:00 e le 22:00, a mezz'ore piene.
      const start = new Date(now);
      start.setDate(start.getDate() + Math.floor(rand() * 14));
      start.setHours(10 + Math.floor(rand() * 13), rand() < 0.5 ? 0 : 30, 0, 0);
      if (start.getTime() < now) start.setDate(start.getDate() + 1); // mai eventi già passati
      return {
        id: `mock-${i}`,
        title: pick(t.titles, rand),
        category,
        description: t.description,
        venue: pick(t.venues, rand),
        position: randomPointNear(center, radiusKm, rand),
        start,
        durationMinutes: 60 + Math.floor(rand() * 6) * 30,
        price: rand() < 0.35 ? 0 : Math.round(5 + rand() * 45),
        capacity,
        attendees: Math.floor(capacity * rand()),
      };
    });

    // Simula la latenza di rete per rendere visibili gli stati di caricamento.
    await new Promise((r) => setTimeout(r, 400));
    return events;
  }
}
