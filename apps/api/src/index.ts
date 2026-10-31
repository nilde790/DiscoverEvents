import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/database';
import { scheduleDemoReset } from './modules/demo-reset/demo-reset.scheduler';
import { createNominatimGeocoder } from './modules/places/geocoder';

const config = loadConfig();

const db = openDatabase(config.dbPath, { seedDemoAdmin: config.demoAdminEnabled });

const app = createApp(db, {
  sessionSecret: config.sessionSecret,
  secureCookies: config.secureCookies,
  trustProxy: config.isProduction,
  geocoder: createNominatimGeocoder({ userAgent: config.geocoderUserAgent }),
  demoAdminEnabled: config.demoAdminEnabled,
  demoMode: config.demoMode,
  privacy: config.privacy,
  staticDir: config.staticDir,
  noIndex: config.noIndex,
});

// In modalità demo i dati tornano quelli di partenza ogni notte: nessuna traccia resta a lungo.
if (config.demoMode) scheduleDemoReset(db, { includeAdmin: config.demoAdminEnabled });

app.listen(config.port, () => {
  console.log(`API DiscoverEvent in ascolto su http://localhost:${config.port}/api`);
  if (config.demoMode) console.log('Modalità demo attiva: registrazione disattivata, dati azzerati ogni notte alle 4.');
});
