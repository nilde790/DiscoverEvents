import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { DEMO_ACCOUNTS } from '@discoverevent/shared/demo';
import type { PublicConfig } from '@discoverevent/shared/types';
import { loadCurrentUser } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error-handler';
import { sessionMiddleware } from './middleware/session';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createUsersRepository } from './modules/auth/users.repository';
import { createEventsRepository } from './modules/events/events.repository';
import { createEventsRouter } from './modules/events/events.routes';
import { createOrganizerRequestsRepository } from './modules/organizer-requests/organizer-requests.repository';
import { createOrganizerRequestsRouter } from './modules/organizer-requests/organizer-requests.routes';
import type { Geocoder } from './modules/places/geocoder';
import { createPlacesRouter } from './modules/places/places.routes';
import { createSiteConfigRouter } from './modules/site-config/site-config.routes';

export interface AppOptions {
  /** Chiave con cui vengono firmati i cookie di sessione. In produzione arriva da SESSION_SECRET. */
  sessionSecret: string;
  /** Cookie solo su HTTPS: true in produzione, false in sviluppo su http://localhost. */
  secureCookies?: boolean;
  /** Necessario quando l'app sta dietro un proxy (es. l'hosting) che gestisce HTTPS. */
  trustProxy?: boolean;
  /** Tentativi di login/registrazione consentiti per IP ogni 15 minuti. */
  authAttemptsPerWindow?: number;
  /** Servizio che trasforma i nomi delle città in coordinate (nei test, uno finto). */
  geocoder: Geocoder;
  /** Account demo amministratore utilizzabile (password pubblica): false in produzione. Default true. */
  demoAdminEnabled?: boolean;
  /** Modalità demo: registrazione disattivata, si entra solo con gli account demo. Default false. */
  demoMode?: boolean;
  /** Titolare ed email per l'informativa privacy, esposti da GET /api/config. */
  privacy?: PublicConfig['privacy'];
  /** Cartella con la build del frontend (apps/web/dist): se c'è, Express serve anche il sito. */
  staticDir?: string;
}

/** Monta l'applicazione: middleware comuni, poi le rotte di ogni modulo, poi la gestione degli errori. */
export function createApp(db: DatabaseSync, options: AppOptions) {
  const users = createUsersRepository(db);
  const events = createEventsRepository(db);
  const requests = createOrganizerRequestsRepository(db);

  // Unico punto che decide quali account non possono entrare: usato dal login e dalla sessione.
  const demoAdminEnabled = options.demoAdminEnabled ?? true;
  const isDisabledAccount = (email: string) => !demoAdminEnabled && email === DEMO_ACCOUNTS.admin.email;
  const demoMode = options.demoMode ?? false;

  const app = express();
  if (options.trustProxy) app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(sessionMiddleware(db, { secret: options.sessionSecret, secureCookies: options.secureCookies ?? false }));
  app.use('/api', loadCurrentUser(users, isDisabledAccount));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(
    '/api',
    createSiteConfigRouter({
      demoMode,
      privacy: options.privacy ?? { controllerName: null, contactEmail: null },
    }),
  );
  app.use(
    '/api',
    createAuthRouter({
      db,
      users,
      requests,
      attemptsPerWindow: options.authAttemptsPerWindow ?? 10,
      isDisabledAccount,
      registrationEnabled: !demoMode,
    }),
  );
  app.use('/api', createOrganizerRequestsRouter({ db, users, requests }));
  app.use('/api', createEventsRouter({ db, events }));
  app.use('/api', createPlacesRouter({ geocoder: options.geocoder }));

  app.use('/api', notFound);
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: options.staticDir });
    });
  }
  app.use(errorHandler);
  return app;
}
