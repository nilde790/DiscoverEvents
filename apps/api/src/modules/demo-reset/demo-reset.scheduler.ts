import type { DatabaseSync } from 'node:sqlite';
import { resetToDemoData } from './demo-reset.repository';

/** Ora italiana dell'azzeramento: di notte, quando il sito è meno usato. */
const RESET_HOUR = 4;
const CHECK_EVERY_MS = 5 * 60 * 1000;

const romeClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  hourCycle: 'h23',
});

/**
 * "Giornata demo" a cui appartiene un istante: la data letta sull'orologio italiano, che passa al
 * giorno dopo alle 4:00 invece che a mezzanotte. Es. 25 ottobre alle 3:59 → "2026-10-24".
 * Si parte dall'ora italiana e non da "UTC meno 4 ore", così le notti del cambio d'ora non sbagliano.
 */
export function demoDay(now: Date): string {
  const parts = Object.fromEntries(romeClock.formatToParts(now).map((p) => [p.type, Number(p.value)]));
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (parts.hour < RESET_HOUR) day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/**
 * Azzera i dati demo una volta al giorno. Invece di un timer lungo fino alle 4:00 controlla ogni
 * 5 minuti se la "giornata demo" è cambiata: regge il cambio dell'ora legale e un computer in
 * sospensione, e non richiede librerie per le espressioni cron.
 */
export function scheduleDemoReset(db: DatabaseSync, { includeAdmin = true } = {}) {
  let lastDay = demoDay(new Date());
  const timer = setInterval(() => {
    const today = demoDay(new Date());
    if (today === lastDay) return;
    lastDay = today;
    try {
      resetToDemoData(db, { includeAdmin });
      console.log(`Dati demo azzerati (${today}).`);
    } catch (err) {
      console.error('Azzeramento dei dati demo non riuscito:', err);
    }
  }, CHECK_EVERY_MS);
  // Non tiene acceso il processo solo per questo (es. nei test o allo spegnimento).
  timer.unref();
  return timer;
}
