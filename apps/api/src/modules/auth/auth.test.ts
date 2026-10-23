import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DEMO_ACCOUNTS } from '@discoverevent/shared/demo';
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

  test("non si può registrare due volte la stessa email, anche con maiuscole diverse", async () => {
    const res = await new Client().call('/auth/register', 'POST', {
      name: 'Doppione',
      email: 'GIULIA.ROSSI@example.com',
      password: 'password-sicura',
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.fields.email);
  });

  test('password troppo corta rifiutata', async () => {
    const res = await new Client().call('/auth/register', 'POST', { name: 'Tizio', email: 'tizio@example.com', password: '123' });
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
