import { Link } from 'react-router-dom';
import { useSiteConfig } from '@/features/site-config/SiteConfigContext';

/**
 * Informativa sulla privacy. Ogni affermazione corrisponde a ciò che fa il codice oggi:
 * se cambia cosa raccogliamo (nuovi campi, nuovi servizi esterni, nuovi cookie) va aggiornata.
 * Titolare ed email arrivano dal server (PRIVACY_CONTROLLER_NAME, PRIVACY_CONTACT_EMAIL): non stanno nel codice.
 * In modalità demo la pagina spiega che non si raccolgono dati personali reali.
 */
export function PrivacyPage() {
  const { demoMode, privacy } = useSiteConfig().config;
  const { controllerName, contactEmail } = privacy;
  const emailLink = contactEmail && (
    <a href={`mailto:${contactEmail}`}>
      <strong>{contactEmail}</strong>
    </a>
  );

  return (
    <div className="page narrow legal">
      <div className="page-head">
        <h1>Informativa sulla privacy</h1>
        <p className="muted">Ultimo aggiornamento: 25 ottobre 2026</p>
      </div>

      <p className="notice">
        DiscoverEvent è un <strong>progetto didattico</strong>
        {demoMode && (
          <>
            {' '}
            e questo sito è una <strong>dimostrazione</strong>: non si registra nessuno e non raccogliamo dati personali
            reali
          </>
        )}
        . Questa pagina spiega in modo semplice come trattiamo i dati, ma non è una consulenza legale.
      </p>

      <section>
        <h2>Chi è il titolare</h2>
        <p>
          {controllerName ? (
            <>
              Il titolare del trattamento è <strong>{controllerName}</strong>.
            </>
          ) : (
            'Il sito è gestito dall’autore del progetto, a scopo didattico.'
          )}
          {emailLink && <> Per qualsiasi domanda sui dati puoi scrivere a {emailLink}.</>}
        </p>
      </section>

      <section>
        <h2>Quali dati raccogliamo e perché</h2>
        {demoMode ? (
          <>
            <p>
              Puoi guardare la mappa e il catalogo senza account. <strong>La registrazione è disattivata</strong>: si
              entra solo con gli account dimostrativi, intestati a persone inventate (indirizzi @example.com) e con una
              password pubblica. Quindi non ti chiediamo e non salviamo il tuo nome, la tua email o una tua password.
            </p>
            <p>
              Quello che fai con un account demo (iscrizioni, preferiti, eventi creati, richieste per diventare
              organizzatore) è visibile a chiunque entri con lo stesso account e viene{' '}
              <strong>cancellato ogni notte alle 4</strong> (ora italiana), quando i dati tornano quelli iniziali. Per
              questo ti chiediamo di non scrivere dati personali reali nei testi, come descrizioni o messaggi.
            </p>
          </>
        ) : (
          <>
            <p>Puoi guardare la mappa e il catalogo senza account. Se ti registri, salviamo:</p>
            <ul>
              <li>
                <strong>nome ed email</strong>, per creare il tuo account e farti accedere. Il nome è visibile agli
                organizzatori degli eventi a cui ti iscrivi; se organizzi eventi, il tuo nome compare sulle loro pagine
                pubbliche;
              </li>
              <li>
                <strong>la password</strong>, mai in chiaro: conserviamo solo una sua versione cifrata in modo
                irreversibile (hash), che neppure noi possiamo leggere;
              </li>
              <li>
                <strong>il ruolo</strong> (partecipante, organizzatore o amministratore) e le eventuali{' '}
                <strong>richieste per diventare organizzatore</strong>, con il messaggio che scrivi. Gli amministratori
                vedono nome, email e messaggio per decidere;
              </li>
              <li>
                <strong>le iscrizioni agli eventi e i preferiti</strong>, per mostrarti i tuoi eventi e far conoscere
                agli organizzatori il numero dei partecipanti;
              </li>
              <li>
                <strong>gli eventi che crei</strong>, se sei un organizzatore.
              </li>
            </ul>
            <p>
              Usiamo questi dati solo per far funzionare il servizio che hai chiesto (base giuridica: esecuzione del
              servizio, art. 6.1.b del GDPR).
            </p>
          </>
        )}
        <p>
          Per proteggere l&apos;app da abusi, il server tiene in memoria per pochi minuti l&apos;indirizzo IP di chi
          tenta l&apos;accesso o cerca una città, così da limitare i tentativi ripetuti (legittimo interesse alla
          sicurezza, art. 6.1.f).
        </p>
      </section>

      <section>
        <h2>La tua posizione</h2>
        <p>
          Se lo permetti, il browser ci dice dove ti trovi per mostrarti gli eventi vicini.{' '}
          <strong>La posizione resta nel tuo browser</strong>: le distanze si calcolano sul tuo dispositivo e non la
          inviamo al nostro server. Puoi negare il permesso e cercare una città a mano.
        </p>
        <p>
          La città che scegli con la ricerca viene ricordata nella memoria del tuo browser (<em>localStorage</em>), solo
          per riproportela alla visita successiva. Puoi toglierla scegliendo di nuovo la tua posizione o cancellando i
          dati del sito dal browser.
        </p>
      </section>

      <section>
        <h2>Dove stanno i dati e per quanto</h2>
        <ul>
          {demoMode ? (
            <li>
              I dati demo stanno in un database sul server del fornitore di hosting che ospita l&apos;app. Ogni notte
              alle 4 vengono cancellati e sostituiti con quelli iniziali.
            </li>
          ) : (
            <li>
              I dati dell&apos;account stanno in un database sul server del fornitore di hosting che ospita l&apos;app.
              Li conserviamo finché l&apos;account esiste.
            </li>
          )}
          <li>
            La sessione di accesso dura 7 giorni dall&apos;ultima attività; dopo, o quando esci, viene cancellata
            {demoMode && ', e comunque con l’azzeramento notturno'}.
          </li>
        </ul>
      </section>

      <section>
        <h2>Servizi esterni: OpenStreetMap</h2>
        <ul>
          <li>
            <strong>Mappa.</strong> Le immagini della mappa arrivano dai server di{' '}
            <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>
            . Per scaricarle il tuo browser li contatta direttamente, quindi OpenStreetMap vede il tuo indirizzo IP e la
            zona della mappa che stai guardando.
          </li>
          <li>
            <strong>Ricerca città.</strong> Il nome che scrivi nella ricerca viene inviato dal nostro server a
            Nominatim, il servizio di ricerca di OpenStreetMap. Parte dal nostro server, non dal tuo browser: Nominatim
            non riceve il tuo indirizzo IP né i dati del tuo account. Per alleggerire il servizio il server ricorda per
            un giorno i risultati delle ricerche, senza sapere chi le ha fatte.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookie</h2>
        <p>
          Usiamo <strong>un solo cookie tecnico</strong>, <code>discoverevent.sid</code>, creato solo quando accedi
          {demoMode ? '' : ' o ti registri'}: serve a ricordare che hai fatto l&apos;accesso. Non è leggibile dal codice
          della pagina e non viene usato per seguirti su altri siti. Non usiamo cookie di profilazione, di statistica o
          di terze parti: per questo non ti chiediamo il consenso con un banner.
        </p>
      </section>

      <section>
        <h2>Cosa non facciamo</h2>
        <ul>
          <li>Non mostriamo pubblicità.</li>
          <li>Non vendiamo né cediamo i tuoi dati a nessuno.</li>
          <li>Non usiamo strumenti di statistica o di tracciamento.</li>
        </ul>
      </section>

      <section>
        <h2>I tuoi diritti</h2>
        <p>Il GDPR ti permette di:</p>
        <ul>
          <li>sapere quali dati abbiamo su di te e riceverne una copia;</li>
          <li>correggerli o chiederne la cancellazione, insieme all&apos;account;</li>
          <li>opporti a un trattamento o chiederne la limitazione;</li>
          <li>
            presentare un reclamo al{' '}
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">
              Garante per la protezione dei dati personali
            </a>
            .
          </li>
        </ul>
        {demoMode ? (
          <p>
            Visto che non conserviamo dati che ti identificano, di solito non c&apos;è nulla da consultare o cancellare
            {emailLink && <>; per qualsiasi domanda puoi scrivere a {emailLink}</>}.
          </p>
        ) : (
          <p>
            L&apos;app non ha ancora pulsanti per scaricare i dati o cancellare l&apos;account: per ora basta{' '}
            {emailLink ? (
              <>scrivere a {emailLink} dall&apos;indirizzo con cui sei registrato</>
            ) : (
              'contattare chi gestisce il sito'
            )}
            . Rispondiamo entro un mese.
          </p>
        )}
      </section>

      <p className="muted">
        <Link to="/">Torna alla mappa</Link>
      </p>
    </div>
  );
}
