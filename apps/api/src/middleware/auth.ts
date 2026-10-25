import type { Request, RequestHandler, Response } from 'express';
import type { Role, User } from '@discoverevent/shared/types';
import { HttpError } from '../lib/http';
import type { UsersRepository } from '../modules/auth/users.repository';

/**
 * L'utente corrente si ricava dalla sessione, mai da dati inviati dal client.
 * Un account disattivato (es. l'admin demo in produzione) vale come anonimo anche con una sessione ancora aperta.
 */
export const loadCurrentUser =
  (users: UsersRepository, isDisabled: (email: string) => boolean = () => false): RequestHandler =>
  (req, res, next) => {
    const user = req.session.userId ? users.getUser(req.session.userId) : undefined;
    res.locals.user = user && !isDisabled(user.email) ? user : undefined;
    next();
  };

export const optionalUser = (res: Response) => res.locals.user as User | undefined;

export function currentUser(res: Response): User {
  const user = optionalUser(res);
  if (!user) throw new HttpError(401, 'Accedi per continuare');
  return user;
}

export function requireRole(res: Response, role: Role, message: string): User {
  const user = currentUser(res);
  if (user.role !== role) throw new HttpError(403, message);
  return user;
}

/** Nuovo id di sessione al login: impedisce di riutilizzare una sessione creata prima (session fixation). */
export const startSession = (req: Request, userId: number) =>
  new Promise<void>((resolve, reject) =>
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    }),
  );
