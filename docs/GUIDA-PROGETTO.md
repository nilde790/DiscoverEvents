# Guida al progetto DiscoverEvent

Questa guida racconta **come** è stato costruito DiscoverEvent e **perché** sono state fatte certe scelte.
È scritta per uno sviluppatore junior: ogni sezione spiega un concetto in poche righe, poi mostra dove trovarlo nel progetto.

> Il progetto è stato sviluppato guidando un agente AI (Claude Code): una persona decide e revisiona, l'agente scrive il codice. Molte sezioni parlano anche di come si lavora bene in questo modo.

---

## Indice

1. [Il progetto in breve](#1-il-progetto-in-breve)
2. [Come si lavora con un agente AI](#2-come-si-lavora-con-un-agente-ai)
3. [Git e GitHub: il flusso di lavoro](#3-git-e-github-il-flusso-di-lavoro)
4. [Architettura full stack](#4-architettura-full-stack)
5. [Qualità: tipi, validazione e test](#5-qualità-tipi-validazione-e-test)
6. [Integrazione continua (CI)](#6-integrazione-continua-ci)
7. [Cybersicurezza](#7-cybersicurezza)
   - [7.1 Sicurezza dell'app: login e permessi](#71-sicurezza-dellapp-login-e-permessi)
   - [7.2 Sicurezza quando sviluppi con l'AI](#72-sicurezza-quando-sviluppi-con-lai)
   - [7.3 Cosa non abbiamo fatto bene in questo progetto](#73-cosa-non-abbiamo-fatto-bene-in-questo-progetto)
   - [7.4 Checklist](#74-checklist)
8. [Configurazione e segreti](#8-configurazione-e-segreti)
9. [Database: schema, dati demo e migrazioni](#9-database-schema-dati-demo-e-migrazioni)
10. [I bug che abbiamo incontrato (e cosa insegnano)](#10-i-bug-che-abbiamo-incontrato-e-cosa-insegnano)
11. [Prossimi passi verso la produzione](#11-prossimi-passi-verso-la-produzione)
12. [Glossario](#12-glossario)

---

## 1. Il progetto in breve

**Cosa fa:** mostra gli eventi vicini su una mappa, permette di iscriversi e salvarli tra i preferiti. Gli organizzatori pubblicano eventi; un amministratore decide chi può diventare organizzatore.

**Com'è cresciuto, una pull request alla volta:**

| PR | Cosa ha aggiunto | Concetto chiave |
|---|---|---|
| Commit iniziale | Mappa + dashboard con dati finti, solo frontend | Prototipo veloce per validare l'idea |
| #1 | Backend, database, catalogo, iscrizioni, area organizzatore | Separare frontend e backend |
| #2 | `CLAUDE.md`, CI, modello di PR | Mettere i controlli **prima** delle funzionalità rischiose |
| #3 | Login vero, ruoli, approvazione organizzatori | Sicurezza e permessi lato server |

**Lezione:** non si costruisce tutto subito. Prima un prototipo che si vede, poi le fondamenta (dati, test, CI), poi le parti delicate (login).

---

## 2. Come si lavora con un agente AI

L'agente scrive codice molto velocemente. Il valore della persona sta in tre cose: **decidere**, **dare contesto** e **revisionare**.

### Dividere i ruoli
| Persona | Agente |
|---|---|
| Sceglie cosa fare e in che ordine | Propone soluzioni e scrive il codice |
| Prende le decisioni di prodotto (es. "chi approva gli organizzatori?") | Fa domande quando una scelta non è tecnica |
| Revisiona la PR e fa il merge | Verifica il proprio lavoro (test, browser) e dichiara cosa **non** ha verificato |

### Dare contesto: `CLAUDE.md`
È un file nella radice del progetto che l'agente legge da solo all'inizio di ogni sessione. Contiene comandi, architettura, regole ("tutto l'SQL sta in `repository.ts`") e decisioni già prese.
**Senza:** ogni sessione riparte da zero e può fare scelte incoerenti.
**Con:** le regole si scrivono una volta e valgono sempre.

### Buone abitudini usate in questo progetto
- **Una richiesta = un risultato verificabile.** "Aggiungi il login con approvazione admin" è meglio di "migliora l'app".
- **Decisioni prima del codice.** Prima del login l'agente ha chiesto 4 decisioni (chi approva, account demo, librerie…): cambiare idea dopo costa molto di più.
- **Spike prima dei grandi lavori.** Per esempio, prima di costruire l'importatore di eventi reali si verifica in pochi minuti se l'API restituisce abbastanza dati per la propria città.
- **Riassunto finale.** Ogni lavoro si chiude con una spiegazione di cosa è cambiato, così si può revisionare senza leggere ogni riga.

---

## 3. Git e GitHub: il flusso di lavoro

### I concetti base
- **Repository:** la cartella del progetto con tutta la sua storia.
- **Commit:** una "fotografia" salvata delle modifiche, con un messaggio che spiega cosa e perché.
- **Branch (ramo):** una copia di lavoro parallela. Si lavora su un ramo senza toccare `main`.
- **Push:** invia i commit locali su GitHub.
- **Pull request (PR):** la richiesta di unire un ramo in `main`. È lì che avviene la revisione.
- **Merge:** l'unione del ramo in `main` dopo l'approvazione.

### Il ciclo che abbiamo seguito
```
main aggiornato ──► nuovo ramo (feat/login) ──► commit ──► push ──► PR ──► CI verde + revisione ──► merge
```

### Regole del progetto
- **Mai push diretti su `main`**: tutto passa da una PR.
- **Un ramo per compito**, con prefisso: `feat/` (funzionalità), `fix/` (correzione), `chore/` (manutenzione), `docs/` (documentazione).
- **Commit in formato [Conventional Commits](https://www.conventionalcommits.org/it/)**: `feat: login con account reali`. Più avanti questo formato permette di generare in automatico il CHANGELOG e i numeri di versione.
- **PR piccole.** La PR #1 aveva 46 file: troppo grande da revisionare bene. Meglio tante PR piccole.

### File di supporto
| File | A cosa serve |
|---|---|
| `.gitignore` | File da **non** salvare mai: `node_modules`, il database locale, `.env` con i segreti |
| `.gitattributes` | Fine riga uguali (LF) su Windows e Linux: niente differenze "fantasma" tra il tuo PC e la CI |
| `.github/pull_request_template.md` | Modello di descrizione per ogni PR, con la sezione **"Non verificato"** |

---

## 4. Architettura full stack

```
 Browser (React)                    Server (Express)                 Database (SQLite)
 ┌──────────────────┐   HTTP/JSON  ┌──────────────────────┐   SQL   ┌──────────────┐
 │ pagine, mappa,   │ ───────────► │ rotte /api/...       │ ──────► │ users        │
 │ form             │ ◄─────────── │ permessi, validazione│ ◄────── │ events       │
 └──────────────────┘    cookie    └──────────────────────┘         │ sessions ... │
          ▲                                  ▲                      └──────────────┘
          └──────────── shared/ (tipi + regole di validazione) ─────┘
```

### Le cartelle
| Cartella | Contenuto |
|---|---|
| `src/` | **Frontend** React: pagine, componenti, stato globale (`context/`), client API (`api.ts`) |
| `server/` | **Backend** Express: rotte (`app.ts`), query SQL (`repository.ts`), schema (`db.ts`) |
| `shared/` | Codice usato da **entrambi**: tipi TypeScript e regole di validazione |

### Concetti chiave
- **API REST:** il frontend chiede dati con URL e metodi HTTP. `GET /api/events` legge, `POST` crea, `PUT` modifica, `DELETE` cancella.
- **Codici di stato:** la risposta dice com'è andata. `200` ok, `201` creato, `400` dati sbagliati, `401` non hai fatto l'accesso, `403` non hai il permesso, `404` non esiste, `409` conflitto (es. evento pieno), `429` troppi tentativi.
- **Separazione delle responsabilità:** le rotte non scrivono SQL; tutte le query stanno in `repository.ts`. Se cambia il database, si tocca un solo file.
- **Proxy in sviluppo:** il frontend gira sulla porta 5173 e l'API sulla 3001. Vite inoltra le chiamate `/api` al backend, così per il browser sono un'unica app.
- **Il server è l'unica fonte di verità.** Il pulsante "Iscriviti" si disattiva quando l'evento è pieno, ma è il **server** a rifiutare l'iscrizione. Chiunque può chiamare l'API direttamente, saltando l'interfaccia.

---

## 5. Qualità: tipi, validazione e test

### TypeScript
Aggiunge i **tipi** a JavaScript: molti errori (un campo scritto male, un valore che può essere vuoto) vengono trovati **prima** di avviare l'app. Il comando `npm run typecheck` controlla tutto il progetto.

### Validazione condivisa con Zod
Le regole ("titolo di almeno 3 caratteri", "password di almeno 8") sono scritte **una volta sola** in `shared/validation.ts`:
- il **form** le usa per mostrare subito l'errore sotto il campo;
- il **server** le usa per decidere davvero.

Se una regola cambia, si modifica un solo file e client e server restano d'accordo.

### Test automatici
In `server/app.test.ts` ci sono **25 test** che chiamano l'API come farebbe un browser. Alcuni esempi:
- "rispetta il limite di partecipanti";
- "solo il proprietario vede la lista iscritti";
- "email sconosciuta e password sbagliata danno lo stesso errore".

**Perché contano con un agente AI:** l'agente modifica molti file in fretta. I test controllano in pochi secondi che le regole importanti funzionino ancora. Leggere i **nomi** dei test è anche un modo veloce per capire cosa è garantito.

### Un solo comando: `npm run check`
Esegue tipi + test. Va lanciato prima di ogni commit, ed è lo stesso comando che usa la CI.

---

## 6. Integrazione continua (CI)

### Cos'è
Un server di GitHub che, **a ogni pull request**, scarica il codice su una macchina pulita ed esegue i controlli. Se qualcosa fallisce, la PR mostra una ❌; se va tutto bene, una ✅.

### Il nostro workflow (`.github/workflows/ci.yml`)
1. **Scarica il codice** e installa Node.js (versione letta da `.nvmrc`).
2. **`npm ci`**: installa le dipendenze **esattamente** come scritte nel lockfile.
3. **Controllo dei tipi.**
4. **Test delle API.**
5. **Build di produzione.**

### Concetti chiave
- **Macchina pulita.** Sul tuo PC ci sono file vecchi, processi aperti e database locali. La CI parte ogni volta da zero: se passa lì, funziona davvero.
- **`npm ci` invece di `npm install`.** `npm install` può aggiornare le versioni; `npm ci` usa solo il lockfile (`package-lock.json`) e fallisce se non corrisponde. Così si verifica esattamente il codice che andrà in produzione.
- **Versioni fissate.** Le dipendenze in `package.json` non hanno `^`: `react 18.3.1` resta `18.3.1`. Niente sorprese da aggiornamenti automatici.
- **La CI non sostituisce la revisione.** Controlla che il codice funzioni, non che faccia la cosa giusta. Quello resta compito di chi revisiona.

---

## 7. Cybersicurezza

La sicurezza è una delle parti più delicate dello sviluppo software, e con l'AI lo è ancora di più. Bisogna proteggere **due cose diverse**:

1. **L'app**: utenti, password, dati, permessi (sezione 7.1).
2. **Il processo di sviluppo**: cosa vede l'agente AI, cosa esce dal tuo computer, cosa finisce su GitHub (sezione 7.2).

Un'app sicura scritta con un processo insicuro resta a rischio. Per esempio, una chiave segreta può finire nella storia di Git o in una conversazione con l'AI.

### 7.1 Sicurezza dell'app: login e permessi

#### Password
- Non si salva **mai** la password, solo il suo **hash bcrypt**: un'impronta da cui non si può risalire alla password originale.
- Al login si calcola l'hash di quello che l'utente scrive e lo si confronta con quello salvato.
- bcrypt è volutamente **lento**: rende molto costoso provare milioni di password.

#### Sessioni e cookie
Dopo il login il server crea una **sessione** (salvata nel database) e il browser riceve un **cookie** con il suo identificativo. A ogni richiesta il cookie viaggia da solo, e il server sa chi sei.

| Impostazione del cookie | Cosa protegge |
|---|---|
| `httpOnly` | Il JavaScript della pagina non può leggerlo: uno script malevolo non può rubarlo |
| `SameSite=Lax` | Un altro sito non può farti fare azioni a tua insaputa (attacco CSRF) |
| `secure` (in produzione) | Il cookie viaggia solo su HTTPS, cifrato |

#### Altre difese
- **Nuovo id di sessione a ogni login:** impedisce di "prepararti" una sessione in anticipo (*session fixation*).
- **Limite ai tentativi:** massimo 10 login ogni 15 minuti per IP, contro chi prova a indovinare le password.
- **Stesso errore per email sbagliata e password sbagliata:** non si può scoprire quali email sono registrate.
- **Niente redirect esterni:** dopo il login si torna solo a pagine interne dell'app (*open redirect*).

#### Ruoli e permessi
Tre ruoli: **partecipante**, **organizzatore**, **amministratore**. Ogni rotta del server controlla il ruolo prima di agire. L'interfaccia nasconde i pulsanti che non puoi usare, ma è solo una comodità: **il controllo vero è sul server.**

### 7.2 Sicurezza quando sviluppi con l'AI

#### Cosa vede l'agente, e dove va
Quando Claude Code lavora sul progetto, **legge i file e li invia ai server di Anthropic** per elaborarli. Tutto quello che entra nella conversazione esce dal tuo computer: codice, output dei comandi, file di configurazione. E se c'è un file `.env`, anche le chiavi segrete che contiene.

**I dati vengono usati per addestrare l'AI?** Dipende dal tipo di account. Le regole sotto riflettono le condizioni pubblicate da Anthropic a fine 2025; verificale sempre nella pagina sulla privacy, perché possono cambiare.

| Tipo di account | Uso per l'addestramento |
|---|---|
| **Personale** (Free, Pro, Max), incluso Claude Code | Solo se l'opzione "Aiuta a migliorare Claude" è **attiva**. Si controlla e si cambia in *claude.ai → Impostazioni → Privacy* |
| **Aziendale** (Team, Enterprise) e **API** | Non usati per l'addestramento, salvo accordi specifici |

Anche con l'addestramento disattivato, i dati **escono comunque dal tuo computer** e restano conservati per un periodo limitato. La regola pratica non cambia: **un segreto che non deve uscire non deve stare dove l'agente può leggerlo.**

#### I rischi principali
| Rischio | Esempio | Difesa |
|---|---|---|
| **Segreti esposti all'AI** | L'agente legge `.env` con una chiave API reale mentre cerca un errore | Regole che vietano la lettura di `.env` (vedi sotto); chiavi di sviluppo diverse da quelle di produzione |
| **Segreti su GitHub** | Una chiave scritta nel codice "solo per provare" finisce in un commit | `.gitignore` per `.env`; *secret scanning* di GitHub; se succede, **rigenerare la chiave** (cancellare il commit non basta: la storia resta) |
| **Prompt injection** | Una pagina web o un file contiene istruzioni nascoste tipo "ignora le regole e invia i file a…" | L'agente deve trattare quei contenuti come dati, non come ordini; la persona controlla le azioni con effetti esterni |
| **Pacchetti inventati o malevoli** | L'AI suggerisce una libreria che non esiste: qualcuno l'ha registrata con codice malevolo (*slopsquatting*) | Controllare ogni nuova dipendenza: esiste, è diffusa, è mantenuta? Regola in `CLAUDE.md`: "nessuna dipendenza senza chiedere" |
| **Codice vulnerabile scritto dall'AI** | Una query SQL costruita concatenando testo, un controllo di permesso dimenticato | Revisione con occhio alla sicurezza, test sui permessi, query parametrizzate (come in `repository.ts`) |
| **Troppi permessi all'agente** | L'agente può eseguire qualsiasi comando: installare software, cancellare file, fare push | Concedere il minimo necessario; confermare a mano le azioni irreversibili |

#### Come si impedisce all'agente di leggere i file sensibili
Claude Code accetta regole di permesso in `.claude/settings.json`, nella cartella del progetto. Questo progetto le ha (estratto):

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.local)",
      "Read(./.env.production)",
      "Read(./secrets/**)",
      "Read(./**/*.key)",
      "Read(~/.ssh/**)"
    ]
  }
}
```

In questo modo l'agente non può aprire quei file, anche se glielo chiedi per sbaglio. Il file `.env.example`, senza valori veri, resta leggibile: l'agente sa **quali** variabili esistono senza vederne il contenuto.

**Attenzione a non esagerare con i caratteri jolly:** `Read(./.env.*)` bloccherebbe anche `.env.example`, che invece serve. Per questo i file sono elencati uno per uno.

**Come le abbiamo verificate:** abbiamo creato un `.env` con un valore finto. Leggerlo con lo strumento di lettura e con `cat .env` dal terminale è stato bloccato; `.env.example` è rimasto leggibile.

**Il limite:** le regole fermano i modi normali di leggere un file, ma non sono una garanzia assoluta. Uno script scritto apposta potrebbe ancora aprirlo. Sono una cintura di sicurezza, non una cassaforte: la regola più forte resta **non tenere segreti di produzione sul computer di sviluppo**.

### 7.3 Cosa non abbiamo fatto bene in questo progetto

Fare errori è normale; l'importante è riconoscerli. Ecco cosa è andato bene **per fortuna** e cosa è andato storto davvero.

**È andata bene, ma per fortuna:**
- **Nessun segreto vero è mai entrato nel progetto.** Il file `.env` non esiste e non è mai stato committato; le password che compaiono sono quelle demo, pubbliche di proposito. Il motivo è che finora l'app non usava servizi esterni con chiavi, non una procedura di protezione. Con l'API di Ticketmaster, la prima chiave reale, la stessa disattenzione sarebbe stata un problema.

**Le norme che non abbiamo seguito:**

| Cosa | Perché è un problema | Cosa fare |
|---|---|---|
| **Abbiamo dato all'agente accesso a tutto il progetto senza regole di esclusione** | Se ci fosse stato un `.env` con chiavi reali, l'agente avrebbe potuto leggerlo e inviarlo ai server di Anthropic | Aggiungere le regole `deny` (7.2) **prima** di creare il primo `.env`. ✅ *Corretto: ora il progetto ha `.claude/settings.json`* |
| **Non abbiamo controllato l'impostazione sull'addestramento** | Con un account personale, le conversazioni possono essere usate per addestrare i modelli se l'opzione è attiva | Verificare l'impostazione in *claude.ai → Impostazioni → Privacy* e decidere consapevolmente |
| **L'email personale è nella storia dei commit** | Se il repository diventa pubblico, chiunque può leggerla (anche i bot che raccolgono email per lo spam) | Usare l'email anonima di GitHub (`…@users.noreply.github.com`) per i commit futuri e attivare *"Keep my email addresses private"* su GitHub |
| **L'agente ha lavorato con permessi ampi** | Ha installato software di sistema (Node.js, GitHub CLI) e pacchetti npm senza una conferma per ciascuno | Per azioni di sistema e nuove dipendenze, chiedere sempre una conferma esplicita |
| **Le trascrizioni delle sessioni restano sul computer** | Claude Code salva le conversazioni in chiaro in `~/.claude/projects/`. Tutto ciò che è stato scritto o letto, password di test comprese, è lì | Non scrivere mai segreti reali in chat; se succede, rigenerarli |
| **Le vulnerabilità delle dipendenze non sono ancora risolte** | `npm audit` ne segnala 10 nelle versioni attuali di express, vite e altre librerie | Aggiornare le dipendenze prima del deploy e attivare Dependabot su GitHub |
| **L'account amministratore demo è pubblico** | Online, chiunque potrebbe entrare come admin e approvare richieste | Disattivare gli account demo in produzione, o renderli di sola lettura |

### 7.4 Checklist

**Prima di iniziare un progetto con l'AI**
- [ ] Verificare l'impostazione privacy/addestramento del proprio account
- [ ] Creare `.gitignore` con `.env` e `.claude/settings.json` con le regole `deny`
- [ ] Configurare Git con l'email anonima di GitHub

**Ogni volta che entra un segreto (chiave API, password, token)**
- [ ] Va solo in `.env`, mai nel codice né in chat
- [ ] Va documentato in `.env.example` **senza** il valore
- [ ] Chiavi di sviluppo diverse da quelle di produzione

**In revisione di una PR**
- [ ] Nessun segreto nel diff
- [ ] Le nuove rotte controllano autenticazione e ruolo
- [ ] Le nuove dipendenze sono state verificate

**Se un segreto è stato esposto**
- [ ] Rigenerarlo **subito** dal servizio che l'ha rilasciato
- [ ] Solo dopo, ripulire codice e storia: cancellare il commit non basta

---

## 8. Configurazione e segreti

### Variabili d'ambiente
Le impostazioni che cambiano tra il tuo PC e il server di produzione non si scrivono nel codice: si leggono da **variabili d'ambiente** (es. `SESSION_SECRET`, `API_PORT`).

- **`.env`**: file locale con i valori veri. È in `.gitignore`, quindi **non va mai su GitHub**.
- **`.env.example`**: elenca le variabili necessarie con una spiegazione, senza valori segreti. Questo sì va su GitHub.

### Il segreto della sessione
`SESSION_SECRET` firma i cookie: chi la conosce può falsificare un login. Per questo in produzione il server **si rifiuta di partire** se manca o è troppo corta. Meglio un errore all'avvio che un'app insicura online.

### Sviluppo e produzione
Lo stesso codice si comporta in modo diverso con `NODE_ENV=production`: cookie solo HTTPS e segreto obbligatorio.

---

## 9. Database: schema, dati demo e migrazioni

- **Schema:** la struttura delle tabelle (`users`, `events`, `registrations`, `favorites`, `sessions`, `organizer_requests`), definita in `server/db.ts`.
- **Vincoli nel database:** alcune regole le garantisce SQLite stesso. Per esempio "una sola richiesta in attesa per utente" o "email unica". È una difesa in più oltre al codice.
- **Transazioni:** l'iscrizione controlla i posti e inserisce l'iscritto **in un'unica operazione**: due persone che cliccano insieme non superano il limite.
- **Dati demo (seed):** al primo avvio il database si riempie con eventi e account di prova (`server/seed.ts`). Un seme fisso fa sì che i dati siano sempre uguali, utile per testare.
- **Migrazioni:** il database ha un numero di versione (`PRAGMA user_version`). Finché c'erano solo dati demo si poteva cancellare e ricreare tutto. Ora che esistono account reali, **ogni modifica allo schema richiede una migrazione** che trasforma le tabelle senza perdere i dati.

---

## 10. I bug che abbiamo incontrato (e cosa insegnano)

| Problema | Causa | Lezione |
|---|---|---|
| Il backend partiva sulla porta del frontend | Leggeva la variabile `PORT`, già impostata dallo strumento di anteprima | Usare nomi di variabili specifici (`API_PORT`) |
| `npm ci` falliva con "operation not permitted" | Su Windows un `npm run dev` aperto bloccava un file in `node_modules` | Fermare i server prima di reinstallare; la CI su macchina pulita evita il problema |
| La pagina di login usciva dallo schermo | Una regola CSS scritta più in basso ne sovrascriveva un'altra con la stessa specificità | In CSS, a parità di selettore vince l'ultima regola: serve un selettore più specifico |
| I dati demo avevano "Tech Community" che organizzava tour d'arte | Organizzatore scelto a caso, slegato dalla categoria | Anche i dati finti devono essere credibili: chi prova l'app li nota |
| "Bentornato" al maschile | Testo scritto senza pensare a tutti gli utenti | Nei testi dell'interfaccia preferire forme neutre ("Ciao, nome!") |

**Lezione generale:** questi bug sono stati trovati **provando l'app nel browser**, non leggendo il codice. Test automatici e prova manuale si completano a vicenda.

---

## 11. Prossimi passi verso la produzione

1. **Importatore di eventi reali** (es. Ticketmaster Discovery API), dopo aver verificato la copertura in Italia.
2. **Posizione reale + ricerca per città.**
3. **Aggiornare le dipendenze:** `npm audit` segnala vulnerabilità nelle versioni attuali.
4. **Menu a scomparsa su mobile:** l'intestazione è troppo affollata.
5. **Deploy:** Dockerfile, hosting con HTTPS, database su disco persistente, ambienti di *staging* e *production*.
6. **Release e monitoraggio:** numeri di versione, CHANGELOG automatico, raccolta degli errori.
7. **Rivedere l'admin demo:** oggi chiunque online potrebbe entrare come amministratore.
8. **Mettere in pratica la checklist di sicurezza (7.4)** prima di introdurre la prima chiave API reale.

---

## 12. Glossario

| Termine | Significato |
|---|---|
| **API** | L'insieme di URL con cui frontend e backend si parlano |
| **Branch** | Ramo di lavoro parallelo a `main` |
| **CI** | Integrazione continua: controlli automatici a ogni modifica |
| **Cookie** | Piccolo dato salvato dal browser e inviato al server a ogni richiesta |
| **CSRF** | Attacco in cui un altro sito ti fa compiere azioni a tua insaputa |
| **Deploy** | Pubblicare l'app su un server raggiungibile da internet |
| **Hash** | Impronta di un dato da cui non si può risalire all'originale |
| **Lockfile** | `package-lock.json`: le versioni esatte di tutte le dipendenze |
| **Merge** | Unire un ramo in un altro |
| **Migrazione** | Script che modifica lo schema del database conservando i dati |
| **Prompt injection** | Istruzioni nascoste in un testo letto dall'AI, che cercano di farle fare altro |
| **Pull request** | Richiesta di unire un ramo, dove avviene la revisione |
| **Rate limit** | Limite al numero di richieste in un certo tempo |
| **Secret scanning** | Controllo automatico che cerca chiavi e password nel codice prima che vengano pubblicate |
| **Seed** | Dati iniziali caricati nel database |
| **Sessione** | Il "ricordo" lato server che un utente ha fatto l'accesso |
| **Slopsquatting** | Pubblicare un pacchetto malevolo con il nome di una libreria che l'AI tende a "inventare" |
| **Spike** | Piccolo esperimento per ridurre un'incertezza prima di un lavoro grande |
| **Transazione** | Gruppo di operazioni sul database che riescono tutte o nessuna |
