import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { decisionSchema, organizerRequestSchema } from '@discoverevent/shared/validation';
import { transaction } from '../../db/database';
import { HttpError, idParam, parseBody } from '../../lib/http';
import { currentUser, requireRole } from '../../middleware/auth';
import type { UsersRepository } from '../auth/users.repository';
import type { OrganizerRequestsRepository } from './organizer-requests.repository';

interface OrganizerRequestsDeps {
  db: DatabaseSync;
  users: UsersRepository;
  requests: OrganizerRequestsRepository;
}

const ADMIN_ONLY = 'Area riservata agli amministratori';

/** Richieste per diventare organizzatore e loro gestione da parte dell'amministratore. */
export function createOrganizerRequestsRouter({ db, users, requests }: OrganizerRequestsDeps) {
  const router = Router();

  router.post('/organizer-requests', (req, res) => {
    const user = currentUser(res);
    if (user.role !== 'participant') throw new HttpError(409, 'Il tuo account può già organizzare eventi');
    const { message } = parseBody(organizerRequestSchema, req.body ?? {}, 'Richiesta non valida');
    if (requests.latestForUser(user.id)?.status === 'pending') {
      throw new HttpError(409, 'Hai già una richiesta in attesa di approvazione');
    }
    const id = requests.create(user.id, message);
    res.status(201).json(requests.get(id));
  });

  router.get('/admin/organizer-requests', (req, res) => {
    requireRole(res, 'admin', ADMIN_ONLY);
    const status = req.query.status === 'pending' ? 'pending' : undefined;
    res.json(requests.list(status));
  });

  router.put('/admin/organizer-requests/:id', (req, res) => {
    const admin = requireRole(res, 'admin', ADMIN_ONLY);
    const id = idParam(req, 'richiesta');
    const { decision } = parseBody(decisionSchema, req.body, 'Decisione non valida');
    const updated = transaction(db, () => {
      const request = requests.get(id);
      if (!request) throw new HttpError(404, 'Richiesta non trovata');
      if (request.status !== 'pending') throw new HttpError(409, 'Questa richiesta è già stata gestita');
      requests.decide(id, decision, admin.id);
      if (decision === 'approved' && users.getUser(request.user.id)?.role === 'participant') {
        users.setRole(request.user.id, 'organizer');
      }
      return requests.get(id);
    });
    res.json(updated);
  });

  return router;
}
