import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@discoverevent/shared/demo';
import { openDatabase } from '../../db/database';
import { createUsersRepository } from './users.repository';
import { Client, loginAs, startServer, validEvent } from '../../test/helpers';

describe('registrazione e accesso', () => {
  test('la registrazione crea un partecipante già connesso, senza esporre la password', async () => {
    const client = new Client();
    const res = await client.call('/auth/register', 'POST', {
      name: 'Nuovo Utente',
      email: 'Nuovo.Utente@Example.com',
      password: 'password-sicura',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'participant');
    assert.equal(res.body.user.email, 'nuovo.utente@example.com');
    assert.ok(!JSON.stringify(res.body).includes('password'));
    assert.equal((await client.call('/auth/me')).body.user.name, 'Nuovo Utente');
  });

  test('il cookie di sessione è httpOnly e SameSite=Lax', async () => {
    const client = await loginAs(DEMO_ACCOUNTS.participant.email);
    assert.match(client.lastSetCookie, /HttpOnly/i);
    assert.match(client.lastSetCookie, /SameSite=Lax/i);
  });

  test("chi sceglie 'organizzatore' parte come partecipante con una richiesta in attesa", async () => {
    const client = new Client();
    const res = await client.call('/auth/register', 'POST', {
      name: 'Aspirante Organizzatore',
      email: 'aspirante@example.com',
      password: 'password-sicura',
      wantsOrganizer: true,
      organizerMessage: 'Organizzo concerti',
    });
    assert.equal(res.body.user.role, 'participant');
    assert.equal(res.body.organizerRequest.status, 'pending');
  });

  test('non si può registrare due volte la stessa email, anche con maiuscole diverse', async () => {
    const res = await new Client().call('/auth/register', 'POST', {
      name: 'Doppione',
      email: 'GIULIA.ROSSI@example.com',
      password: 'password-sicura',
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.fields.email);
  });

  test('password troppo corta rifiutata', async () => {
    const res = await new Client().call('/auth/register', 'POST', {
      name: 'Tizio',
      email: 'tizio@example.com',
      password: '123',
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.password);
  });

  test('email sconosciuta e password sbagliata danno lo stesso errore', async () => {
    const wrongPassword = await new Client().call('/auth/login', 'POST', {
      email: DEMO_ACCOUNTS.participant.email,
      password: 'sbagliata',
    });
    const unknownEmail = await new Client().call('/auth/login', 'POST', {
      email: 'nessuno@example.com',
      password: 'sbagliata',
    });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
  });

  test('dopo il logout la sessione non vale più', async () => {
    const client = await loginAs('chiara.ricci@example.com');
    const oldCookie = client.cookie;
    assert.equal((await client.call('/auth/logout', 'POST')).status, 204);
    client.cookie = oldCookie; // anche riusando il vecchio cookie
    assert.equal((await client.call('/auth/me')).body.user, null);
  });

  test('troppi tentativi di accesso vengono bloccati', async () => {
    const limitedBase = startServer({ authAttemptsPerWindow: 2 });
    const client = new Client(limitedBase);
    const attempt = () => client.call('/auth/login', 'POST', { email: 'x@example.com', password: 'sbagliata' });
    assert.equal((await attempt()).status, 401);
    assert.equal((await attempt()).status, 401);
    assert.equal((await attempt()).status, 429);
  });

  test('senza accesso si vedono gli eventi ma non si può interagire', async () => {
    const anonymous = new Client();
    assert.equal((await anonymous.call('/events')).status, 200);
    assert.equal((await anonymous.call('/events/1/favorite', 'PUT')).status, 401);
    assert.equal((await anonymous.call('/events', 'POST', validEvent())).status, 401);
  });
});

describe('admin demo disattivato (produzione)', () => {
  const login = (client: Client, email: string) =>
    client.call('/auth/login', 'POST', { email, password: DEMO_PASSWORD });

  test("su un database nuovo l'admin demo non viene creato e non compare tra i pulsanti", async () => {
    const client = new Client(startServer({ demoAdminEnabled: false }));
    assert.equal((await login(client, DEMO_ACCOUNTS.admin.email)).status, 401);
    assert.deepEqual((await client.call('/auth/demo-accounts')).body.roles, ['participant', 'organizer']);
  });

  test("su un database esistente l'admin demo non può accedere, gli altri account demo sì", async () => {
    // Database creato in sviluppo, quindi con l'admin demo, poi avviato in produzione.
    const base = startServer({ demoAdminEnabled: false }, openDatabase(':memory:'));
    const admin = await login(new Client(base), DEMO_ACCOUNTS.admin.email);
    assert.equal(admin.status, 401);
    assert.equal(admin.body.error, 'Email o password non corretti');
    assert.equal((await login(new Client(base), DEMO_ACCOUNTS.participant.email)).status, 200);
    assert.equal((await login(new Client(base), DEMO_ACCOUNTS.organizer.email)).status, 200);
  });

  test("una sessione dell'admin demo aperta prima del cambio non vale più", async () => {
    // Due server sullo stesso database: prima e dopo il riavvio con la nuova configurazione.
    const db = openDatabase(':memory:');
    const before = new Client(startServer({}, db));
    assert.equal((await login(before, DEMO_ACCOUNTS.admin.email)).status, 200);

    const afterRestart = new Client(startServer({ demoAdminEnabled: false }, db));
    afterRestart.cookie = before.cookie;
    assert.equal((await afterRestart.call('/auth/me')).body.user, null);
    assert.equal((await afterRestart.call('/admin/organizer-requests')).status, 401);
  });

  test('in sviluppo i tre account demo sono disponibili', async () => {
    assert.deepEqual((await new Client().call('/auth/demo-accounts')).body.roles, [
      'participant',
      'organizer',
      'admin',
    ]);
  });
});

describe('promozione ad amministratore (scripts/promote-admin.ts)', () => {
  const users = createUsersRepository(openDatabase(':memory:'));

  test('un utente registrato diventa amministratore', () => {
    const result = users.promoteToAdmin(DEMO_ACCOUNTS.participant.email);
    assert.ok(result.outcome === 'promoted');
    assert.equal(users.getUser(result.user.id)?.role, 'admin');
  });

  test('chi è già amministratore resta tale senza errori', () => {
    assert.equal(users.promoteToAdmin(DEMO_ACCOUNTS.admin.email).outcome, 'already-admin');
  });

  test("un'email non registrata non crea nessun account", () => {
    assert.equal(users.promoteToAdmin('sconosciuto@example.com').outcome, 'not-found');
    assert.equal(users.emailExists('sconosciuto@example.com'), false);
  });
});
