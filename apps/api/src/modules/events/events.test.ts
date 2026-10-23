import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { loginDemoUsers, validEvent, type DemoUsers } from '../../test/helpers';

let users: DemoUsers;
before(async () => {
  users = await loginDemoUsers();
});

describe('creazione eventi', () => {
  test('un partecipante non può creare eventi', async () => {
    assert.equal((await users.participants[0].call('/events', 'POST', validEvent())).status, 403);
  });

  test('dati non validi restituiscono gli errori per campo', async () => {
    const res = await users.organizer.call('/events', 'POST', validEvent({ title: 'x', capacity: 0 }));
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.title);
    assert.ok(res.body.fields.capacity);
  });

  test('non si può creare un evento nel passato', async () => {
    const res = await users.organizer.call('/events', 'POST', validEvent({ start: '2020-01-01T10:00:00.000Z' }));
    assert.equal(res.status, 400);
  });

  test("l'organizzatore crea un evento e ne risulta il proprietario", async () => {
    const me = (await users.organizer.call('/auth/me')).body.user;
    const res = await users.organizer.call('/events', 'POST', validEvent());
    assert.equal(res.status, 201);
    assert.equal(res.body.organizer.id, me.id);
    assert.equal(res.body.registeredCount, 0);
  });
});

describe('iscrizioni', () => {
  let eventId: number;

  before(async () => {
    eventId = (await users.organizer.call('/events', 'POST', validEvent({ capacity: 2 }))).body.id;
  });

  test('rispetta il limite di partecipanti', async () => {
    for (const p of users.participants.slice(0, 2)) {
      assert.equal((await p.call(`/events/${eventId}/registration`, 'PUT')).status, 200);
    }
    assert.equal((await users.participants[2].call(`/events/${eventId}/registration`, 'PUT')).status, 409);
  });

  test('iscriversi due volte non conta doppio', async () => {
    const res = await users.participants[0].call(`/events/${eventId}/registration`, 'PUT');
    assert.equal(res.body.registeredCount, 2);
  });

  test("annullando l'iscrizione si libera un posto", async () => {
    await users.participants[0].call(`/events/${eventId}/registration`, 'DELETE');
    assert.equal((await users.participants[2].call(`/events/${eventId}/registration`, 'PUT')).status, 200);
  });

  test("l'organizzatore non può ridurre i posti sotto gli iscritti", async () => {
    assert.equal((await users.organizer.call(`/events/${eventId}`, 'PUT', validEvent({ capacity: 1 }))).status, 409);
  });

  test('solo il proprietario vede la lista iscritti', async () => {
    const own = await users.organizer.call(`/events/${eventId}`);
    const other = await users.participants[0].call(`/events/${eventId}`);
    assert.equal(own.body.participants.length, 2);
    assert.equal(other.body.participants, undefined);
  });

  test("un altro organizzatore non può modificare né cancellare l'evento", async () => {
    assert.equal((await users.otherOrganizer.call(`/events/${eventId}`, 'PUT', validEvent())).status, 403);
    assert.equal((await users.otherOrganizer.call(`/events/${eventId}`, 'DELETE')).status, 403);
  });
});

describe('preferiti', () => {
  test('aggiunta e rimozione', async () => {
    const [event] = (await users.participants[3].call('/events')).body;
    assert.equal((await users.participants[3].call(`/events/${event.id}/favorite`, 'PUT')).body.isFavorite, true);
    assert.equal((await users.participants[3].call(`/events/${event.id}/favorite`, 'DELETE')).body.isFavorite, false);
  });
});
