import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/database';
import { createNominatimGeocoder } from './modules/places/geocoder';

const config = loadConfig();

const app = createApp(openDatabase(config.dbPath, { seedDemoAdmin: config.demoAdminEnabled }), {
  sessionSecret: config.sessionSecret,
  secureCookies: config.isProduction,
  trustProxy: config.isProduction,
  geocoder: createNominatimGeocoder({ userAgent: config.geocoderUserAgent }),
  demoAdminEnabled: config.demoAdminEnabled,
});

app.listen(config.port, () => {
  console.log(`API DiscoverEvent in ascolto su http://localhost:${config.port}/api`);
});
