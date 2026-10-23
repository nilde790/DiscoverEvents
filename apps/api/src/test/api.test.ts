import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../shared/demo';
import type { EventInput } from '../shared/types';
import { createApp, type AppOptions } from './app';
import { openDatabase } from './db';

// Ogni server di test usa un database in memoria con i dati demo: i test non toccano quello vero.
const servers: Server[] = [];
after(() => servers.forEach((s) => s.close()));

function startServer(options: Partial<AppOptions> = {}) {
  const server = createApp(openDatabase(':memory:'), {
    sessionSecret: 'segreto-di-test',
    authAttemptsPerWindow: 1000,
    ...options,
  }).listen(0);
  servers.push(server);
  return `http://localhost:${(server.address() as AddressInfo).port}/api`;
}

const base = startServer();

/** Un "browser" di test: conserva il cookie di sessione tra una richiesta e l'altra. */
class Client {
  cookie = '';
  lastSetCookie = '';

  constructor(private readonly baseUrl = base) {}

  async call(path: string, method = 'GET', payload?: unknown) {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const setCookie = res.headers.getSetCookie()[0];
    if (setCookie) {
      this.lastSetCookie = setCookie;
      this.cookie = setCookie.split(';')[0];
    }
    const body: any = res.status === 204 ? null : await res.json();
    return { status: res.status, body };
  }
}

async function loginAs(email: string) {
  const client = new Client();
  const res = await client.call('/auth/login', 'POST', { email, password: DEMO_PASSWORD });
  assert.equal(res.status, 200, `login di ${email} fallito`);
  return client;
}

const inOneWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

const validEvent = (overrides: Partial<EventInput> = {}): EventInput => ({
  title: 'Evento di prova',
  category: 'Tech',
  description: 'Descrizione abbastanza lunga',
  venue: 'Sala test',
  lat: 41.9,
  lng: 12.5,
  start: inOneWeek(),
  durationMinutes: 60,
  price: 0,
  capacity: 2,
  ...overrides,
});

let organizer: Client;
let otherOrganizer: Client;
let admin: Client;
let participants: Client[];

before(async () => {
  organizer = await loginAs(DEMO_ACCOUNTS.organizer.email);
  otherOrganizer = await loginAs('arteviva@example.com');
  admin = await loginAs(DEMO_ACCOUNTS.admin.email);
  participants = await Promise.all(
    ['giulia.rossi', 'sara.romano', 'luca.colombo', 'matteo.marino'].map((n) => loginAs(`${n}@example.com`)),
  );
});

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

describe('richieste per diventare organizzatore', () => {
  test('un partecipante invia una richiesta, ma non due insieme', async () => {
    const client = await loginAs('davide.bruno@example.com');
    const first = await client.call('/organizer-requests', 'POST', { message: 'Vorrei organizzare' });
    assert.equal(first.status, 201);
    assert.equal(first.body.status, 'pending');
    assert.equal((await client.call('/organizer-requests', 'POST', {})).status, 409);
  });

  test('un organizzatore non può fare richiesta', async () => {
    assert.equal((await organizer.call('/organizer-requests', 'POST', {})).status, 409);
  });

  test("solo l'amministratore vede e gestisce le richieste", async () => {
    assert.equal((await participants[0].call('/admin/organizer-requests')).status, 403);
    assert.equal((await organizer.call('/admin/organizer-requests')).status, 403);
    const res = await admin.call('/admin/organizer-requests?status=pending');
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 2); // le due richieste dei dati demo
  });

  test("l'approvazione rende organizzatore e permette di creare eventi", async () => {
    const client = await loginAs('elena.gallo@example.com');
    const request = (await client.call('/organizer-requests', 'POST', {})).body;
    assert.equal((await client.call('/events', 'POST', validEvent())).status, 403);

    const decided = await admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'approved' });
    assert.equal(decided.body.status, 'approved');
    assert.equal((await client.call('/auth/me')).body.user.role, 'organizer');
    assert.equal((await client.call('/events', 'POST', validEvent())).status, 201);

    // Una richiesta già gestita non si può decidere di nuovo.
    const again = await admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'rejected' });
    assert.equal(again.status, 409);
  });

  test('il rifiuto lascia il ruolo invariato e permette una nuova richiesta', async () => {
    const client = await loginAs('andrea.conti@example.com');
    const request = (await client.call('/organizer-requests', 'POST', {})).body;
    await admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'rejected' });
    const me = (await client.call('/auth/me')).body;
    assert.equal(me.user.role, 'participant');
    assert.equal(me.organizerRequest.status, 'rejected');
    assert.equal((await client.call('/organizer-requests', 'POST', {})).status, 201);
  });
});

