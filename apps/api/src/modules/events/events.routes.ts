import { Router, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { registrationStatus } from '@discoverevent/shared/types';
import { eventInputSchema } from '@discoverevent/shared/validation';
import { transaction } from '../../db/database';
import { HttpError, idParam, parseBody } from '../../lib/http';
import { currentUser, optionalUser, requireRole } from '../../middleware/auth';
import type { EventsRepository } from './events.repository';

interface EventsDeps {
  db: DatabaseSync;
  events: EventsRepository;
}

/** Eventi, iscrizioni e preferiti: /api/events/... */
export function createEventsRouter({ db, events }: EventsDeps) {
  const router = Router();

  /** Carica l'evento e verifica che l'utente corrente ne sia l'organizzatore. */
  const ownedEvent = (req: Request, res: Response) => {
    const user = currentUser(res);
    const event = events.getEvent(idParam(req, 'evento'), user.id);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    if (event.organizer.id !== user.id) throw new HttpError(403, 'Puoi gestire solo i tuoi eventi');
    return { user, event };
  };

  router.get('/events', (_req, res) => {
    res.json(events.listEvents(optionalUser(res)?.id ?? 0));
  });

  router.get('/events/:id', (req, res) => {
    const event = events.getEventDetail(idParam(req, 'evento'), optionalUser(res)?.id ?? 0);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    res.json(event);
  });

  router.post('/events', (req, res) => {
    const user = requireRole(res, 'organizer', 'Solo gli organizzatori possono creare eventi');
    const input = parseBody(eventInputSchema, req.body, 'Dati evento non validi');
    if (new Date(input.start).getTime() <= Date.now()) {
      throw new HttpError(400, 'Dati evento non validi', { start: "L'evento deve essere nel futuro" });
    }
    const id = events.createEvent(input, user.id);
    res.status(201).json(events.getEventDetail(id, user.id));
  });

  router.put('/events/:id', (req, res) => {
    const { user, event } = ownedEvent(req, res);
    const input = parseBody(eventInputSchema, req.body, 'Dati evento non validi');
    if (input.capacity < event.registeredCount) {
      throw new HttpError(409, 'Dati evento non validi', {
        capacity: `Ci sono già ${event.registeredCount} iscritti: i posti non possono essere meno`,
      });
    }
    events.updateEvent(event.id, input);
    res.json(events.getEventDetail(event.id, user.id));
  });

  router.delete('/events/:id', (req, res) => {
    const { event } = ownedEvent(req, res);
    events.deleteEvent(event.id);
    res.status(204).end();
  });

  router.put('/events/:id/registration', (req, res) => {
    const user = currentUser(res);
    const eventId = idParam(req, 'evento');
    // Controllo e inserimento nella stessa transazione: due richieste insieme non superano il limite.
    const updated = transaction(db, () => {
      const event = events.getEvent(eventId, user.id);
      if (!event) throw new HttpError(404, 'Evento non trovato');
      if (event.organizer.id === user.id) throw new HttpError(409, 'Non puoi iscriverti a un tuo evento');
      if (event.isRegistered) return event;
      const status = registrationStatus(event);
      if (status === 'closed') throw new HttpError(409, 'Le iscrizioni a questo evento sono chiuse');
      if (status === 'full') throw new HttpError(409, 'Evento al completo');
      events.addRegistration(user.id, eventId);
      return events.getEvent(eventId, user.id)!;
    });
    res.json(updated);
  });

  router.delete('/events/:id/registration', (req, res) => {
    const user = currentUser(res);
    const event = events.getEvent(idParam(req, 'evento'), user.id);
    if (!event) throw new HttpError(404, 'Evento non trovato');
    if (registrationStatus(event) === 'closed') {
      throw new HttpError(409, "L'evento è già iniziato: non puoi più annullare l'iscrizione");
    }
    events.removeRegistration(user.id, event.id);
    res.json(events.getEvent(event.id, user.id));
  });

  for (const [method, favorite] of [
    ['put', true],
    ['delete', false],
  ] as const) {
    router[method]('/events/:id/favorite', (req, res) => {
      const user = currentUser(res);
      const eventId = idParam(req, 'evento');
      if (!events.getEvent(eventId, user.id)) throw new HttpError(404, 'Evento non trovato');
      events.setFavorite(user.id, eventId, favorite);
      res.json(events.getEvent(eventId, user.id));
    });
  }

  return router;
}
