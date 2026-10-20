# DiscoverEvent

Trova eventi vicino a te: mappa della zona a sinistra, dashboard con i dati dell'evento a destra.
Progetto di allenamento per **guidare un'AI durante lo sviluppo**: tu revisioni e dai istruzioni, l'AI scrive il codice.

## Avvio

```bash
npm install
npm run dev
```

Apri http://localhost:5173. Se neghi la posizione, l'app usa Roma come centro.

## Struttura

| Cartella / file | Cosa fa |
|---|---|
| `src/types.ts` | Forma dei dati (`EventItem`, `LatLng`) |
| `src/services/eventProvider.ts` | **Contratto** di una sorgente eventi |
| `src/services/mockEventProvider.ts` | Eventi finti, generati attorno alla posizione |
| `src/services/index.ts` | Unico punto dove si sceglie la sorgente + colori categorie |
| `src/hooks/useGeolocation.ts` | Posizione dell'utente, con ripiego |
| `src/hooks/useEvents.ts` | Carica gli eventi e calcola la distanza |
| `src/components/MapView.tsx` | Mappa Leaflet / OpenStreetMap |
| `src/components/EventDashboard.tsx` | Statistiche, dettaglio, lista |
| `src/components/Filters.tsx` | Raggio e categorie |
| `src/App.tsx` | Collega tutto e tiene lo stato (filtri, selezione) |

Flusso dei dati: `useGeolocation` → `useEvents` (provider) → `App` filtra → `MapView` + `EventDashboard`.

## Checklist di revisione (per te)

Quando l'AI ti consegna un lavoro, controlla in quest'ordine:

1. **Funziona?** Avvia l'app e prova il caso normale *e* quelli strani (posizione negata, nessun evento con i filtri, schermo stretto).
2. **Fa quello che ho chiesto, e solo quello?** Guarda il diff (`git diff`): file toccati inutilmente sono un segnale d'allarme.
3. **Dove sta la logica?** Dati in `services/`, stato in `hooks/` o `App`, aspetto in `components/`. Se qualcosa è nel posto sbagliato, chiedilo.
4. **I nomi si capiscono?** Se non capisci una funzione dal nome, chiedi di rinominarla o spiegarla.
5. **Errori gestiti?** Cosa succede se la richiesta fallisce o i dati sono vuoti?
6. **Build pulita?** `npm run build` deve passare senza errori.

## Come dare istruzioni efficaci all'AI

- **Una richiesta = un risultato verificabile.** "Aggiungi un filtro per data (oggi / weekend / tutto) nella barra in alto" è meglio di "migliora i filtri".
- **Di' cosa non toccare.** "Non cambiare `MapView`."
- **Chiedi il piano prima del codice** per le modifiche grandi: correggere un piano costa meno che correggere codice.
- **Fai commit dopo ogni passo approvato**, così puoi sempre tornare indietro.

## Idee per i prossimi passi

- Filtro per data (oggi, questo weekend, prossimi 7 giorni)
- Ricerca testuale per titolo
- Collegare Ticketmaster Discovery API al posto dei dati finti
- Preferiti salvati in `localStorage`
- Test automatici (Vitest) su `utils/geo.ts` e sui filtri
