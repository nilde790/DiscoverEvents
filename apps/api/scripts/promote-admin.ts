/**
 * Rende amministratore un utente GIÀ registrato dall'app (registrazione normale, con la sua password).
 * Uso:  npm run admin:promote -w @discoverevent/api -- email@esempio.it
 *
 * Lavora sullo stesso database del server (DB_PATH in apps/api/.env, se impostata).
 * Lo script non crea account e non tocca password.
 */
import { existsSync } from 'node:fs';
import { loginSchema } from '@discoverevent/shared/validation';
import { loadConfig } from '../src/config';
import { DEFAULT_DB_PATH, openDatabase } from '../src/db/database';
import { createUsersRepository } from '../src/modules/auth/users.repository';

const USAGE = 'Uso: npm run admin:promote -w @discoverevent/api -- email@esempio.it';

const email = loginSchema.shape.email.safeParse(process.argv[2] ?? '');
if (!email.success) {
  console.error(process.argv[2] ? `"${process.argv[2]}" non è un indirizzo email valido.\n${USAGE}` : USAGE);
  process.exit(1);
}

const config = loadConfig();
const dbPath = config.dbPath ?? DEFAULT_DB_PATH;
// Senza questo controllo openDatabase creerebbe un database nuovo con i dati demo.
if (!existsSync(dbPath)) {
  console.error(`Database non trovato in ${dbPath}: avvia prima il server e registra l'account dall'app.`);
  process.exit(1);
}

const users = createUsersRepository(openDatabase(dbPath, { seedDemoAdmin: config.demoAdminEnabled }));
const result = users.promoteToAdmin(email.data);

switch (result.outcome) {
  case 'not-found':
    console.error(`Nessun utente registrato con l'email ${email.data}.`);
    console.error("Registrati prima dall'app (pagina Registrati), poi rilancia questo comando.");
    process.exit(1);
    break;
  case 'already-admin':
    console.log(`${result.user.name} (${result.user.email}) è già amministratore: nessuna modifica.`);
    break;
  case 'promoted':
    console.log(`Fatto: ${result.user.name} (${result.user.email}) ora è amministratore.`);
    console.log('Se aveva già una sessione aperta, il nuovo ruolo vale dalla prossima pagina caricata.');
    break;
}
