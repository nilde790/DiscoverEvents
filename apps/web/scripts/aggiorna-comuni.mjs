// Rigenera l'elenco dei comuni usato per i suggerimenti della ricerca città.
// Uso (dalla radice del progetto): node apps/web/scripts/aggiorna-comuni.mjs
//
// Fonte: ISTAT, "Elenco dei comuni italiani" (https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/)
// Licenza: Creative Commons Attribuzione 4.0 (CC BY 4.0): si può riusare citando la fonte.
import { writeFileSync } from 'node:fs';

const SOURCE = 'https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv';
const OUTPUT = new URL('../public/comuni.txt', import.meta.url);

/** Il file ISTAT è un CSV con ";" e campi tra virgolette che possono andare a capo (nell'intestazione). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') field += text[++i];
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ';') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Download non riuscito: HTTP ${res.status}`);
// ISTAT pubblica il file nella codifica di Windows, non in UTF-8.
const [header, ...rows] = parseCsv(new TextDecoder('windows-1252').decode(await res.arrayBuffer()));
const col = (name) => {
  const i = header.findIndex((h) => h.trim() === name);
  if (i < 0) throw new Error(`Colonna "${name}" non trovata: il formato del file ISTAT è cambiato?`);
  return i;
};
const [nome, sigla, regione] = [
  col('Denominazione in italiano'),
  col('Sigla automobilistica'),
  col('Denominazione Regione'),
];

const lines = rows
  .filter((r) => r[nome])
  .map((r) => [r[nome], r[sigla], r[regione]].map((s) => s.trim()).join(';'))
  .sort((a, b) => a.localeCompare(b, 'it'));

const date = new Date().toISOString().slice(0, 10);
writeFileSync(
  OUTPUT,
  `# Comuni italiani: nome;sigla provincia;regione. Fonte ISTAT (CC BY 4.0), scaricato il ${date}.\n` +
    `# Non modificare a mano: rigenera con node apps/web/scripts/aggiorna-comuni.mjs\n` +
    lines.join('\n') +
    '\n',
);
console.log(`Scritti ${lines.length} comuni in ${OUTPUT.pathname}`);
