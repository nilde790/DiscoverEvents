import type { EventProvider } from './eventProvider';
import { MockEventProvider } from './mockEventProvider';

/** Unico punto in cui si sceglie la sorgente dati dell'app. */
export const eventProvider: EventProvider = new MockEventProvider();

export const CATEGORY_COLORS = {
  Musica: '#7c3aed',
  Sport: '#16a34a',
  Arte: '#db2777',
  Cibo: '#ea580c',
  Teatro: '#0891b2',
  Tech: '#2563eb',
} as const;
