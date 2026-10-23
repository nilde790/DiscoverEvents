import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { loginAs, loginDemoUsers, validEvent, type DemoUsers } from '../../test/helpers';

let users: DemoUsers;
before(async () => {
  users = await loginDemoUsers();
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
    assert.equal((await users.organizer.call('/organizer-requests', 'POST', {})).status, 409);
  });

  test("solo l'amministratore vede e gestisce le richieste", async () => {
    assert.equal((await users.participants[0].call('/admin/organizer-requests')).status, 403);
    assert.equal((await users.organizer.call('/admin/organizer-requests')).status, 403);
    const res = await users.admin.call('/admin/organizer-requests?status=pending');
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 2); // le due richieste dei dati demo
  });

  test("l'approvazione rende organizzatore e permette di creare eventi", async () => {
    const client = await loginAs('elena.gallo@example.com');
    const request = (await client.call('/organizer-requests', 'POST', {})).body;
    assert.equal((await client.call('/events', 'POST', validEvent())).status, 403);

    const decided = await users.admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'approved' });
    assert.equal(decided.body.status, 'approved');
    assert.equal((await client.call('/auth/me')).body.user.role, 'organizer');
    assert.equal((await client.call('/events', 'POST', validEvent())).status, 201);

    // Una richiesta già gestita non si può decidere di nuovo.
    const again = await users.admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'rejected' });
    assert.equal(again.status, 409);
  });

  test('il rifiuto lascia il ruolo invariato e permette una nuova richiesta', async () => {
    const client = await loginAs('andrea.conti@example.com');
    const request = (await client.call('/organizer-requests', 'POST', {})).body;
    await users.admin.call(`/admin/organizer-requests/${request.id}`, 'PUT', { decision: 'rejected' });
    const me = (await client.call('/auth/me')).body;
    assert.equal(me.user.role, 'participant');
    assert.equal(me.organizerRequest.status, 'rejected');
    assert.equal((await client.call('/organizer-requests', 'POST', {})).status, 201);
  });
});
