import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after } from 'node:test';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@discoverevent/shared/demo';
import type { EventInput } from '@discoverevent/shared/types';
import { createApp, type AppOptions } from '../app';
import { openDatabase } from '../db/database';
import type { Geocoder } from '../modules/places/geocoder';

// Ogni server di test usa un database in memoria con i dati demo: i test non toccano quello vero.
const servers: Server[] = [];
after(() => servers.forEach((s) => s.close()));

/** Geocoder finto: i test non chiamano mai il servizio esterno. Conosce solo Bologna. */
export const fakeGeocoder: Geocoder = {
  search: async (query) =>
    query.toLowerCase().startsWith('bol')
      ? [{ name: 'Bologna', label: 'Bologna, Emilia-Romagna', lat: 44.49, lng: 11.34 }]
      : [],
};

/** Passando `db` più server condividono lo stesso database (es. per simulare un cambio di configurazione). */
export function startServer(
  options: Partial<AppOptions> = {},
  db = openDatabase(':memory:', { seedDemoAdmin: options.demoAdminEnabled ?? true }),
) {
  const server = createApp(db, {
    sessionSecret: 'segreto-di-test',
    authAttemptsPerWindow: 1000,
    geocoder: fakeGeocoder,
    ...options,
  }).listen(0);
  servers.push(server);
  return `http://localhost:${(server.address() as AddressInfo).port}/api`;
}

/** Server condiviso dai test dello stesso file (ogni file di test gira in un processo separato). */
const defaultBase = startServer();

/** Un "browser" di test: conserva il cookie di sessione tra una richiesta e l'altra. */
export class Client {
  cookie = '';
  lastSetCookie = '';

  constructor(private readonly baseUrl = defaultBase) {}

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
    // `any` di proposito: ogni test legge campi diversi della risposta.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = res.status === 204 ? null : await res.json();
    return { status: res.status, body };
  }
}

export async function loginAs(email: string) {
  const client = new Client();
  const res = await client.call('/auth/login', 'POST', { email, password: DEMO_PASSWORD });
  assert.equal(res.status, 200, `login di ${email} fallito`);
  return client;
}

/** Accede con gli account demo usati da più file di test. */
export async function loginDemoUsers() {
  return {
    organizer: await loginAs(DEMO_ACCOUNTS.organizer.email),
    otherOrganizer: await loginAs('arteviva@example.com'),
    admin: await loginAs(DEMO_ACCOUNTS.admin.email),
    participants: await Promise.all(
      ['giulia.rossi', 'sara.romano', 'luca.colombo', 'matteo.marino'].map((n) => loginAs(`${n}@example.com`)),
    ),
  };
}

export type DemoUsers = Awaited<ReturnType<typeof loginDemoUsers>>;

const inOneWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

export const validEvent = (overrides: Partial<EventInput> = {}): EventInput => ({
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
