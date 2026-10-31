import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { startServer } from './test/helpers';

// Una finta build del frontend in una cartella temporanea: il test non dipende da "npm run build".
const dist = mkdtempSync(join(tmpdir(), 'discoverevent-dist-'));
mkdirSync(join(dist, 'assets'));
writeFileSync(join(dist, 'index.html'), '<div id="root"></div>');
writeFileSync(join(dist, 'assets', 'index-abc123.js'), 'console.log(1)');
writeFileSync(join(dist, 'comuni.txt'), 'Roma');
after(() => rmSync(dist, { recursive: true, force: true }));

// startServer restituisce l'indirizzo delle API (…/api): togliendo "/api" si arriva alla radice del sito.
const site = startServer({ staticDir: dist }).replace(/\/api$/, '');

describe('frontend servito da Express (STATIC_DIR)', () => {
  test('le pagine del sito ricevono index.html, sempre ricontrollato', async () => {
    for (const path of ['/', '/eventi/12']) {
      const res = await fetch(site + path);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'no-cache');
      assert.match(await res.text(), /<div id="root">/);
    }
  });

  test('i file in assets/ restano in cache per un anno, gli altri file no', async () => {
    const asset = await fetch(`${site}/assets/index-abc123.js`);
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const other = await fetch(`${site}/comuni.txt`);
    assert.equal(other.headers.get('cache-control'), 'public, max-age=0');
  });

  test('un indirizzo /api sconosciuto resta un 404 in JSON, non la pagina del sito', async () => {
    const res = await fetch(`${site}/api/inesistente`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Risorsa non trovata' });
  });
});

describe('header di sicurezza (helmet)', () => {
  test('la pagina del sito arriva con gli header di sicurezza', async () => {
    const res = await fetch(`${site}/`);
    const csp = res.headers.get('content-security-policy') ?? '';
    // Express non dichiara più di esserlo: meno informazioni a chi cerca versioni vulnerabili.
    assert.equal(res.headers.get('x-powered-by'), null);
    // Le tile di OpenStreetMap rispondono 403 senza Referer: il browser deve mandare almeno l'origine.
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    // Immagini solo dal sito stesso e dalle tile della mappa; nessun sito può incorniciare la pagina.
    assert.match(csp, /img-src 'self' data: https:\/\/\*\.tile\.openstreetmap\.org/);
    assert.match(csp, /frame-ancestors 'self'/);
  });

  test('X-Robots-Tag: noindex solo dove è richiesto (staging)', async () => {
    assert.equal((await fetch(`${site}/`)).headers.get('x-robots-tag'), null);
    const staging = startServer({ staticDir: dist, noIndex: true }).replace(/\/api$/, '');
    assert.equal((await fetch(`${staging}/`)).headers.get('x-robots-tag'), 'noindex');
  });
});
