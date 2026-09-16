// Fills the study pages with the anonymised results table.
// Reads ../../_private/summary.json and replaces the block between
// <!-- STUDY_ROWS --> and <!-- /STUDY_ROWS --> in ../../{en,de,ro}/study.html.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const { rows } = JSON.parse(await readFile(path.join(ROOT, "_private/summary.json"), "utf8"));

const L = {
  en: {
    sector: { marketplace: "marketplace", electronics: "electronics", fashion: "fashion", diy: "DIY and garden", general: "general retail", books: "books", it: "IT and computers", beauty: "beauty", pharmacy: "pharmacy", furniture: "furniture", toys: "toys", pet: "pet supplies", telecom: "telecom", banking: "banking", transport: "transport", music: "musical instruments", auto: "car parts and tyres", outdoor: "outdoor" },
    size: { large: "large", mid: "mid-size" }, country: { RO: "Romania", DE: "Germany" }, yes: "yes", no: "no", none: "none",
    rule: { "color-contrast": "text contrast", "link-name": "links without text", "image-alt": "images without alt", "button-name": "buttons without name", listitem: "list structure", list: "list structure", "meta-viewport": "zoom disabled", "aria-hidden-focus": "hidden but focusable", "aria-allowed-attr": "invalid ARIA", "aria-prohibited-attr": "invalid ARIA", label: "fields without label", "svg-img-alt": "icons without name", "nested-interactive": "nested controls", "aria-required-children": "invalid ARIA", "aria-valid-attr-value": "invalid ARIA", "frame-title": "frame without title", "link-in-text-block": "links only by colour", "aria-command-name": "controls without name", "aria-required-parent": "invalid ARIA", "aria-input-field-name": "fields without name", "role-img-alt": "images without alt", "input-button-name": "buttons without name", "scrollable-region-focusable": "region not keyboard reachable", "aria-required-attr": "invalid ARIA", "select-name": "fields without name" },
  },
  de: {
    sector: { marketplace: "Marktplatz", electronics: "Elektronik", fashion: "Mode", diy: "Baumarkt und Garten", general: "Universalversand", books: "Bücher", it: "IT und Computer", beauty: "Kosmetik", pharmacy: "Apotheke", furniture: "Möbel", toys: "Spielwaren", pet: "Tierbedarf", telecom: "Telekommunikation", banking: "Bank", transport: "Verkehr", music: "Musikinstrumente", auto: "Autoteile und Reifen", outdoor: "Outdoor" },
    size: { large: "groß", mid: "mittel" }, country: { RO: "Rumänien", DE: "Deutschland" }, yes: "ja", no: "nein", none: "keiner",
    rule: { "color-contrast": "Textkontrast", "link-name": "Links ohne Text", "image-alt": "Bilder ohne Alternativtext", "button-name": "Buttons ohne Namen", listitem: "Listenstruktur", list: "Listenstruktur", "meta-viewport": "Zoom gesperrt", "aria-hidden-focus": "versteckt, aber fokussierbar", "aria-allowed-attr": "ungültiges ARIA", "aria-prohibited-attr": "ungültiges ARIA", label: "Felder ohne Beschriftung", "svg-img-alt": "Icons ohne Namen", "nested-interactive": "verschachtelte Bedienelemente", "aria-required-children": "ungültiges ARIA", "aria-valid-attr-value": "ungültiges ARIA", "frame-title": "Frame ohne Titel", "link-in-text-block": "Links nur durch Farbe", "aria-command-name": "Bedienelemente ohne Namen", "aria-required-parent": "ungültiges ARIA", "aria-input-field-name": "Felder ohne Namen", "role-img-alt": "Bilder ohne Alternativtext", "input-button-name": "Buttons ohne Namen", "scrollable-region-focusable": "Bereich nicht per Tastatur erreichbar", "aria-required-attr": "ungültiges ARIA", "select-name": "Felder ohne Namen" },
  },
  ro: {
    sector: { marketplace: "marketplace", electronics: "electronice", fashion: "modă", diy: "bricolaj și grădină", general: "retail general", books: "cărți", it: "IT și calculatoare", beauty: "cosmetice", pharmacy: "farmacie", furniture: "mobilă", toys: "jucării", pet: "animale de companie", telecom: "telecomunicații", banking: "bancă", transport: "transport", music: "instrumente muzicale", auto: "piese auto și anvelope", outdoor: "outdoor" },
    size: { large: "mare", mid: "medie" }, country: { RO: "România", DE: "Germania" }, yes: "da", no: "nu", none: "niciuna",
    rule: { "color-contrast": "contrastul textului", "link-name": "linkuri fără text", "image-alt": "imagini fără text alternativ", "button-name": "butoane fără nume", listitem: "structura listelor", list: "structura listelor", "meta-viewport": "zoom dezactivat", "aria-hidden-focus": "ascuns, dar focalizabil", "aria-allowed-attr": "ARIA invalid", "aria-prohibited-attr": "ARIA invalid", label: "câmpuri fără etichetă", "svg-img-alt": "pictograme fără nume", "nested-interactive": "controale imbricate", "aria-required-children": "ARIA invalid", "aria-valid-attr-value": "ARIA invalid", "frame-title": "cadru fără titlu", "link-in-text-block": "linkuri doar prin culoare", "aria-command-name": "controale fără nume", "aria-required-parent": "ARIA invalid", "aria-input-field-name": "câmpuri fără nume", "role-img-alt": "imagini fără text alternativ", "input-button-name": "butoane fără nume", "scrollable-region-focusable": "zonă inaccesibilă de la tastatură", "aria-required-attr": "ARIA invalid", "select-name": "câmpuri fără nume" },
  },
};

for (const lang of ["en", "de", "ro"]) {
  const t = L[lang];
  const file = path.join(ROOT, lang, "study.html");
  let html = await readFile(file, "utf8");
  const body = rows.map((r) => {
    const fail = r.rules > 0;
    return `            <tr>
              <th scope="row">${r.id}</th>
              <td>${t.country[r.country]}</td>
              <td>${t.sector[r.sector] || r.sector}</td>
              <td>${t.size[r.size]}</td>
              <td class="num">${r.rules}</td>
              <td class="num">${r.nodes}</td>
              <td class="num">${r.critical}</td>
              <td class="num">${r.serious}</td>
              <td>${fail ? (t.rule[r.top] || r.top) : t.none}</td>
              <td>${r.skip ? t.yes : t.no}</td>
              <td class="num">${r.h1}</td>
            </tr>`;
  }).join("\n");
  const start = html.indexOf("<!-- STUDY_ROWS -->");
  const end = html.indexOf("<!-- /STUDY_ROWS -->");
  if (start < 0 || end < 0) { console.error("markers missing in", file); continue; }
  html = html.slice(0, start + "<!-- STUDY_ROWS -->".length) + "\n" + body + "\n            " + html.slice(end);
  await writeFile(file, html);
  console.log("filled", file, rows.length, "rows");
}
