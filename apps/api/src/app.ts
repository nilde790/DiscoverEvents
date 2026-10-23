import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { loadCurrentUser } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error-handler';
import { sessionMiddleware } from './middleware/session';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createUsersRepository } from './modules/auth/users.repository';
import { createEventsRepository } from './modules/events/events.repository';
import { createEventsRouter } from './modules/events/events.routes';
import { createOrganizerRequestsRepository } from './modules/organizer-requests/organizer-requests.repository';
import { createOrganizerRequestsRouter } from './modules/organizer-requests/organizer-requests.routes';

export interface AppOptions {
  /** Chiave con cui vengono firmati i cookie di sessione. In produzione arriva da SESSION_SECRET. */
  sessionSecret: string;
  /** Cookie solo su HTTPS: true in produzione, false in sviluppo su http://localhost. */
  secureCookies?: boolean;
  /** Necessario quando l'app sta dietro un proxy (es. l'hosting) che gestisce HTTPS. */
  trustProxy?: boolean;
  /** Tentativi di login/registrazione consentiti per IP ogni 15 minuti. */
  authAttemptsPerWindow?: number;
}

/** Monta l'applicazione: middleware comuni, poi le rotte di ogni modulo, poi la gestione degli errori. */
export function createApp(db: DatabaseSync, options: AppOptions) {
  const users = createUsersRepository(db);
  const events = createEventsRepository(db);
  const requests = createOrganizerRequestsRepository(db);

  const app = express();
  if (options.trustProxy) app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(sessionMiddleware(db, { secret: options.sessionSecret, secureCookies: options.secureCookies ?? false }));
  app.use('/api', loadCurrentUser(users));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api', createAuthRouter({ db, users, requests, attemptsPerWindow: options.authAttemptsPerWindow ?? 10 }));
  app.use('/api', createOrganizerRequestsRouter({ db, users, requests }));
  app.use('/api', createEventsRouter({ db, events }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
