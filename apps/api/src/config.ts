import { z } from 'zod';
import type { PublicConfig } from '@discoverevent/shared/types';

const DEV_SESSION_SECRET = 'chiave-di-sviluppo-non-sicura';

/** "true"/"false" facoltativo. */
const flag = z.enum(['true', 'false']).optional();
/** Una variabile lasciata vuota nel file .env (es. `PRIVACY_CONTACT_EMAIL=`) vale come non impostata. */
const emptyAsUnset = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

/** Variabili d'ambiente del server, validate tutte insieme all'avvio. */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    // API_PORT ha la precedenza: in sviluppo alcuni strumenti impostano PORT per il frontend e i server andrebbero in conflitto.
    // PORT è la convenzione degli hosting (es. Render) per dire su quale porta ascoltare: si usa se API_PORT manca.
    API_PORT: z.coerce.number().int().positive().optional(),
    PORT: z.coerce.number().int().positive().optional(),
    SESSION_SECRET: z.string().optional(),
    DB_PATH: z.string().optional(),
    STATIC_DIR: z.string().optional(),
    GEOCODER_USER_AGENT: z.string().min(1).default('DiscoverEvent/0.3 (progetto didattico)'),
    DEMO_MODE: flag,
    DEMO_ADMIN_ENABLED: flag,
    PRIVACY_CONTROLLER_NAME: z.preprocess(emptyAsUnset, z.string().trim().max(200).optional()),
    PRIVACY_CONTACT_EMAIL: z.preprocess(emptyAsUnset, z.string().trim().email('email non valida').optional()),
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
  /** Cartella della build del frontend: se impostata, il server serve anche il sito (in produzione). */
  staticDir?: string;
  geocoderUserAgent: string;
  /**
   * Modalità demo: registrazione disattivata, solo account demo, dati azzerati ogni notte.
   * Serve al sito pubblico per non raccogliere dati personali reali. Di default no.
   */
  demoMode: boolean;
  /**
   * Account demo amministratore (password pubblica) attivo: di default sì in sviluppo e in modalità demo
   * (i dati non sono reali e si azzerano), no in produzione.
   */
  demoAdminEnabled: boolean;
  /** Titolare ed email mostrati nell'informativa privacy: si impostano sull'hosting, non nel codice. */
  privacy: PublicConfig['privacy'];
}

/** Valida le variabili d'ambiente e ne ricava la configurazione; lancia un errore leggibile se qualcosa non va. */
export function parseConfig(source: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configurazione non valida:\n${problems}`);
  }
  const env = parsed.data;
  const demoMode = env.DEMO_MODE === 'true';

  return {
    isProduction: env.NODE_ENV === 'production',
    port: env.API_PORT ?? env.PORT ?? 3001,
    sessionSecret: env.SESSION_SECRET ?? DEV_SESSION_SECRET,
    dbPath: env.DB_PATH,
    staticDir: env.STATIC_DIR,
    geocoderUserAgent: env.GEOCODER_USER_AGENT,
    demoMode,
    demoAdminEnabled: env.DEMO_ADMIN_ENABLED
      ? env.DEMO_ADMIN_ENABLED === 'true'
      : demoMode || env.NODE_ENV !== 'production',
    privacy: {
      controllerName: env.PRIVACY_CONTROLLER_NAME ?? null,
      contactEmail: env.PRIVACY_CONTACT_EMAIL ?? null,
    },
  };
}

/** Legge .env (se presente) e le variabili d'ambiente; si ferma con un messaggio chiaro se qualcosa non va. */
export function loadConfig(): Config {
  try {
    process.loadEnvFile();
  } catch {
    /* nessun file .env: si usano le variabili d'ambiente già presenti */
  }

  const config = parseConfig(process.env);
  if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET non impostata: uso una chiave di sviluppo. Non usarla in produzione.');
  }
  return config;
}
