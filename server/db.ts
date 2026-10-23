import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { seed } from './seed';

const DB_PATH = process.env.DB_PATH ?? join(dirname(fileURLToPath(import.meta.url)), 'data', 'discoverevent.db');

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    role  TEXT NOT NULL CHECK (role IN ('participant', 'organizer'))
  );

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

export function openDatabase(path = DB_PATH): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);

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
