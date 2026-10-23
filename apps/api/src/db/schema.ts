// Struttura delle tabelle del database.

/**
 * Versione dello schema, salvata nel database con PRAGMA user_version.
 * Da quando esistono account reali, ogni modifica allo schema richiede una migrazione
 * che conservi i dati: non si può più cancellare e ricreare il database.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA = `
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
