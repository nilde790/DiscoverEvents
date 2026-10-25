import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseConfig } from './config';

const PRODUCTION = { NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(32) };

describe('configurazione', () => {
  test('senza variabili: niente modalità demo e niente dati della privacy, come in locale oggi', () => {
    const config = parseConfig({});
    assert.equal(config.demoMode, false);
    assert.equal(config.demoAdminEnabled, true);
    assert.deepEqual(config.privacy, { controllerName: null, contactEmail: null });
  });

  test("in produzione l'admin demo è spento, ma in modalità demo torna attivo", () => {
    assert.equal(parseConfig(PRODUCTION).demoAdminEnabled, false);
    assert.equal(parseConfig({ ...PRODUCTION, DEMO_MODE: 'true' }).demoAdminEnabled, true);
  });

  test("DEMO_ADMIN_ENABLED decide comunque sull'admin demo", () => {
    assert.equal(
      parseConfig({ ...PRODUCTION, DEMO_MODE: 'true', DEMO_ADMIN_ENABLED: 'false' }).demoAdminEnabled,
      false,
    );
    assert.equal(parseConfig({ ...PRODUCTION, DEMO_ADMIN_ENABLED: 'true' }).demoAdminEnabled, true);
  });

  test('titolare ed email arrivano dalle variabili; se lasciate vuote valgono come non impostate', () => {
    const set = parseConfig({ PRIVACY_CONTROLLER_NAME: ' Mario Rossi ', PRIVACY_CONTACT_EMAIL: 'privacy@example.com' });
    assert.deepEqual(set.privacy, { controllerName: 'Mario Rossi', contactEmail: 'privacy@example.com' });
    const empty = parseConfig({ PRIVACY_CONTROLLER_NAME: '', PRIVACY_CONTACT_EMAIL: ' ' });
    assert.deepEqual(empty.privacy, { controllerName: null, contactEmail: null });
  });

  test('valori sbagliati fermano il server con un messaggio chiaro', () => {
    assert.throws(() => parseConfig({ DEMO_MODE: 'si' }), /DEMO_MODE/);
    assert.throws(() => parseConfig({ PRIVACY_CONTACT_EMAIL: 'non-una-email' }), /PRIVACY_CONTACT_EMAIL/);
  });
});
