import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Client, startServer } from '../../test/helpers';
import { createNominatimGeocoder } from './geocoder';
import { HttpError } from '../../lib/http';

describe('ricerca città', () => {
  const anonymous = new Client();

  test('chiunque può cercare una città, anche senza accedere', async () => {
    const res = await anonymous.call('/places/search?q=Bologna');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, [{ name: 'Bologna', label: 'Bologna, Emilia-Romagna', lat: 44.49, lng: 11.34 }]);
  });

  test('una città sconosciuta restituisce una lista vuota', async () => {
    const res = await anonymous.call('/places/search?q=Atlantide');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test('un testo troppo corto o assente è rifiutato con l’errore sul campo', async () => {
    for (const path of ['/places/search?q=a', '/places/search']) {
      const res = await anonymous.call(path);
      assert.equal(res.status, 400);
      assert.ok(res.body.fields.q);
    }
  });

  test('se il servizio esterno non risponde, errore 502 con un messaggio chiaro', async () => {
    const broken = startServer({
      geocoder: {
        search: async () => {
          throw new HttpError(502, 'Ricerca città non disponibile: riprova tra poco');
        },
      },
    });
    const res = await new Client(broken).call('/places/search?q=Roma');
    assert.equal(res.status, 502);
    assert.match(res.body.error, /non disponibile/);
  });
});

describe('geocoder Nominatim', () => {
  /** Finto `fetch` che conta le chiamate e risponde come Nominatim. */
  function fakeFetch(body: unknown, status = 200) {
    const calls: string[] = [];
    const fn = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return new Response(JSON.stringify(body), { status });
    }) as typeof fetch;
    return { fn, calls };
  }

  const bologna = { name: 'Bologna', display_name: 'Bologna, Emilia-Romagna, Italia', lat: '44.4938', lon: '11.3387' };

  test('trasforma la risposta in luoghi con nome, regione e coordinate numeriche', async () => {
    const { fn, calls } = fakeFetch([{ ...bologna, address: { state: 'Emilia-Romagna' } }]);
    const geocoder = createNominatimGeocoder({ userAgent: 'test', fetchFn: fn, minIntervalMs: 0 });
    const places = await geocoder.search('Bologna');
    assert.deepEqual(places, [{ name: 'Bologna', label: 'Bologna, Emilia-Romagna', lat: 44.4938, lng: 11.3387 }]);
    assert.match(calls[0], /countrycodes=it/);
  });

  test('la stessa ricerca (anche con maiuscole diverse) usa la cache e non richiama il servizio', async () => {
    const { fn, calls } = fakeFetch([bologna]);
    const geocoder = createNominatimGeocoder({ userAgent: 'test', fetchFn: fn, minIntervalMs: 0 });
    await geocoder.search('Bologna');
    await geocoder.search('  bologna ');
    assert.equal(calls.length, 1);
  });

  test('i luoghi con lo stesso nome nella stessa regione compaiono una volta sola', async () => {
    const { fn } = fakeFetch([bologna, bologna]);
    const geocoder = createNominatimGeocoder({ userAgent: 'test', fetchFn: fn, minIntervalMs: 0 });
    assert.equal((await geocoder.search('Bologna')).length, 1);
  });

  test('una risposta di errore del servizio diventa un 502 e lo stato finisce nel log', async () => {
    const { fn } = fakeFetch({ error: 'rate limited' }, 429);
    const logs: string[] = [];
    const geocoder = createNominatimGeocoder({
      userAgent: 'test',
      fetchFn: fn,
      minIntervalMs: 0,
      logError: (m) => logs.push(m),
    });
    await assert.rejects(geocoder.search('Roma'), (err) => err instanceof HttpError && err.status === 502);
    assert.match(logs[0], /429/);
  });

  test('se la connessione fallisce, il log riporta la causa vera ma non la città cercata', async () => {
    // Come fa fetch() di Node: l'errore generico "fetch failed" ha il motivo reale in `cause`.
    const certificateError = Object.assign(new Error('unable to verify the first certificate'), {
      code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    });
    const fn = (async () => {
      throw new TypeError('fetch failed', { cause: certificateError });
    }) as typeof fetch;
    const logs: string[] = [];
    const geocoder = createNominatimGeocoder({
      userAgent: 'test',
      fetchFn: fn,
      minIntervalMs: 0,
      logError: (m) => logs.push(m),
    });

    await assert.rejects(
      geocoder.search('Ravenna'),
      (err) => err instanceof HttpError && err.status === 502 && /non disponibile/.test(err.message),
    );
    assert.equal(logs.length, 1);
    assert.match(logs[0], /UNABLE_TO_VERIFY_LEAF_SIGNATURE/);
    assert.match(logs[0], /--use-system-ca/);
    assert.doesNotMatch(logs[0], /Ravenna/i);
  });

  test('tra due richieste al servizio passa almeno l’intervallo minimo', async () => {
    const { fn } = fakeFetch([]);
    const geocoder = createNominatimGeocoder({ userAgent: 'test', fetchFn: fn, minIntervalMs: 200 });
    const startedAt = Date.now();
    await Promise.all([geocoder.search('Roma'), geocoder.search('Milano')]);
    assert.ok(Date.now() - startedAt >= 190, 'la seconda richiesta doveva aspettare');
  });
});
