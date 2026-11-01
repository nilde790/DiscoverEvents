# Changelog

Le modifiche importanti di DiscoverEvent, una versione per sezione.
Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/); i numeri di versione seguono il
[Semantic Versioning](https://semver.org/lang/it/): `MAGGIORE.MINORE.CORREZIONE`.

## [Non ancora rilasciato]

## [1.1.0] - 2026-11-01

### Funzionalità

- **App installabile (PWA):** DiscoverEvent si può aggiungere alla schermata Home del telefono o installare dal
  browser del computer, con icona propria e a schermo intero.
- Senza connessione, al posto dell'errore del browser compare una pagina che invita a riprovare.
- Icona del sito nella scheda del browser.

## [1.0.0] - 2026-10-31

Prima versione pubblica, online su <https://discoverevent.onrender.com> in modalità demo.

### Funzionalità

- **Mappa** a tutto schermo con gli eventi vicini, centrata sulla posizione dell'utente o su una città cercata.
- **Catalogo** con gli eventi raggruppati per giorno, righe di scoperta e filtri per categoria.
- **Scheda evento** con dati, posti disponibili, iscrizione e cancellazione.
- **Account e ruoli:** partecipante, organizzatore e amministratore. Chi vuole organizzare invia una richiesta
  che un amministratore approva o rifiuta.
- **Area organizzatore** per creare e gestire i propri eventi; **area amministratore** per le richieste.
- **Modalità demo** per il sito pubblico: registrazione bloccata, solo account demo, dati azzerati ogni notte.
- Eventi demo in sei città italiane, informativa privacy, interfaccia adatta al telefono con tema scuro.

### Sicurezza

- Password salvate solo come hash bcrypt, sessioni con cookie `HttpOnly`, `SameSite=Lax` e `Secure` in produzione.
- Limite ai tentativi di accesso e alle ricerche.
- Header di sicurezza con helmet: Content Security Policy, HSTS, protezione dal clickjacking.

### Infrastruttura

- Immagine Docker in due fasi, con il server che gira come utente non amministratore.
- Due ambienti su Render: **staging**, aggiornato a ogni merge su `main` con la CI verde, e **produzione**,
  aggiornata solo pubblicando un tag di versione.
- CI su GitHub Actions: tipi, lint, formattazione, test e build a ogni pull request.


[Non ancora rilasciato]: https://github.com/nilde790/DiscoverEvents/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/nilde790/DiscoverEvents/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nilde790/DiscoverEvents/releases/tag/v1.0.0
