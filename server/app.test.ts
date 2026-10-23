import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import type { EventInput, User } from '../shared/types';
import { createApp } from './app';
import { openDatabase } from './db';

// Ogni esecuzione usa un database in memoria con i dati demo: i test non toccano quello vero.
const server = createApp(openDatabase(':memory:')).listen(0);
const base = `http://localhost:${(server.address() as AddressInfo).port}/api`;
after(() => server.close());

/** Chiama l'API come farebbe il client; `body` è any perché nei test leggiamo campi diversi. */
async function call(path: string, userId?: number, method = 'GET', payload?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': String(userId) } : {}),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body: any = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
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

let organizer: User;
let otherOrganizer: User;
let participants: User[];

before(async () => {
  const users: User[] = (await call('/users')).body;
  [organizer, otherOrganizer] = users.filter((u) => u.role === 'organizer');
  participants = users.filter((u) => u.role === 'participant');
});

describe('creazione eventi', () => {
  test('un partecipante non può creare eventi', async () => {
    const res = await call('/events', participants[0].id, 'POST', validEvent());
    assert.equal(res.status, 403);
  });

  test('dati non validi restituiscono gli errori per campo', async () => {
    const res = await call('/events', organizer.id, 'POST', validEvent({ title: 'x', capacity: 0 }));
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.title);
    assert.ok(res.body.fields.capacity);
  });

  test('non si può creare un evento nel passato', async () => {
    const res = await call('/events', organizer.id, 'POST', validEvent({ start: '2020-01-01T10:00:00.000Z' }));
    assert.equal(res.status, 400);
  });

  test("l'organizzatore crea un evento e ne risulta il proprietario", async () => {
    const res = await call('/events', organizer.id, 'POST', validEvent());
    assert.equal(res.status, 201);
    assert.equal(res.body.organizer.id, organizer.id);
    assert.equal(res.body.registeredCount, 0);
  });
});

describe('iscrizioni', () => {
  let eventId: number;

  before(async () => {
    eventId = (await call('/events', organizer.id, 'POST', validEvent({ capacity: 2 }))).body.id;
  });

  test('rispetta il limite di partecipanti', async () => {
    for (const p of participants.slice(0, 2)) {
      assert.equal((await call(`/events/${eventId}/registration`, p.id, 'PUT')).status, 200);
    }
    const full = await call(`/events/${eventId}/registration`, participants[2].id, 'PUT');
    assert.equal(full.status, 409);
  });

  test('iscriversi due volte non conta doppio', async () => {
    const res = await call(`/events/${eventId}/registration`, participants[0].id, 'PUT');
    assert.equal(res.body.registeredCount, 2);
  });

  test("annullando l'iscrizione si libera un posto", async () => {
    await call(`/events/${eventId}/registration`, participants[0].id, 'DELETE');
    const res = await call(`/events/${eventId}/registration`, participants[2].id, 'PUT');
    assert.equal(res.status, 200);
  });

  test("l'organizzatore non può ridurre i posti sotto gli iscritti", async () => {
    const res = await call(`/events/${eventId}`, organizer.id, 'PUT', validEvent({ capacity: 1 }));
    assert.equal(res.status, 409);
  });

  test('solo il proprietario vede la lista iscritti', async () => {
    const own = await call(`/events/${eventId}`, organizer.id);
    const other = await call(`/events/${eventId}`, participants[0].id);
    assert.equal(own.body.participants.length, 2);
    assert.equal(other.body.participants, undefined);
  });

  test("un altro organizzatore non può modificare né cancellare l'evento", async () => {
    assert.equal((await call(`/events/${eventId}`, otherOrganizer.id, 'PUT', validEvent())).status, 403);
    assert.equal((await call(`/events/${eventId}`, otherOrganizer.id, 'DELETE')).status, 403);
  });
});

describe('preferiti', () => {
  test('aggiunta e rimozione', async () => {
    const [event] = (await call('/events')).body;
    const p = participants[3].id;
    assert.equal((await call(`/events/${event.id}/favorite`, p, 'PUT')).body.isFavorite, true);
    assert.equal((await call(`/events/${event.id}/favorite`, p, 'DELETE')).body.isFavorite, false);
  });

  test('senza utente si riceve 401', async () => {
    assert.equal((await call('/events/1/favorite', undefined, 'PUT')).status, 401);
  });
});
