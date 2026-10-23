# Lavorare con più sessioni di Claude Code

Come dividere il lavoro tra più sessioni dell'agente senza confusione: cosa sono, come avviarle, come tenerle separate.
Complementare alla [Guida al progetto](GUIDA-PROGETTO.md).

---

## Tre concetti da non confondere

| Concetto | Cos'è | Analogia |
|---|---|---|
| **Sessione** | Una conversazione con Claude, con la **sua** finestra di contesto | Un collega a cui affidi un compito |
| **Ramo (branch)** | Una linea di modifiche nel repository Git | Il fascicolo su cui lavora quel collega |
| **Worktree** | Una **cartella** separata collegata allo stesso repository, con un altro ramo attivo | La scrivania del collega |

Una cartella può avere **un solo ramo attivo alla volta**. Due sessioni nella stessa cartella condividono file e ramo: se una cambia ramo, cambia anche per l'altra.

---

## Le sessioni non intasano il contesto

Ogni sessione ha un contesto suo. Quella che ne avvia un'altra le passa solo un **brief**, e alla fine riceve indietro una **nota breve**.

```
Sessione coordinatore ──brief──► Sessione di lavoro
        ▲                          (legge file, esegue, prova:
        └────── nota breve ──────   il SUO contesto cresce)
```

Dividere il lavoro **alleggerisce** il contesto: i dettagli restano nella sessione che li ha prodotti.

| Avvio | Cosa riceve la nuova sessione | Quando usarlo |
|---|---|---|
| **Fresh** (fresca) | Il brief + `CLAUDE.md` + memoria del progetto | Quasi sempre: compito chiaro e autonomo |
| **Fork** (copia) | Tutta la conversazione precedente + il brief | Solo se il compito dipende da molti dettagli discussi e non scritti altrove |

---

## Stessa cartella o worktree?

| | Stessa cartella | Worktree separato |
|---|---|---|
| **Quando** | Una sessione alla volta | Più sessioni che **modificano codice** in parallelo |
| **Pro** | Ha già `.env`, database locale e `node_modules` | Nessuna interferenza tra sessioni |
| **Contro** | Le sessioni si cambiano ramo e file a vicenda | Mancano i file non tracciati da Git (`.env`, database): vanno ricreati |

**Attenzione ai segreti:** `.env` non è in Git, quindi non arriva nel worktree. **Non copiarlo con l'agente**: crealo tu partendo da `.env.example`. Le regole `deny` di `.claude/settings.json` valgono anche lì.

---

## Il flusso consigliato

```
1 compito = 1 sessione = 1 ramo = 1 pull request
```

1. **Scegli il compito** (meglio se è una GitHub Issue): un obiettivo verificabile.
2. **Avvia una sessione nuova** da `main` aggiornato, con un brief che dica:
   - cosa fare e quali file o cartelle toccare;
   - cosa significa "finito";
   - i vincoli (es. "non leggere `.env`", "nessuna nuova dipendenza").
3. **La sessione lavora sul suo ramo**, verifica (`npm run check`, browser) e apre la PR.
4. **Tu revisioni e fai il merge.**
5. **Archivia la sessione.** Il compito successivo parte da una sessione nuova, non da questa.

**Una sessione = un compito.** Quando ha finito, si ferma: non passa da sola al punto successivo della roadmap. Se lo fa nella stessa cartella, le sue modifiche nuove si mescolano a quelle ancora da revisionare.

---

## Ordine visivo nella barra laterale

- **Nomi** nel formato `Progetto · compito`, per esempio `DiscoverEvent · ricerca città`. Si rinominano con clic destro sulla sessione.
- **Gruppi** per progetto: tutte le sessioni di DiscoverEvent nel gruppo "DiscoverEvent".
- **Una sessione "coordinatore"** (facoltativa): pianifica, scrive i brief e verifica i risultati, senza scrivere codice.
- **Archivia** le sessioni dopo il merge della loro PR.

---

## Un esempio reale da questo progetto

1. La sessione principale ha avviato una sessione fresca per lo **spike di Ticketmaster**, nella **stessa cartella**: serviva la chiave API, che si trova solo in `.env`.
2. Finito lo spike, quella sessione è passata da sola al compito successivo (ricerca per città), **sempre nella stessa cartella**, su un nuovo ramo.
3. Nel frattempo la sessione principale doveva scrivere questo documento. Scriverlo nella cartella condivisa l'avrebbe fatto finire nel ramo della ricerca città.
4. **Soluzione:** questo file è stato scritto in un **worktree separato** creato da `main`, su un ramo suo (`docs/sessioni-parallele`). Le due sessioni hanno lavorato insieme senza toccarsi.

**Lezioni:**
- un compito parallelo che modifica file va in un worktree;
- una sessione si ferma alla fine del suo compito.

---

## Checklist rapida

- [ ] Il compito ha un obiettivo chiaro e un brief scritto?
- [ ] Altre sessioni stanno modificando codice in questa cartella? → usa un worktree
- [ ] Servono file non tracciati (`.env`, database)? → stessa cartella, o ricreali nel worktree
- [ ] La sessione ha un nome `Progetto · compito` ed è nel gruppo giusto?
- [ ] Dopo il merge della PR: sessione archiviata?
