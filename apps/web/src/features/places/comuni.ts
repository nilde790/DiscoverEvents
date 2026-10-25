/**
 * Elenco dei comuni italiani per i suggerimenti mentre si scrive.
 * Fonte ISTAT, licenza CC BY 4.0: il file `public/comuni.txt` si rigenera con `apps/web/scripts/aggiorna-comuni.mjs`.
 * I suggerimenti nascono da qui, nel browser: Nominatim vieta di usarlo per l'autocompletamento.
 */
export interface Comune {
  name: string;
  /** Sigla della provincia, es. "BO". */
  province: string;
  region: string;
  /** Nome senza accenti e in minuscolo, per confrontarlo con quello che si scrive. */
  key: string;
}

/** "Forlì" → "forli", "Sant’Elia" → "sant'elia". */
export function normalize(text: string): string {
  // NFD separa gli accenti dalle lettere ("ì" → "i" + accento), \p{M} li toglie.
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’`]/g, "'").toLowerCase();
}

let loading: Promise<Comune[]> | null = null;

/** Scarica l'elenco (circa 50 kB compressi) una sola volta, alla prima ricerca. */
export function loadComuni(): Promise<Comune[]> {
  loading ??= fetch('/comuni.txt')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((text) =>
      text
        .split('\n')
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const [name, province, region] = line.split(';');
          return { name, province, region, key: normalize(name) };
        }),
    )
    .catch((err: unknown) => {
      loading = null; // si riprova alla prossima occasione; intanto resta il pulsante "Cerca"
      throw err;
    });
  return loading;
}

/**
 * Comuni che corrispondono al testo scritto: prima quelli che iniziano così, poi quelli che lo contengono.
 * A parità, i nomi più corti: scrivendo "bolzano" viene prima Bolzano di Bolzano Vicentino.
 */
export function suggestComuni(comuni: Comune[], query: string, limit = 8): Comune[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];
  const starts: Comune[] = [];
  const contains: Comune[] = [];
  for (const c of comuni) {
    const at = c.key.indexOf(q);
    if (at === 0) starts.push(c);
    else if (at > 0) contains.push(c);
  }
  const byLength = (a: Comune, b: Comune) => a.name.length - b.name.length || a.name.localeCompare(b.name, 'it');
  return [...starts.sort(byLength), ...contains.sort(byLength)].slice(0, limit);
}
