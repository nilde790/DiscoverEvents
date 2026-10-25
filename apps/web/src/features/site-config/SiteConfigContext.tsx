import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PublicConfig } from '@discoverevent/shared/types';
import { api } from '@/lib/api';

interface SiteConfigState {
  config: PublicConfig;
  /** false finché la configurazione non è arrivata (evita di mostrare per un attimo il form di registrazione). */
  configReady: boolean;
}

/** Valori usati prima della risposta del server o se il server non risponde: il sito "normale". */
const DEFAULT_CONFIG: PublicConfig = { demoMode: false, privacy: { controllerName: null, contactEmail: null } };

const SiteConfigContext = createContext<SiteConfigState | null>(null);

/**
 * Configurazione del sito decisa sull'hosting (modalità demo, dati della privacy), letta una volta all'avvio.
 * Arriva dal server e non dal build: si cambia senza ricompilare il frontend.
 */
export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteConfigState>({ config: DEFAULT_CONFIG, configReady: false });

  useEffect(() => {
    api
      .config()
      .then((config) => setState({ config, configReady: true }))
      // Server spento: le pagine mostrano già il loro errore, qui basta non bloccare l'interfaccia.
      .catch(() => setState((s) => ({ ...s, configReady: true })));
  }, []);

  return <SiteConfigContext.Provider value={state}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfigState {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig va usato dentro <SiteConfigProvider>');
  return ctx;
}
