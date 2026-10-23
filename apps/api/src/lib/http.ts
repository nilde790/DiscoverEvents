import type { Request, RequestHandler, Response } from 'express';
import type { ZodType, ZodTypeDef } from 'zod';
import { fieldErrors } from '@discoverevent/shared/validation';

/** Errore con codice HTTP: lanciato nelle rotte, trasformato in JSON dal gestore degli errori. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Express 4 non intercetta gli errori delle funzioni async: questo li passa al gestore degli errori. */
export const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/** Valida il corpo della richiesta con uno schema Zod; in caso di errore risponde 400 con gli errori per campo. */
export function parseBody<T>(schema: ZodType<T, ZodTypeDef, unknown>, body: unknown, message: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, message, fieldErrors(parsed.error));
  return parsed.data;
}

/** Legge un id numerico dai parametri dell'URL (es. /events/:id). */
export function idParam(req: Request, what: string): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, `Id ${what} non valido`);
  return id;
}
