import { createApp } from './app';
import { openDatabase } from './db/database';

// Legge il file .env, se c'è (funzione integrata in Node.js). In produzione le variabili le imposta l'hosting.
try {
  process.loadEnvFile();
} catch {
  /* nessun file .env: si usano le variabili d'ambiente già presenti */
}

const isProduction = process.env.NODE_ENV === 'production';

// API_PORT e non PORT: molti strumenti impostano PORT per il frontend e i due server finirebbero in conflitto.
const PORT = Number(process.env.API_PORT ?? 3001);

const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
  // Senza una chiave segreta robusta chiunque potrebbe falsificare i cookie di sessione: meglio non partire.
  throw new Error('SESSION_SECRET mancante o troppo corta (minimo 32 caratteri): impostala prima di avviare in produzione.');
}
if (!sessionSecret) {
  console.warn('SESSION_SECRET non impostata: uso una chiave di sviluppo. Non usarla in produzione.');
}

const app = createApp(openDatabase(), {
  sessionSecret: sessionSecret ?? 'chiave-di-sviluppo-non-sicura',
  secureCookies: isProduction,
  trustProxy: isProduction,
});

app.listen(PORT, () => {
  console.log(`API DiscoverEvent in ascolto su http://localhost:${PORT}/api`);
});
