# DiscoverEvent — istruzioni per gli agenti

Web app per trovare eventi vicini su mappa, iscriversi e gestirli come organizzatore.
Frontend React + Vite, backend Express + SQLite (`node:sqlite`), tutto in TypeScript.
Monorepo con **npm workspaces**: `apps/web`, `apps/api`, `packages/shared`.
Interfaccia, commenti e messaggi di errore sono **in italiano**.

## Comandi (dalla radice del progetto)

| Comando | Uso |
|---|---|
| `npm run dev` | Frontend (5173) + API (3001) insieme |
| `npm run check` | Tipi + ESLint + Prettier + test: **deve passare prima di ogni commit** (la CI esegue gli stessi controlli) |
| `npm test` | Solo i test delle API (`apps/api/src/**/*.test.ts`, `node:test`) |
| `npm run lint` / `npm run format` | ESLint / formattazione automatica con Prettier |
| `npm run build` | Build di produzione del frontend |
| `npm start` | Server di produzione (con `STATIC_DIR` serve anche `apps/web/dist`) |
| `docker compose up --build` | Immagine di produzione su http://localhost:8080 (`SESSION_SECRET` dal `.env` della radice) |
| `npm run db:reset` | Cancella il database locale (`apps/api/data`); si ricrea con i dati demo al prossimo avvio |
| `npm install <pkg> -w @discoverevent/api` | Aggiunge una dipendenza a un solo workspace |

Su Windows, se `node` non è nel PATH della shell: `export PATH="/c/Program Files/nodejs:$PATH"`.

## Architettura

**`packages/shared`** (`@discoverevent/shared`) — tipi (`types`), regole Zod (`validation`) e account demo (`demo`), usati **sia** dal frontend **sia** dal backend. Un campo nuovo di un evento si aggiunge qui per primo.

