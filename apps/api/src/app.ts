import bcrypt from 'bcryptjs';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import type { DatabaseSync } from 'node:sqlite';
import type { ZodType, ZodTypeDef } from 'zod';
import { registrationStatus, type Role, type User } from '@discoverevent/shared/types';
import {
  decisionSchema,
  eventInputSchema,
  fieldErrors,
  loginSchema,
  organizerRequestSchema,
  registerSchema,
} from '@discoverevent/shared/validation';
import { transaction } from './db/database';
import { createRepository } from './modules/events/events.repository';
import { SqliteSessionStore } from './db/session-store';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

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

export const SESSION_COOKIE = 'discoverevent.sid';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

/** Errore con codice HTTP: lanciato nelle rotte, trasformato in JSON dal gestore in fondo. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Express 4 non intercetta gli errori delle funzioni async: questo li passa al gestore degli errori. */
const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function createApp(db: DatabaseSync, options: AppOptions) {
  const repo = createRepository(db);
  const app = express();

  if (options.trustProxy) app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      name: SESSION_COOKIE,
      secret: options.sessionSecret,
      store: new SqliteSessionStore(db),
      resave: false,
      saveUninitialized: false, // nessun cookie finché l'utente non accede
      rolling: true, // la scadenza si sposta in avanti a ogni richiesta
      cookie: {
        httpOnly: true, // il JavaScript della pagina non può leggerlo
        sameSite: 'lax', // non viene inviato dalle richieste POST/PUT/DELETE di altri siti
        secure: options.secureCookies ?? false,
        maxAge: SESSION_MAX_AGE_MS,
      },
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.authAttemptsPerWindow ?? 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Troppi tentativi: riprova tra qualche minuto' },
  });

  // L'utente corrente si ricava dalla sessione, mai da dati inviati dal client.
  app.use('/api', (req, res, next) => {
    res.locals.user = req.session.userId ? repo.getUser(req.session.userId) : undefined;
    next();
  });

  const optionalUser = (res: Response) => res.locals.user as User | undefined;

  const currentUser = (res: Response): User => {
    const user = optionalUser(res);
    if (!user) throw new HttpError(401, 'Accedi per continuare');
    return user;
  };

  const requireRole = (res: Response, role: Role, message: string): User => {
    const user = currentUser(res);
    if (user.role !== role) throw new HttpError(403, message);
    return user;
  };

  const parse = <T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown, message: string): T => {
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, message, fieldErrors(parsed.error));
    return parsed.data;
  };

  const idParam = (req: Request, what: string) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, `Id ${what} non valido`);
    return id;
  };

  /** Nuovo id di sessione al login: impedisce di riutilizzare una sessione creata prima (session fixation). */
  const startSession = (req: Request, userId: number) =>
    new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.userId = userId;
        req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
      }),
    );

  // Hash fittizio: se l'email non esiste si esegue comunque un confronto, così il tempo di risposta
  // non rivela quali email sono registrate.
  const dummyHash = bcrypt.hashSync('password-fittizia', BCRYPT_COST);

  /** Ruolo e richiesta organizzatore: quello che serve al client dopo login o registrazione. */
  const sessionInfo = (userId: number) => ({
    user: repo.getUser(userId) ?? null,
    organizerRequest: repo.latestOrganizerRequest(userId) ?? null,
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ---------- Autenticazione ----------

  app.get('/api/auth/me', (_req, res) => {
    const user = optionalUser(res);
    res.json(user ? sessionInfo(user.id) : { user: null, organizerRequest: null });
  });

  app.post(
    '/api/auth/register',
    authLimiter,
    asyncRoute(async (req, res) => {
      const input = parse(registerSchema, req.body, 'Dati di registrazione non validi');
      if (repo.emailExists(input.email)) {
        throw new HttpError(409, 'Dati di registrazione non validi', {
          email: 'Esiste già un account con questa email',
        });
      }
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const userId = transaction(db, () => {
        const id = repo.createUser(input.name, input.email, passwordHash);
        // Chi vuole organizzare parte comunque come partecipante: decide l'amministratore.
        if (input.wantsOrganizer) repo.createOrganizerRequest(id, input.organizerMessage);
        return id;
      });
      await startSession(req, userId);
      res.status(201).json(sessionInfo(userId));
    }),
  );

  app.post(
    '/api/auth/login',
    authLimiter,
    asyncRoute(async (req, res) => {
      const input = parse(loginSchema, req.body, 'Dati di accesso non validi');
      const credentials = repo.getCredentials(input.email);
      const valid = await bcrypt.compare(input.password, credentials?.passwordHash ?? dummyHash);
      // Stesso messaggio per email sconosciuta e password sbagliata: non si rivela quale dei due è errato.
      if (!credentials || !valid) throw new HttpError(401, 'Email o password non corretti');
      await startSession(req, credentials.id);
      res.json(sessionInfo(credentials.id));
    }),
  );

  app.post('/api/auth/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie(SESSION_COOKIE);
      res.status(204).end();
    });
  });

  // ---------- Richieste per diventare organizzatore ----------

  app.post('/api/organizer-requests', (req, res) => {
    const user = currentUser(res);
    if (user.role !== 'participant') throw new HttpError(409, 'Il tuo account può già organizzare eventi');
    const { message } = parse(organizerRequestSchema, req.body ?? {}, 'Richiesta non valida');
    if (repo.latestOrganizerRequest(user.id)?.status === 'pending') {
      throw new HttpError(409, 'Hai già una richiesta in attesa di approvazione');
    }
    const id = repo.createOrganizerRequest(user.id, message);
    res.status(201).json(repo.getOrganizerRequest(id));
  });

  app.get('/api/admin/organizer-requests', (req, res) => {
    requireRole(res, 'admin', 'Area riservata agli amministratori');
    const status = req.query.status === 'pending' ? 'pending' : undefined;
    res.json(repo.listOrganizerRequests(status));
  });

  app.put('/api/admin/organizer-requests/:id', (req, res) => {
    const admin = requireRole(res, 'admin', 'Area riservata agli amministratori');
    const id = idParam(req, 'richiesta');
    const { decision } = parse(decisionSchema, req.body, 'Decisione non valida');
    const updated = transaction(db, () => {
      const request = repo.getOrganizerRequest(id);
      if (!request) throw new HttpError(404, 'Richiesta non trovata');
      if (request.status !== 'pending') throw new HttpError(409, 'Questa richiesta è già stata gestita');
      repo.decideOrganizerRequest(id, decision, admin.id);
      if (decision === 'approved' && repo.getUser(request.user.id)?.role === 'participant') {
        repo.setRole(request.user.id, 'organizer');
      }
      return repo.getOrganizerRequest(id);
    });
    res.json(updated);
  });

  // ---------- Eventi ----------

  /** Carica l'evento e verifica che l'utente corrente ne sia l'organizzatore. */
  const ownedEvent = (req: Request, res: Response) => {
    const user = currentUser(res);
    const event = repo.getEvent(idParam(req, 'evento'), user.id);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    if (event.organizer.id !== user.id) throw new HttpError(403, 'Puoi gestire solo i tuoi eventi');
    return { user, event };
  };

  app.get('/api/events', (_req, res) => {
    res.json(repo.listEvents(optionalUser(res)?.id ?? 0));
  });

  app.get('/api/events/:id', (req, res) => {
    const event = repo.getEventDetail(idParam(req, 'evento'), optionalUser(res)?.id ?? 0);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    res.json(event);
  });

  app.post('/api/events', (req, res) => {
    const user = requireRole(res, 'organizer', 'Solo gli organizzatori possono creare eventi');
    const input = parse(eventInputSchema, req.body, 'Dati evento non validi');
    if (new Date(input.start).getTime() <= Date.now()) {
      throw new HttpError(400, 'Dati evento non validi', { start: "L'evento deve essere nel futuro" });
    }
    const id = repo.createEvent(input, user.id);
    res.status(201).json(repo.getEventDetail(id, user.id));
  });

  app.put('/api/events/:id', (req, res) => {
    const { user, event } = ownedEvent(req, res);
    const input = parse(eventInputSchema, req.body, 'Dati evento non validi');
    if (input.capacity < event.registeredCount) {
      throw new HttpError(409, 'Dati evento non validi', {
        capacity: `Ci sono già ${event.registeredCount} iscritti: i posti non possono essere meno`,
      });
    }
    repo.updateEvent(event.id, input);
    res.json(repo.getEventDetail(event.id, user.id));
  });

  app.delete('/api/events/:id', (req, res) => {
    const { event } = ownedEvent(req, res);
    repo.deleteEvent(event.id);
    res.status(204).end();
  });

  app.put('/api/events/:id/registration', (req, res) => {
    const user = currentUser(res);
    const eventId = idParam(req, 'evento');
    // Controllo e inserimento nella stessa transazione: due richieste insieme non superano il limite.
    const updated = transaction(db, () => {
      const event = repo.getEvent(eventId, user.id);
      if (!event) throw new HttpError(404, 'Evento non trovato');
      if (event.organizer.id === user.id) throw new HttpError(409, 'Non puoi iscriverti a un tuo evento');
      if (event.isRegistered) return event;
      const status = registrationStatus(event);
      if (status === 'closed') throw new HttpError(409, 'Le iscrizioni a questo evento sono chiuse');
      if (status === 'full') throw new HttpError(409, 'Evento al completo');
      repo.addRegistration(user.id, eventId);
      return repo.getEvent(eventId, user.id)!;
    });
    res.json(updated);
  });

  app.delete('/api/events/:id/registration', (req, res) => {
    const user = currentUser(res);
    const event = repo.getEvent(idParam(req, 'evento'), user.id);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    if (registrationStatus(event) === 'closed') {
      throw new HttpError(409, "L'evento è già iniziato: non puoi più annullare l'iscrizione");
    }
    repo.removeRegistration(user.id, event.id);
    res.json(repo.getEvent(event.id, user.id));
  });

  for (const [method, favorite] of [['put', true], ['delete', false]] as const) {
    app[method]('/api/events/:id/favorite', (req, res) => {
      const user = currentUser(res);
      const eventId = idParam(req, 'evento');
      if (!repo.getEvent(eventId, user.id)) throw new HttpError(404, 'Evento non trovato');
      repo.setFavorite(user.id, eventId, favorite);
      res.json(repo.getEvent(eventId, user.id));
    });
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Risorsa non trovata' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, fields: err.fields });
      return;
    }
    // Corpo JSON malformato: è un errore del client, non del server.
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Richiesta non valida' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Errore interno del server' });
  });

  return app;
}
