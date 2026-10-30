import { registrationStatus, type EventSummary } from '@discoverevent/shared/types';
import { startOfDay } from '@/lib/format';

/** Le "scorciatoie" del Catalogo: ognuna è una riga in cima e un filtro con "Vedi tutti". */
export type QuickFilter = 'today' | 'weekend' | 'free' | 'last-seats';

export const QUICK_FILTERS: { key: QuickFilter; title: string }[] = [
  { key: 'today', title: 'Oggi' },
  { key: 'weekend', title: 'Questo weekend' },
  { key: 'free', title: 'Gratis' },
  { key: 'last-seats', title: 'Ultimi posti' },
];

/** Mezzanotte locale `days` giorni dopo `day`: giorni di calendario, così il cambio dell'ora legale non sposta il confine. */
const addDays = (day: Date, days: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);

/**
 * Sabato e domenica del weekend in corso o del prossimo, in ora locale.
 * Di sabato o domenica è quello in corso; dal lunedì al venerdì quello che arriva.
 */
export function weekendRange(now = new Date()): { from: Date; to: Date } {
  const today = startOfDay(now);
  const weekday = today.getDay(); // 0 = domenica, 6 = sabato
  const from = addDays(today, weekday === 0 ? -1 : 6 - weekday);
  // Il lunedì a mezzanotte, escluso.
  return { from, to: addDays(from, 2) };
}

/** `true` se l'evento rientra nella scorciatoia. */
export function matchesQuick(e: EventSummary, quick: QuickFilter, now = new Date()): boolean {
  const start = new Date(e.start);
  switch (quick) {
    case 'today':
      return startOfDay(start).getTime() === startOfDay(now).getTime();
    case 'weekend': {
      const { from, to } = weekendRange(now);
      return start >= from && start < to;
    }
    case 'free':
      return e.price === 0;
    case 'last-seats':
      return registrationStatus(e) === 'almost-full';
  }
}
