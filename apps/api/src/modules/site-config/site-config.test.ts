import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Client, startServer } from '../../test/helpers';

describe('configurazione pubblica (GET /api/config)', () => {
  test('senza opzioni: niente modalità demo e dati della privacy vuoti', async () => {
    const res = await new Client().call('/config');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { demoMode: false, privacy: { controllerName: null, contactEmail: null } });
  });

  test('restituisce modalità demo e privacy impostate sul server, anche a chi non ha fatto accesso', async () => {
    const privacy = { controllerName: 'Mario Rossi', contactEmail: 'privacy@example.com' };
    const res = await new Client(startServer({ demoMode: true, privacy })).call('/config');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { demoMode: true, privacy });
  });
});
