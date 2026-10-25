import assert from 'node:assert/strict';
import type { DatabaseSync } from 'node:sqlite';
import { describe, test } from 'node:test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@discoverevent/shared/demo';
import { openDatabase } from '../../db/database';
import { Client, startServer, validEvent } from '../../test/helpers';
import { resetToDemoData } from './demo-reset.repository';
import { demoDay } from './demo-reset.scheduler';

const count = (db: DatabaseSync, table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('azzeramento dei dati demo', () => {
  test('cancella account nuovi, modifiche e sessioni e riporta i dati di partenza', async () => {
    const db = openDatabase(':memory:');
    const base = startServer({}, db);
    const tables = ['users', 'events', 'registrations', 'organizer_requests'];
    const initial = tables.map((t) => count(db, t));

    // Un po' di attività durante la giornata: un account nuovo, un evento nuovo, un'iscrizione.
    const newcomer = new Client(base);
    const registered = await newcomer.call('/auth/register', 'POST', {
      name: 'Utente Del Giorno',
      email: 'utente.giorno@example.com',
      password: 'password-sicura',
      wantsOrganizer: true,
    });
    assert.equal(registered.status, 201);
    const organizer = new Client(base);
    await organizer.call('/auth/login', 'POST', { email: DEMO_ACCOUNTS.organizer.email, password: DEMO_PASSWORD });
    const created = await organizer.call('/events', 'POST', validEvent());
    assert.equal(created.status, 201);
    await newcomer.call(`/events/${created.body.id}/registration`, 'PUT');
    assert.notDeepEqual(
      tables.map((t) => count(db, t)),
      initial,
    );

    resetToDemoData(db);

    assert.deepEqual(
      tables.map((t) => count(db, t)),
      initial,
    );
    assert.equal(count(db, 'sessions'), 0);
    assert.equal((await newcomer.call('/auth/me')).body.user, null, 'chi era connesso deve rientrare');
    assert.equal((await new Client(base).call(`/events/${created.body.id}`)).status, 404);
    const login = await new Client(base).call('/auth/login', 'POST', {
      email: 'utente.giorno@example.com',
      password: 'password-sicura',
    });
    assert.equal(login.status, 401);
  });

  test("senza admin demo (includeAdmin: false) l'admin demo non viene ricreato", () => {
    const db = openDatabase(':memory:');
    resetToDemoData(db, { includeAdmin: false });
    assert.equal(db.prepare('SELECT 1 FROM users WHERE email = ?').get(DEMO_ACCOUNTS.admin.email), undefined);
  });
});

describe('giornata demo (quando scatta l’azzeramento)', () => {
  test('cambia alle 4:00 ora italiana, anche con l’ora legale', () => {
    // 25 ottobre 2026, ora solare (UTC+1): le 4:00 italiane sono le 3:00 UTC.
    assert.equal(demoDay(new Date('2026-10-25T02:59:00Z')), '2026-10-24');
    assert.equal(demoDay(new Date('2026-10-25T03:00:00Z')), '2026-10-25');
    // 15 luglio 2026, ora legale (UTC+2): le 4:00 italiane sono le 2:00 UTC.
    assert.equal(demoDay(new Date('2026-07-15T01:59:00Z')), '2026-07-14');
    assert.equal(demoDay(new Date('2026-07-15T02:00:00Z')), '2026-07-15');
  });
});
