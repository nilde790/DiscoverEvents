import { createApp } from './app';
import { openDatabase } from './db';

// API_PORT e non PORT: molti strumenti impostano PORT per il frontend e i due server finirebbero in conflitto.
const PORT = Number(process.env.API_PORT ?? 3001);

const app = createApp(openDatabase());
app.listen(PORT, () => {
  console.log(`API DiscoverEvent in ascolto su http://localhost:${PORT}/api`);
});
