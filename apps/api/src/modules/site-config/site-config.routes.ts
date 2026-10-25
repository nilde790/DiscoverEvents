import { Router } from 'express';
import type { PublicConfig } from '@discoverevent/shared/types';

/**
 * Configurazione pubblica del sito: GET /api/config.
 * Il frontend la legge all'avvio, così modalità demo e dati della privacy si cambiano
 * sull'hosting senza ricompilare. Contiene solo valori che chiunque può vedere.
 */
export function createSiteConfigRouter(config: PublicConfig) {
  const router = Router();
  router.get('/config', (_req, res) => {
    res.json(config);
  });
  return router;
}
