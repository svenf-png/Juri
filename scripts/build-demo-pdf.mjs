// Erzeugt testdaten/demo-skript.pdf: ein 50-seitiges Demo-Skript zum Prüfen der PDF-Ansicht
// (Blättern, Zoomen, Markieren, Abdecken). Der Text ist bis auf Seite 14 Beispieltext ohne
// fachlichen Inhalt. Aufruf: `npm run demo:pdf` (braucht Chromium, siehe playwright.config.ts).
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const THEMEN = [
  'Besitz und Besitzschutz',
  'Eigentum und seine Grenzen',
  'Übereignung beweglicher Sachen',
  'Einigung und Übergabe',
  'Übergabesurrogate',
  'Gutgläubiger Erwerb beweglicher Sachen',
  'Abhandengekommene Sachen',
  'Eigentumsvorbehalt',
  'Sicherungsübereignung',
  'Anwartschaftsrecht',
  'Verbindung, Vermischung, Verarbeitung',
  'Fruchterwerb',
  'Eigentumsherausgabeanspruch',
  'Gutgläubiger Erwerb beweglicher Sachen',
  'Nutzungen und Verwendungen',
  'Schadensersatz im Eigentümer-Besitzer-Verhältnis',
  'Beseitigung und Unterlassung',
  'Grundbuch und öffentlicher Glaube',
  'Auflassung',
  'Vormerkung',
  'Hypothek und Grundschuld',
  'Pfandrecht an beweglichen Sachen',
  'Nießbrauch',
  'Dienstbarkeiten',
  'Reallast und Vorkaufsrecht',
  'Miteigentum',
  'Gesamthandsgemeinschaft',
  'Nachbarrecht',
  'Überbau und Notweg',
  'Wohnungseigentum',
];

const ABSATZ = [
  'Dieser Absatz ist Beispieltext für die PDF-Ansicht von Juri. Er enthält keinen fachlichen Inhalt und dient nur dazu, das Blättern, Zoomen und Markieren zu prüfen.',
  'Ein zweiter Absatz zeigt, wie sich Text über mehrere Zeilen erstreckt und wie sich einzelne Sätze markieren lassen. Die Wörter sind frei gewählt und ohne Bedeutung.',
  'Zum Abdecken eignen sich Begriffe, Zahlen und Fundstellen. Auch sie stehen hier nur als Platzhalter, damit die Seite wie ein Skript aussieht.',
];

function seite(n) {
  const thema = THEMEN[(n - 1) % THEMEN.length];
  const kern =
    n === 14
      ? `<p class="norm">Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört. (§ 932 II BGB)</p>`
      : `<p>${ABSATZ[n % ABSATZ.length]}</p>`;
  return `<section>
    <div class="kopf">Demo-Skript Sachenrecht · Seite ${n} von 50</div>
    <h1>§ ${n} ${thema}</h1>
    <p>${ABSATZ[(n + 1) % ABSATZ.length]}</p>
    ${kern}
    <p>${ABSATZ[(n + 2) % ABSATZ.length]}</p>
    <ul><li>Beispielpunkt ${n}.1</li><li>Beispielpunkt ${n}.2</li><li>Beispielpunkt ${n}.3</li></ul>
    <p>${ABSATZ[n % ABSATZ.length]}</p>
  </section>`;
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Demo-Skript Sachenrecht</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.55; color: #1a1a1a; }
  section { page-break-after: always; }
  section:last-child { page-break-after: auto; }
  .kopf { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #777; margin-bottom: 14mm; }
  h1 { font-family: Arial, Helvetica, sans-serif; font-size: 17pt; margin: 0 0 8mm; }
  .norm { background: #efeaff; padding: 2mm 3mm; border-left: 1mm solid #6a3fe0; }
  ul { margin: 4mm 0; }
</style></head><body>${Array.from({ length: 50 }, (_, i) => seite(i + 1)).join('')}</body></html>`;

const browser = await chromium.launch({
  ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
});
const page = await browser.newPage();
await page.setContent(html);
const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
writeFileSync('testdaten/demo-skript.pdf', pdf);
console.log(`testdaten/demo-skript.pdf: ${String(pdf.length)} Bytes`);
