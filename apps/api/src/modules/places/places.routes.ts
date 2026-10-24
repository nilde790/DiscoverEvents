import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { placeSearchSchema } from '@discoverevent/shared/validation';
import { asyncRoute, parseBody } from '../../lib/http';
import type { Geocoder } from './geocoder';

interface PlacesDeps {
  geocoder: Geocoder;
}

/** Ricerca di città per nome: /api/places/... Pubblica, come la lista degli eventi. */
export function createPlacesRouter({ geocoder }: PlacesDeps) {
  const router = Router();

  // Il servizio esterno ha limiti stretti: una sola persona non deve poterli consumare tutti.
  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Troppe ricerche: riprova tra un minuto' },
  });

  router.get(
    '/places/search',
    searchLimiter,
    asyncRoute(async (req, res) => {
      const { q } = parseBody(placeSearchSchema, req.query, 'Ricerca non valida');
      res.json(await geocoder.search(q));
    }),
  );

  return router;
}
