import session from 'express-session';
import type { DatabaseSync } from 'node:sqlite';
import { SqliteSessionStore } from '../db/session-store';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export const SESSION_COOKIE = 'discoverevent.sid';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Sessione di login salvata nel database, identificata da un cookie firmato. */
export function sessionMiddleware(db: DatabaseSync, options: { secret: string; secureCookies: boolean }) {
  return session({
    name: SESSION_COOKIE,
    secret: options.secret,
    store: new SqliteSessionStore(db),
    resave: false,
    saveUninitialized: false, // nessun cookie finché l'utente non accede
    rolling: true, // la scadenza si sposta in avanti a ogni richiesta
    cookie: {
      httpOnly: true, // il JavaScript della pagina non può leggerlo
      sameSite: 'lax', // non viene inviato dalle richieste POST/PUT/DELETE di altri siti
      secure: options.secureCookies,
      maxAge: SESSION_MAX_AGE_MS,
    },
  });
}
