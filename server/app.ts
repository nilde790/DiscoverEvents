import express, { type NextFunction, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { registrationStatus, type User } from '../shared/types';
import { eventInputSchema, fieldErrors } from '../shared/validation';
import { transaction } from './db';
import { createRepository } from './repository';

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

export function createApp(db: DatabaseSync) {
  const repo = createRepository(db);
  const app = express();
  app.use(express.json());

  // Autenticazione DEMO: il client dichiara chi è con l'header X-User-Id.
  // Va bene per provare l'app, in produzione servirebbe un login vero (sessione o token).
  app.use('/api', (req, res, next) => {
    const id = Number(req.header('X-User-Id'));
    res.locals.user = Number.isInteger(id) ? repo.getUser(id) : undefined;
    next();
  });

  const currentUser = (res: Response): User => {
    const user = res.locals.user as User | undefined;
    if (!user) throw new HttpError(401, 'Seleziona un utente per continuare');
    return user;
  };

  const eventIdParam = (req: Request) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Id evento non valido');
    return id;
  };

  /** Carica l'evento e verifica che l'utente corrente ne sia l'organizzatore. */
  const ownedEvent = (req: Request, res: Response) => {
    const user = currentUser(res);
    const event = repo.getEvent(eventIdParam(req), user.id);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    if (event.organizer.id !== user.id) throw new HttpError(403, 'Puoi gestire solo i tuoi eventi');
    return { user, event };
  };

  const parseEvent = (body: unknown) => {
    const parsed = eventInputSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, 'Dati evento non validi', fieldErrors(parsed.error));
    return parsed.data;
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/users', (_req, res) => {
    res.json(repo.listUsers());
  });

  app.get('/api/events', (_req, res) => {
    const user = res.locals.user as User | undefined;
    res.json(repo.listEvents(user?.id ?? 0));
  });

  app.get('/api/events/:id', (req, res) => {
    const user = res.locals.user as User | undefined;
    const event = repo.getEventDetail(eventIdParam(req), user?.id ?? 0);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    res.json(event);
  });

  app.post('/api/events', (req, res) => {
    const user = currentUser(res);
    if (user.role !== 'organizer') throw new HttpError(403, 'Solo gli organizzatori possono creare eventi');
    const input = parseEvent(req.body);
    if (new Date(input.start).getTime() <= Date.now()) {
      throw new HttpError(400, 'Dati evento non validi', { start: "L'evento deve essere nel futuro" });
    }
    const id = repo.createEvent(input, user.id);
    res.status(201).json(repo.getEventDetail(id, user.id));
  });

  app.put('/api/events/:id', (req, res) => {
    const { user, event } = ownedEvent(req, res);
    const input = parseEvent(req.body);
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
    const eventId = eventIdParam(req);
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
    const event = repo.getEvent(eventIdParam(req), user.id);
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
      const eventId = eventIdParam(req);
      if (!repo.getEvent(eventId, user.id)) throw new HttpError(404, 'Evento non trovato');
      repo.setFavorite(user.id, eventId, favorite);
      res.json(repo.getEvent(eventId, user.id));
    });
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Risorsa non trovata' });
  });

  // Express 4 inoltra qui gli errori lanciati nelle rotte sincrone.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, fields: err.fields });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Errore interno del server' });
  });

  return app;
}
