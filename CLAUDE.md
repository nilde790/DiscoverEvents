# DiscoverEvent — istruzioni per gli agenti

Web app per trovare eventi vicini su mappa, iscriversi e gestirli come organizzatore.
Frontend React + Vite, backend Express + SQLite (`node:sqlite`), tutto in TypeScript.
Interfaccia, commenti e messaggi di errore sono **in italiano**.

## Comandi

| Comando | Uso |
|---|---|
| `npm run dev` | Frontend (5173) + API (3001) insieme |
| `npm run check` | Controllo tipi + test: **deve passare prima di ogni commit** |
| `npm test` | Solo i test delle API (`server/*.test.ts`, `node:test`) |
| `npm run build` | Build di produzione |
| `npm run db:reset` | Cancella il database locale; si ricrea con i dati demo al prossimo avvio |

Su Windows, se `node` non è nel PATH della shell: `export PATH="/c/Program Files/nodejs:$PATH"`.

## Architettura

- `shared/` — tipi (`types.ts`) e regole di validazione Zod (`validation.ts`) usati **sia** dal client **sia** dal server. Un campo nuovo di un evento si aggiunge qui per primo.
- `server/app.ts` — rotte e permessi. Gli errori si lanciano con `HttpError(status, messaggio, campi?)`.
- `server/repository.ts` — **tutto l'SQL** dell'app. Le rotte non scrivono query.
- `server/db.ts` — schema e versione dello schema (`PRAGMA user_version`); `server/seed.ts` — dati demo (deterministici, seme fisso).
- `server/sessionStore.ts` — sessioni di login salvate in SQLite.
- `server/index.ts` — configurazione da variabili d'ambiente (vedi `.env.example`).
- `src/context/AppContext.tsx` — stato globale (utente, eventi) e azioni che chiamano l'API.
- `src/api.ts` — client HTTP: un metodo per ogni rotta del server.
- `src/pages/` — una pagina per rotta; `src/components/` — pezzi riusabili.

## Regole

- **Il server è l'unica fonte di verità** su permessi, limiti di posti e validazione. Il client può anticipare i controlli, mai sostituirli.
- Ogni rotta nuova o regola di business nuova ha almeno un test in `server/app.test.ts`.
- Non aggiungere dipendenze npm senza chiederlo: proponi prima l'alternativa e il motivo.
- Versioni delle dipendenze fissate (niente `^`), lockfile sempre committato.
- Testi visibili all'utente in italiano, con singolare/plurale corretti.
- Non committare `server/data/` (database locale) né file `.env`.
- **Modifiche allo schema del database**: aumenta `SCHEMA_VERSION` in `server/db.ts` e scrivi una migrazione che conservi i dati esistenti. Non cancellare e ricreare le tabelle: ora contengono account reali.
- **Autenticazione**: l'utente corrente si ricava solo da `req.session.userId`, mai da dati inviati dal client. Password solo come hash bcrypt; non restituire mai `password_hash` dalle API.

## Flusso di lavoro

1. Un compito = un ramo dal `main` aggiornato: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
2. Mai push diretti su `main`: ogni modifica arriva tramite pull request, revisionata dal proprietario del progetto.
3. Commit nel formato [Conventional Commits](https://www.conventionalcommits.org/it/): `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `test: ...`.
4. Prima del commit: `npm run check`. Per modifiche all'interfaccia, prova anche nel browser.
5. Nella descrizione della PR segui il modello in `.github/pull_request_template.md`, dichiarando anche **cosa non è stato verificato**.
6. A fine lavoro, riassumi in chat cosa è cambiato e perché, in modo comprensibile a chi revisiona senza leggere tutto il codice.

## Stato attuale e decisioni prese

- **Login:** registrazione con email e password nell'app (bcryptjs), sessioni con cookie `httpOnly` + `SameSite=Lax` (express-session), limite ai tentativi (express-rate-limit).
- **Ruoli:** `participant`, `organizer`, `admin`. Si nasce partecipanti; chi vuole organizzare (alla registrazione o dal profilo) invia una richiesta che un amministratore approva o rifiuta.
- **Account demo:** password pubblica in `shared/demo.ts`, usati dai pulsanti "Prova come…" nella pagina di accesso. In produzione chiunque può entrare come admin demo: da rivedere prima del deploy pubblico.
- **Non ancora presenti:** verifica dell'email, recupero password (richiedono l'invio di email).
- **Eventi:** oggi solo dati demo a Roma. Previsto un importatore da fonti esterne (Ticketmaster Discovery API, da verificare la copertura in Italia) insieme agli eventi creati dagli organizzatori.
