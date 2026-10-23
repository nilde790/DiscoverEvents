import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/database';

const config = loadConfig();

const app = createApp(openDatabase(config.dbPath), {
  sessionSecret: config.sessionSecret,
  secureCookies: config.isProduction,
  trustProxy: config.isProduction,
});

app.listen(config.port, () => {
  console.log(`API DiscoverEvent in ascolto su http://localhost:${config.port}/api`);
});
