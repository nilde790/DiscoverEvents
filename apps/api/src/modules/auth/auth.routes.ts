import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { DatabaseSync } from 'node:sqlite';
import { loginSchema, registerSchema } from '@discoverevent/shared/validation';
import { transaction } from '../../db/database';
import { asyncRoute, HttpError, parseBody } from '../../lib/http';
import { optionalUser, startSession } from '../../middleware/auth';
import { SESSION_COOKIE } from '../../middleware/session';
import type { OrganizerRequestsRepository } from '../organizer-requests/organizer-requests.repository';
import type { UsersRepository } from './users.repository';

const BCRYPT_COST = 12;

interface AuthDeps {
  db: DatabaseSync;
  users: UsersRepository;
  requests: OrganizerRequestsRepository;
  /** Tentativi di login/registrazione consentiti per IP ogni 15 minuti. */
  attemptsPerWindow: number;
}

/** Registrazione, accesso, uscita e utente corrente: /api/auth/... */
export function createAuthRouter({ db, users, requests, attemptsPerWindow }: AuthDeps) {
  const router = Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: attemptsPerWindow,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Troppi tentativi: riprova tra qualche minuto' },
  });

  // Hash fittizio: se l'email non esiste si esegue comunque un confronto, così il tempo di risposta
  // non rivela quali email sono registrate.
  const dummyHash = bcrypt.hashSync('password-fittizia', BCRYPT_COST);

  /** Ruolo e richiesta organizzatore: quello che serve al client dopo login o registrazione. */
  const sessionInfo = (userId: number) => ({
    user: users.getUser(userId) ?? null,
    organizerRequest: requests.latestForUser(userId) ?? null,
  });

  router.get('/auth/me', (_req, res) => {
    const user = optionalUser(res);
    res.json(user ? sessionInfo(user.id) : { user: null, organizerRequest: null });
  });

  router.post(
    '/auth/register',
    authLimiter,
    asyncRoute(async (req, res) => {
      const input = parseBody(registerSchema, req.body, 'Dati di registrazione non validi');
      if (users.emailExists(input.email)) {
        throw new HttpError(409, 'Dati di registrazione non validi', {
          email: 'Esiste già un account con questa email',
        });
      }
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const userId = transaction(db, () => {
        const id = users.createUser(input.name, input.email, passwordHash);
        // Chi vuole organizzare parte comunque come partecipante: decide l'amministratore.
        if (input.wantsOrganizer) requests.create(id, input.organizerMessage);
        return id;
      });
      await startSession(req, userId);
      res.status(201).json(sessionInfo(userId));
    }),
  );

  router.post(
    '/auth/login',
    authLimiter,
    asyncRoute(async (req, res) => {
      const input = parseBody(loginSchema, req.body, 'Dati di accesso non validi');
      const credentials = users.getCredentials(input.email);
      const valid = await bcrypt.compare(input.password, credentials?.passwordHash ?? dummyHash);
      // Stesso messaggio per email sconosciuta e password sbagliata: non si rivela quale dei due è errato.
      if (!credentials || !valid) throw new HttpError(401, 'Email o password non corretti');
      await startSession(req, credentials.id);
      res.json(sessionInfo(credentials.id));
    }),
  );

  router.post('/auth/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie(SESSION_COOKIE);
      res.status(204).end();
    });
  });

  return router;
}
