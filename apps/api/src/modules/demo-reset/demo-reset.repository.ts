import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../../db/database';
import { seed } from '../../db/seed';

/**
 * Riporta il database ai soli dati demo: cancella account, eventi, iscrizioni, richieste e sessioni
 * (chi era connesso dovrà rientrare), poi ripopola con il seed. Tutto in una transazione:
 * se qualcosa va storto restano i dati di prima, mai un database a metà.
 */
export function resetToDemoData(db: DatabaseSync, { includeAdmin = true } = {}) {
  transaction(db, () => {
    // Prima le tabelle che puntano alle altre, così le chiavi esterne restano valide a ogni passo.
    db.exec(`
      DELETE FROM favorites;
      DELETE FROM registrations;
      DELETE FROM organizer_requests;
      DELETE FROM events;
      DELETE FROM users;
      DELETE FROM sessions;
    `);
    seed(db, { includeAdmin });
  });
}
