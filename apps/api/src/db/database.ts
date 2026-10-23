import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { seed } from './seed';

// apps/api/data/discoverevent.db, indipendente dalla cartella da cui si avvia il server.
const DEFAULT_DB_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'discoverevent.db');

/**
 * Versione dello schema, salvata nel database con PRAGMA user_version.
 * Da quando esistono account reali, ogni modifica allo schema richiede una migrazione
 * che conservi i dati: non si può più cancellare e ricreare il database.
 */
const SCHEMA_VERSION = 1;

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash  TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'organizer', 'admin')),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid      TEXT PRIMARY KEY,
    data     TEXT NOT NULL,
    expires  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organizer_requests (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    decided_at  TEXT,
    decided_by  INTEGER REFERENCES users(id)
  );

  -- Al massimo una richiesta in attesa per utente.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_request
    ON organizer_requests(user_id) WHERE status = 'pending';

  CREATE TABLE IF NOT EXISTS events (
    id                INTEGER PRIMARY KEY,
    title             TEXT NOT NULL,
    category          TEXT NOT NULL,
    description       TEXT NOT NULL,
    venue             TEXT NOT NULL,
    lat               REAL NOT NULL,
    lng               REAL NOT NULL,
    start             TEXT NOT NULL,
    duration_minutes  INTEGER NOT NULL,
    price             REAL NOT NULL,
    capacity          INTEGER NOT NULL CHECK (capacity > 0),
    organizer_id      INTEGER NOT NULL REFERENCES users(id),
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS registrations (
    user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (user_id, event_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    event_id  INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, event_id)
  );

  CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
`;

export function openDatabase(path = process.env.DB_PATH ?? DEFAULT_DB_PATH): DatabaseSync {
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
  if (n === 0) transaction(db, () => seed(db));
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
