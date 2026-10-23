import { z } from 'zod';

const DEV_SESSION_SECRET = 'chiave-di-sviluppo-non-sicura';

/** Variabili d'ambiente del server, validate tutte insieme all'avvio. */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // API_PORT e non PORT: molti strumenti impostano PORT per il frontend e i due server finirebbero in conflitto.
    API_PORT: z.coerce.number().int().positive().default(3001),
    SESSION_SECRET: z.string().optional(),
    DB_PATH: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Senza una chiave segreta robusta chiunque potrebbe falsificare i cookie di sessione: meglio non partire.
    if (env.NODE_ENV === 'production' && (env.SESSION_SECRET?.length ?? 0) < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message: 'obbligatoria in produzione, almeno 32 caratteri',
      });
    }
  });

export interface Config {
  isProduction: boolean;
  port: number;
  sessionSecret: string;
  dbPath?: string;
}

/** Legge .env (se presente) e le variabili d'ambiente; si ferma con un messaggio chiaro se qualcosa non va. */
export function loadConfig(): Config {
  try {
    process.loadEnvFile();
  } catch {
    /* nessun file .env: si usano le variabili d'ambiente già presenti */
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configurazione non valida:\n${problems}`);
  }
  const env = parsed.data;

  if (!env.SESSION_SECRET) {
    console.warn('SESSION_SECRET non impostata: uso una chiave di sviluppo. Non usarla in produzione.');
  }

  return {
    isProduction: env.NODE_ENV === 'production',
    port: env.API_PORT,
    sessionSecret: env.SESSION_SECRET ?? DEV_SESSION_SECRET,
    dbPath: env.DB_PATH,
  };
}