**`apps/api/src`** — organizzato per **funzionalità**:
- `modules/<nome>/` — per ogni funzionalità (`auth`, `events`, `organizer-requests`, `places`, `site-config`, `demo-reset`): `*.routes.ts` (rotte e permessi), `*.repository.ts` (**tutto l'SQL**, le rotte non scrivono query), `*.test.ts`.
- `middleware/` — sessione, utente corrente (`currentUser`, `requireRole`), gestione errori.
- `lib/http.ts` — `HttpError(status, messaggio, campi?)`, `parseBody`, `idParam`, `asyncRoute`.
- `db/` — apertura e migrazioni (`database.ts`), schema (`schema.ts`), dati demo (`seed.ts`), sessioni (`session-store.ts`).
- `config.ts` — variabili d'ambiente validate all'avvio (vedi `apps/api/.env.example`).
- `app.ts` monta middleware e rotte; `index.ts` avvia il server.

**`apps/web/src`** — organizzato per **funzionalità**, import con l'alias `@/` (= `apps/web/src`):
- `features/<nome>/` — `auth`, `events`, `organizer`, `admin`: pagine, componenti, hook e contesto di quella funzionalità.
- `components/ui/` e `components/layout/` — pezzi generici (Field, Toast, Header).
- `lib/` — client API (un metodo per ogni rotta), formattazione, geo, costanti.
- `app/` — rotte (`App.tsx`) e provider (`AppProviders.tsx`).
- Stato globale diviso in contesti: `useAuth()`, `useEvents()`, `useToast()` e `useSiteConfig()` (configurazione del sito letta dal server all'avvio).

## Regole

- **Il server è l'unica fonte di verità** su permessi, limiti di posti e validazione. Il client può anticipare i controlli, mai sostituirli.
- Una funzionalità nuova vive nella sua cartella `modules/<nome>` (api) e `features/<nome>` (web).
- Ogni rotta nuova o regola di business nuova ha almeno un test nel `*.test.ts` del suo modulo (helper comuni in `apps/api/src/test/helpers.ts`).
- Commit di sola formattazione: aggiungi l'hash in `.git-blame-ignore-revs`.
- Non aggiungere dipendenze npm senza chiederlo: proponi prima l'alternativa e il motivo.
- Versioni delle dipendenze fissate (niente `^`), lockfile sempre committato.
- Testi visibili all'utente in italiano, con singolare/plurale corretti.
- Non committare `apps/api/data/` (database locale) né file `.env`.
- **Segreti:** `.claude/settings.json` vieta la lettura di `.env` e dei file di chiavi. Non provare ad aggirarlo; per sapere quali variabili esistono leggi `apps/api/.env.example`. Un segreto non va mai scritto nel codice, nei test o in chat.
- **Modifiche allo schema del database**: aumenta `SCHEMA_VERSION` in `apps/api/src/db/schema.ts` e scrivi una migrazione in `database.ts` che conservi i dati esistenti. Non cancellare e ricreare le tabelle: ora contengono account reali.
- **Autenticazione**: l'utente corrente si ricava solo da `req.session.userId`, mai da dati inviati dal client. Password solo come hash bcrypt; non restituire mai `password_hash` dalle API.

## Flusso di lavoro

1. Un compito = un ramo dal `main` aggiornato: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
2. Mai push diretti su `main`: ogni modifica arriva tramite pull request, revisionata dal proprietario del progetto.
3. Commit nel formato [Conventional Commits](https://www.conventionalcommits.org/it/): `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `test: ...`.
4. Prima del commit: `npm run check`. Per modifiche all'interfaccia, prova anche nel browser.
5. Nella descrizione della PR segui il modello in `.github/pull_request_template.md`, dichiarando anche **cosa non è stato verificato**.
6. Ogni PR con novità per gli utenti aggiunge una riga a *Non ancora rilasciato* in `CHANGELOG.md`.
7. **Rilascio:** PR con `npm version X.Y.Z --workspaces --include-workspace-root --no-git-tag-version` e il changelog; dopo il merge, tag annotato `vX.Y.Z` **su `main` aggiornato** (mai su un ramo, mai prima del merge). Il tag manda in produzione: crealo e pubblicalo solo su richiesta esplicita del proprietario. Un tag pubblicato non si sposta.
8. A fine lavoro, riassumi in chat cosa è cambiato e perché, in modo comprensibile a chi revisiona senza leggere tutto il codice.

## Stato attuale e decisioni prese

- **Login:** registrazione con email e password nell'app (bcryptjs), sessioni con cookie `httpOnly` + `SameSite=Lax` (express-session), limite ai tentativi (express-rate-limit).
- **Ruoli:** `participant`, `organizer`, `admin`. Si nasce partecipanti; chi vuole organizzare (alla registrazione o dal profilo) invia una richiesta che un amministratore approva o rifiuta.
- **Account demo:** password pubblica in `packages/shared/src/demo.ts`, usati dai pulsanti "Prova come…" nella pagina di accesso. L'admin demo è attivo in sviluppo e in modalità demo, spento in produzione senza modalità demo (`DEMO_ADMIN_ENABLED` lo forza).
- **Modalità demo (`DEMO_MODE=true`, sito pubblico):** registrazione bloccata dal server (403), solo account demo, dati riportati al seed ogni notte alle 4 ora italiana (`modules/demo-reset`, un timer nel server: usare una sola istanza). Scelta di minimizzazione dei dati: online nessuno lascia dati personali reali. Spenta di default, così in locale tutto funziona come prima.
- **Configurazione a runtime:** `GET /api/config` (`modules/site-config`) espone `demoMode` e titolare/email della privacy (`PRIVACY_CONTROLLER_NAME`, `PRIVACY_CONTACT_EMAIL`); il frontend la legge all'avvio con `useSiteConfig()`. Dati personali del titolare mai nel codice.
- **Deploy (v1.0.0):** Render, piano gratuito, Docker (`Dockerfile` in due fasi, utente `node`), servizi in `render.yaml`. **Staging** (`discoverevent-staging.onrender.com`, `NOINDEX=true`) si aggiorna da solo dopo ogni merge su `main` con la CI verde; **produzione** (`discoverevent.onrender.com`) solo con un tag `v*`, tramite il job `deploy-production` di `ci.yml` (segreto `RENDER_DEPLOY_HOOK` nell'ambiente `production` di GitHub). Disco non permanente: il database riparte dal seed a ogni deploy, accettato perché il sito è in modalità demo.
- **Sicurezza HTTP:** helmet in `app.ts`. La CSP ammette solo le tile di OpenStreetMap come immagini esterne; `Referrer-Policy: strict-origin-when-cross-origin` perché senza Referer le tile rispondono 403. Una risorsa esterna nuova va aggiunta alla CSP e provata in modalità produzione (in `npm run dev` la pagina la serve Vite, senza CSP).
- **Variabili solo per casi particolari:** `SECURE_COOKIES=false` solo in `compose.yaml` (su http://localhost il cookie `Secure` non arriverebbe); `compose.override.yaml` (non committato) per il certificato di un antivirus, mai dentro l'immagine.
- **Non ancora presenti:** verifica dell'email, recupero password (richiedono l'invio di email).
- **Eventi:** dati demo in sei città italiane (Roma, Milano, Torino, Bologna, Napoli, Firenze), più quelli creati dagli organizzatori. L'importatore da Ticketmaster Discovery API per ora non si fa: lo spike ha mostrato una copertura scarsa fuori da Milano.