describe('creazione eventi', () => {
  test('un partecipante non può creare eventi', async () => {
    assert.equal((await participants[0].call('/events', 'POST', validEvent())).status, 403);
  });

  test('dati non validi restituiscono gli errori per campo', async () => {
    const res = await organizer.call('/events', 'POST', validEvent({ title: 'x', capacity: 0 }));
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.title);
    assert.ok(res.body.fields.capacity);
  });

  test('non si può creare un evento nel passato', async () => {
    const res = await organizer.call('/events', 'POST', validEvent({ start: '2020-01-01T10:00:00.000Z' }));
    assert.equal(res.status, 400);
  });

  test("l'organizzatore crea un evento e ne risulta il proprietario", async () => {
    const me = (await organizer.call('/auth/me')).body.user;
    const res = await organizer.call('/events', 'POST', validEvent());
    assert.equal(res.status, 201);
    assert.equal(res.body.organizer.id, me.id);
    assert.equal(res.body.registeredCount, 0);
  });
});

describe('iscrizioni', () => {
  let eventId: number;

  before(async () => {
    eventId = (await organizer.call('/events', 'POST', validEvent({ capacity: 2 }))).body.id;
  });

  test('rispetta il limite di partecipanti', async () => {
    for (const p of participants.slice(0, 2)) {
      assert.equal((await p.call(`/events/${eventId}/registration`, 'PUT')).status, 200);
    }
    assert.equal((await participants[2].call(`/events/${eventId}/registration`, 'PUT')).status, 409);
  });

  test('iscriversi due volte non conta doppio', async () => {
    const res = await participants[0].call(`/events/${eventId}/registration`, 'PUT');
    assert.equal(res.body.registeredCount, 2);
  });

  test("annullando l'iscrizione si libera un posto", async () => {
    await participants[0].call(`/events/${eventId}/registration`, 'DELETE');
    assert.equal((await participants[2].call(`/events/${eventId}/registration`, 'PUT')).status, 200);
  });

  test("l'organizzatore non può ridurre i posti sotto gli iscritti", async () => {
    assert.equal((await organizer.call(`/events/${eventId}`, 'PUT', validEvent({ capacity: 1 }))).status, 409);
  });

  test('solo il proprietario vede la lista iscritti', async () => {
    const own = await organizer.call(`/events/${eventId}`);
    const other = await participants[0].call(`/events/${eventId}`);
    assert.equal(own.body.participants.length, 2);
    assert.equal(other.body.participants, undefined);
  });

  test("un altro organizzatore non può modificare né cancellare l'evento", async () => {
    assert.equal((await otherOrganizer.call(`/events/${eventId}`, 'PUT', validEvent())).status, 403);
    assert.equal((await otherOrganizer.call(`/events/${eventId}`, 'DELETE')).status, 403);
  });
});

describe('preferiti', () => {
  test('aggiunta e rimozione', async () => {
    const [event] = (await participants[3].call('/events')).body;
    assert.equal((await participants[3].call(`/events/${event.id}/favorite`, 'PUT')).body.isFavorite, true);
    assert.equal((await participants[3].call(`/events/${event.id}/favorite`, 'DELETE')).body.isFavorite, false);
  });
});
