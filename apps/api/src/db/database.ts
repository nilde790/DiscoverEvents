import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema';
import { seed } from './seed';

// apps/api/data/discoverevent.db, indipendente dalla cartella da cui si avvia il server.
export const DEFAULT_DB_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'discoverevent.db');

export interface OpenDatabaseOptions {
  /** Crea anche l'amministratore demo quando il database nuovo viene popolato (no in produzione). */
  seedDemoAdmin?: boolean;
}

export function openDatabase(path = DEFAULT_DB_PATH, { seedDemoAdmin = true }: OpenDatabaseOptions = {}): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);

  const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const hasTables = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (hasTables && version < 1) {
    // La versione 0 conteneva solo dati demo senza account: si può ricreare senza perdere nulla di reale.
    console.warn('Database demo di una versione precedente: lo ricreo con il nuovo schema.');
    db.exec(`DROP TABLE IF EXISTS favorites; DROP TABLE IF EXISTS registrations;
             DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS users;`);
  }

  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (n === 0) transaction(db, () => seed(db, { includeAdmin: seedDemoAdmin }));
  return db;
}

/** Esegue `fn` in una transazione: o vanno a buon fine tutte le scritture o nessuna. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
