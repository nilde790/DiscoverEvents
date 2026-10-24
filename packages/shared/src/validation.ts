import { z } from 'zod';
import { CATEGORIES } from './types';

/**
 * Regole di validazione di un evento, usate sia dal form (feedback immediato)
 * sia dal server (che è l'unico controllo di cui fidarsi davvero).
 */
export const eventInputSchema = z.object({
  title: z.string().trim().min(3, 'Il titolo deve avere almeno 3 caratteri').max(100, 'Titolo troppo lungo'),
  category: z.enum(CATEGORIES, { message: 'Categoria non valida' }),
  description: z
    .string()
    .trim()
    .min(10, 'La descrizione deve avere almeno 10 caratteri')
    .max(2000, 'Descrizione troppo lunga'),
  venue: z.string().trim().min(2, 'Indica il luogo').max(120, 'Nome del luogo troppo lungo'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  start: z.string().datetime({ message: 'Data non valida' }),
  durationMinutes: z
    .number({ message: 'Durata non valida' })
    .int()
    .min(15, 'Durata minima 15 minuti')
    .max(24 * 60, 'Durata massima 24 ore'),
  price: z.number({ message: 'Prezzo non valido' }).min(0, 'Il prezzo non può essere negativo').max(10000),
  capacity: z
    .number({ message: 'Numero di posti non valido' })
    .int('I posti devono essere un numero intero')
    .min(1, 'Serve almeno 1 posto')
    .max(100000),
});

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Indirizzo email non valido')
  .max(254, 'Indirizzo email troppo lungo');

/** Motivazione facoltativa della richiesta per diventare organizzatore. */
const organizerMessage = z.string().trim().max(500, 'Massimo 500 caratteri').default('');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Il nome deve avere almeno 2 caratteri').max(60, 'Nome troppo lungo'),
  email,
  // bcrypt considera solo i primi 72 byte: oltre, due password diverse risulterebbero uguali.
  password: z
    .string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password troppo lunga (massimo 72 caratteri)'),
  wantsOrganizer: z.boolean().default(false),
  organizerMessage,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Inserisci la password'),
});

export const organizerRequestSchema = z.object({ message: organizerMessage });

export const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected'], { message: 'Decisione non valida' }),
});

/** Testo della ricerca per città: GET /api/places/search?q=... */
export const placeSearchSchema = z.object({
  q: z.string().trim().min(2, 'Scrivi almeno 2 lettere').max(100, 'Testo troppo lungo'),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;

/** Primo messaggio di errore per ogni campo, comodo da mostrare sotto gli input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
