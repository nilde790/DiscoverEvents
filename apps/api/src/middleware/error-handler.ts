import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http';

/** Qualsiasi percorso /api non gestito dalle rotte. */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Risorsa non trovata' });
}

/** Trasforma ogni errore in una risposta JSON coerente: { error, fields? }. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
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
}
