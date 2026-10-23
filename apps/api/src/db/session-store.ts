import session from 'express-session';
import type { DatabaseSync } from 'node:sqlite';

const DAY_MS = 24 * 60 * 60 * 1000;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;

type Callback = (err?: unknown) => void;

/**
 * Archivio delle sessioni nel database SQLite dell'app.
 * Quello predefinito di express-session tiene tutto in memoria: perde i login a ogni
 * riavvio e cresce senza limiti, per questo la documentazione lo sconsiglia in produzione.
 */
export class SqliteSessionStore extends session.Store {
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly db: DatabaseSync) {
    super();
    // Rimuove periodicamente le sessioni scadute; unref() non tiene acceso il processo solo per questo.
    this.cleanupTimer = setInterval(() => this.clearExpired(), CLEANUP_EVERY_MS);
    this.cleanupTimer.unref();
  }

  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void) {
    try {
      const row = this.db.prepare('SELECT data, expires FROM sessions WHERE sid = ?').get(sid) as
        | { data: string; expires: number }
        | undefined;
      if (!row || row.expires <= Date.now()) return callback(null, null);
      callback(null, JSON.parse(row.data));
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: Callback) {
    try {
      this.db
        .prepare('INSERT OR REPLACE INTO sessions (sid, data, expires) VALUES (?, ?, ?)')
        .run(sid, JSON.stringify(sess), expiresAt(sess));
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: Callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  /** Prolunga la scadenza quando l'utente è attivo (opzione "rolling" della sessione). */
  touch(sid: string, sess: session.SessionData, callback?: Callback) {
    try {
      this.db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?').run(expiresAt(sess), sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  clearExpired() {
    this.db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
  }
}

function expiresAt(sess: session.SessionData): number {
  const expires = sess.cookie?.expires;
  return expires ? new Date(expires).getTime() : Date.now() + DAY_MS;
}
