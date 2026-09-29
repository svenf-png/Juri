/*
 * Erzeugt die Artboards zu Teilen und Import (M10, Entscheidung 2) aus den Werten von
 * design/Teilen.dc.html und design/BackupImport.dc.html und trägt sie in design/canvas.json ein.
 * Aufruf: node scripts/build-teilen-designs.mjs
 *
 * Die Boards sind statisches HTML im Format des Design-Tools (x-dc mit helmet). Jedes Board hat
 * dieselben Beispieldaten wie src/ui/screens/teilen/designFixture.ts, damit der Bildvergleich
 * (tests/e2e/teilen.spec.ts) App und Design gegenüberstellen kann.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&amp;family=Figtree:wght@400;500;600;700&amp;display=swap" rel="stylesheet">';
const STYLE = `body{margin:0;font-family:'Figtree',-apple-system,system-ui,sans-serif;color:#17141F;background:#FFFFFF;-webkit-font-smoothing:antialiased}
a{color:#5B34D1;text-decoration:none}a:hover{color:#4B2AA8}
button{font-family:inherit;cursor:pointer}
.d{font-family:'Bricolage Grotesque','Figtree',system-ui,sans-serif}
.tap{transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .2s,border-color .2s}
.tap:active{transform:scale(.97)}
.knob{transition:transform .25s cubic-bezier(.3,1.4,.5,1)}
.track{transition:background-color .25s}
@keyframes float{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(-2deg)}}
.float{animation:float 3.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

const ICON = {
  share:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"></path><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"></path></svg>',
  chevron:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B3AEC0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>',
  check:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>',
};

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/* Beispieldaten (gleich in designFixture.ts). */
const DATA = {
  file: 'Amtshaftung.juri',
  summary: '21 Karten · 3 PDFs · 2,4 MB',
  deck: 'Amtshaftung · ZR',
  action: 'AirDrop, Nachrichten, Mail …',
  hint: 'Dein Lernfortschritt bleibt immer privat auf deinem Gerät.',
  receiveHint:
    'Stapel von anderen kommen als .juri-Datei. Sichere sie zuerst in „Dateien“, dann öffnest du sie hier.',
  incomingTitle: 'StPO: Revision',
  incomingMeta: 'von Mara · 27 Karten',
  updateHint: 'Du hast den Stapel schon. 3 neue Karten, 2 Karten geändert. Dein Fortschritt bleibt.',
  copyHint: 'Eigener, unabhängiger Stapel',
  error: 'Diese Datei ist kein Juri-Stapel.',
};

const fileRow = `<div style="display: flex; align-items: center; gap: 16px">
      <div class="float" style="position: relative; width: 58px; height: 70px; flex-shrink: 0">
        <span style="position: absolute; left: 8px; top: 4px; width: 50px; height: 64px; border-radius: 10px; background: #C9B8F7"></span>
        <span style="position: absolute; left: 0; top: 0; width: 50px; height: 64px; border-radius: 10px; background: #6A3FE0; display: flex; align-items: flex-end; justify-content: flex-start; padding: 7px; box-sizing: border-box; color: #FFFFFF; font-size: 10px; font-weight: 800; letter-spacing: .04em">JURI</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 3px">
        <span style="font-size: 17px; font-weight: 700">${DATA.file}</span>
        <span style="font-size: 13.5px; color: #6B6678; font-weight: 500">${DATA.summary}</span>
      </div>
    </div>`;

const pickRow = `<button class="tap" style="width: 100%; min-height: 52px; padding: 0; border: 0; border-top: 1px solid #DCD6EA; border-bottom: 1px solid #DCD6EA; background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #17141F; text-align: left"><span style="font-size: 15px; font-weight: 600; color: #6B6678">Stapel</span><span style="display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; text-align: right">${DATA.deck}${ICON.chevron}</span></button>`;

const switchRow = (label, on) => `<button class="tap" role="switch" aria-checked="${on}" style="height: 48px; border: 0; background: transparent; padding: 0; display: flex; align-items: center; justify-content: space-between; color: #17141F; text-align: left">
      <span style="font-size: 15px; font-weight: 600">${label}</span>
      <span class="track" style="width: 50px; height: 30px; border-radius: 15px; background: ${on ? '#6A3FE0' : '#DCD6EA'}; position: relative; display: block">
        <span class="knob" style="position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 12px; background: #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,.2); transform: ${on ? 'translateX(20px)' : 'translateX(0)'}"></span>
      </span>
    </button>`;

const exportCard = `<div style="border-radius: 26px; background: #F6F4FB; padding: 20px; display: flex; flex-direction: column; gap: 16px">
    ${fileRow}
    ${pickRow}
    ${switchRow('Eigene Notizen mitschicken', false)}
    ${switchRow('Erfolge mitschicken', true)}
    <div style="font-size: 13px; color: #6B6678; line-height: 1.4; margin-top: -8px">${DATA.hint}</div>
    <button class="tap" style="height: 56px; border-radius: 18px; border: 0; background: #17141F; color: #FFFFFF; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px">
      ${ICON.share}
      ${DATA.action}</button>
  </div>`;

const emptyExport = `<div style="border-radius: 26px; background: #F6F4FB; padding: 20px; display: flex; flex-direction: column; gap: 16px">
    <span style="font-size: 17px; font-weight: 700">Noch nichts zu teilen</span>
    <p style="margin: 0; font-size: 14px; line-height: 1.45; color: #6B6678">Lege zuerst einen Stapel mit Karten an. Dann kannst du ihn hier als Datei weitergeben.</p>
    <a class="tap" href="Bibliothek.dc.html" style="height: 56px; border-radius: 18px; border: 0; background: #17141F; color: #FFFFFF; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px">Zu den Stapeln</a>
  </div>`;

const linkButton = (label) =>
  `<button class="tap" style="height: 44px; border: 0; background: transparent; color: #5B34D1; font-size: 14px; font-weight: 700">${label}</button>`;

const idleIncoming = `<div style="border-radius: 22px; border: 1.5px dashed #CFC8E0; padding: 16px; display: flex; flex-direction: column; gap: 14px">
      <p style="margin: 0; font-size: 14px; line-height: 1.45; color: #6B6678">${DATA.receiveHint}</p>
      <button class="tap" style="height: 50px; border-radius: 16px; border: 0; background: #6A3FE0; color: #FFFFFF; font-size: 16px; font-weight: 700">Datei öffnen</button>
      ${linkButton('So geht’s')}
    </div>`;

const option = (title, sub, on) => `<button class="tap" role="radio" aria-checked="${on}" style="min-height: 56px; border-radius: 14px; border: 0; padding: 8px 12px; display: flex; align-items: center; gap: 12px; background: ${on ? '#F6F4FB' : '#FFFFFF'}">
            <span style="width: 20px; height: 20px; border-radius: 10px; box-sizing: border-box; border: ${on ? '6px solid #6A3FE0' : '2px solid #CFC8E0'}; flex-shrink: 0"></span>
            <span style="display: flex; flex-direction: column; gap: 1px; text-align: left">
              <span style="font-size: 15px; font-weight: 700; color: #17141F">${title}</span>
              <span style="font-size: 12.5px; color: #6B6678; font-weight: 500">${sub}</span>
            </span>
          </button>`;

const who = (letter, name, meta, bg = '#17141F') => `<div style="display: flex; align-items: center; gap: 12px">
        <span style="width: 40px; height: 40px; border-radius: 20px; background: ${bg}; color: #FFFFFF; font-weight: 700; display: flex; align-items: center; justify-content: center">${letter}</span>
        <div style="display: flex; flex-direction: column; gap: 2px">
          <span style="font-size: 16px; font-weight: 700">${name}</span>
          <span style="font-size: 13px; color: #6B6678">${meta}</span>
        </div>
      </div>`;

const previewIncoming = `<div style="border-radius: 22px; border: 1.5px solid #EFECF5; padding: 16px; display: flex; flex-direction: column; gap: 14px">
      ${who('M', DATA.incomingTitle, DATA.incomingMeta)}
      <div style="display: flex; flex-direction: column; gap: 6px">
        ${option('Aktualisieren', DATA.updateHint, true)}
        ${option('Als Kopie anlegen', DATA.copyHint, false)}
      </div>
      <button class="tap" style="height: 50px; border-radius: 16px; border: 0; background: #6A3FE0; color: #FFFFFF; font-size: 16px; font-weight: 700">Importieren</button>
    </div>`;

const errorIncoming = `<div style="border-radius: 22px; border: 1.5px solid #EFECF5; padding: 16px; display: flex; flex-direction: column; gap: 14px">
      ${who('!', 'Datei nicht importiert', 'Es wurde nichts verändert.', '#B42318')}
      <p style="margin: 0; font-size: 13.5px; font-weight: 600; color: #B42318; line-height: 1.4">${DATA.error}</p>
      <button class="tap" style="height: 50px; border-radius: 16px; border: 1.5px solid #EFECF5; background: #FFFFFF; color: #17141F; font-size: 16px; font-weight: 700">Andere Datei wählen</button>
      ${linkButton('So geht’s')}
    </div>`;

const footer = `<div style="display: flex; justify-content: space-between; align-items: center; height: 44px; font-size: 14px; font-weight: 600">
    <span style="color: #6B6678">Alles sichern</span>
    <a href="Einstellungen.dc.html" style="font-weight: 700">Backup exportieren</a>
  </div>`;

const page = (exportPart, incomingPart, overlay = '') => `<div style="width: 390px; height: 844px; box-sizing: border-box; background: #FFFFFF; position: relative; overflow: hidden; padding: 64px 24px 0 24px; display: flex; flex-direction: column; gap: 20px">
  <h1 class="d" style="margin: 0; font-size: 40px; font-weight: 750; letter-spacing: -0.03em">Teilen</h1>
  ${exportPart}
  <div style="display: flex; flex-direction: column; gap: 12px">
    <span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">Empfangen</span>
    ${incomingPart}
  </div>
  ${footer}${overlay}
</div>`;

const sheet = (eyebrow, title, body) => `
  <div class="dim" style="position: absolute; inset: 0; background: rgba(23,20,31,.28)"></div>
  <div role="dialog" aria-modal="true" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; border-radius: 30px 30px 0 0; background: #FFFFFF; padding: 12px 24px 34px 24px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 -20px 40px -24px rgba(46,26,115,.4)">
    <span style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: #DCD6EA"></span>
    <span style="display: flex; align-items: center; gap: 8px; color: #6A3FE0; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-top: 6px">${eyebrow}</span>
    <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.015em">${title}</h2>
    ${body}
  </div>`;

const primary = (label) =>
  `<button class="tap" style="height: 60px; border-radius: 20px; border: 0; background: #6A3FE0; color: #FFFFFF; font-size: 18px; font-weight: 700; box-shadow: 0 10px 24px -10px rgba(106,63,224,.55)">${label}</button>`;
const ghost = (label) =>
  `<button class="tap" style="height: 52px; border-radius: 18px; border: 0; background: transparent; color: #6B6678; font-size: 16px; font-weight: 700">${label}</button>`;

const badge = (code) =>
  `<span style="width: 34px; height: 24px; border-radius: 8px; background: #17141F; color: #FFFFFF; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${code}</span>`;
const pickItem = (name, meta, on) => `<button class="tap" aria-pressed="${on}" style="width: 100%; min-height: 56px; padding: 0; border: 0; border-bottom: 1px solid #EFECF5; background: none; display: flex; align-items: center; gap: 12px; color: #17141F; text-align: left"><span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 650">${name}</span><span style="font-size: 13px; color: #6B6678; font-weight: 500">${meta}</span></span>${on ? `<span style="color: #6A3FE0; display: flex">${ICON.check}</span>` : ''}</button>`;
const group = (code, name, items) => `<div><div style="display: flex; align-items: center; gap: 10px; padding-bottom: 2px">${badge(code)}<h3 style="margin: 0; font-size: 14px; font-weight: 700">${name}</h3></div>${items.join('')}</div>`;

const deckSheet = sheet(
  'Teilen',
  'Was möchtest du teilen?',
  `<div style="display: flex; flex-direction: column; gap: 12px">${group('ZR', 'Zivilrecht', [
    pickItem('Amtshaftung', '21 Karten', true),
    pickItem('Deliktsrecht', '48 Karten', false),
    pickItem('ZPO: Versäumnisurteil', '32 Karten', false),
  ])}${group('SR', 'Strafrecht', [
    pickItem('Diebstahl &amp; Betrug', '40 Karten', false),
    pickItem('StPO: Revision', '27 Karten', false),
  ])}</div>${primary('Fertig')}`,
);

const conflictItem = (title, detail, mineLabel, theirsLabel, mine) => `<div style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #EFECF5">
      <span style="font-size: 16px; font-weight: 650">${title}</span>
      <span style="font-size: 13px; color: #6B6678; font-weight: 500">${detail}</span>
      <div role="group" aria-label="${title}" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 16px; background: #F6F4FB">
        ${['mine', 'theirs']
          .map((k) => {
            const on = (k === 'mine') === mine;
            return `<button class="tap" aria-pressed="${on}" style="height: 40px; border: 0; border-radius: 12px; font-size: 13.5px; font-weight: 700; background: ${on ? '#FFFFFF' : 'transparent'}; color: ${on ? '#17141F' : '#6B6678'}; box-shadow: ${on ? '0 2px 8px -3px rgba(46,26,115,.3)' : 'none'}">${k === 'mine' ? mineLabel : theirsLabel}</button>`;
          })
          .join('')}
      </div>
    </div>`;

const conflictSheet = sheet(
  'Konflikte',
  'Was soll gelten?',
  `<p style="margin: 0; font-size: 16px; line-height: 1.5">2 Karten wurden bei dir und im Import geändert.</p>
    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 330px; overflow: auto">
    ${conflictItem('Was ist Besitzdiener?', 'StPO: Revision · Du und der Absender habt sie geändert', 'Meine behalten', 'Import nehmen', true)}
    ${conflictItem('Revisionsgründe', 'StPO: Revision · Du hast die Karte gelöscht', 'Gelöscht lassen', 'Wiederherstellen', false)}
    </div>
    ${primary('Importieren')}${ghost('Abbrechen')}`,
);

const infoRow = (k, v, last) => `<div style="display: flex; justify-content: space-between; gap: 12px; padding: 10px 0${last ? '' : '; border-bottom: 1px solid #EFECF5'}"><dt style="font-size: 15px; color: #6B6678">${k}</dt><dd style="margin: 0; font-size: 15px; font-weight: 700; text-align: right">${v}</dd></div>`;
const importedSheet = sheet(
  'Import',
  'Stapel importiert',
  `<dl style="margin: 0; border-radius: 20px; background: #F6F4FB; padding: 6px 16px; display: flex; flex-direction: column">${infoRow('Neue Karten', '3', false)}${infoRow('Geändert', '2', false)}${infoRow('Deine Version behalten', '1', true)}</dl>
    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6B6678">Dein Lernfortschritt ist unverändert.</p>
    ${primary('Zum Stapel')}${ghost('Schließen')}`,
);

const STEPS = [
  ['In „Dateien“ sichern', 'Tippe in AirDrop, Nachrichten oder Mail auf die Datei und wähle „In Dateien sichern“.'],
  ['Juri öffnen', 'Komm hierher zu „Teilen“ und tippe auf „Datei öffnen“.'],
  ['Datei wählen', 'Wähle die .juri-Datei aus. Frisch gesicherte Dateien stehen unter „Zuletzt“ ganz oben.'],
];
const guideSheet = sheet(
  'Import',
  'So kommt die Datei in Juri',
  `<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 16px">${STEPS.map(
    ([t, b], i) => `<li style="display: flex; align-items: flex-start; gap: 14px"><span style="width: 32px; height: 32px; border-radius: 16px; flex-shrink: 0; background: #EEE8FD; color: #6A3FE0; font-size: 15px; font-weight: 800; display: flex; align-items: center; justify-content: center">${i + 1}</span><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">${t}</span><span style="font-size: 14px; line-height: 1.45; color: #6B6678">${b}</span></span></li>`,
  ).join('')}</ol>
    ${primary('Datei öffnen')}${ghost('Schließen')}`,
);

const BOARDS = [
  ['TeilenBereit', 'Teilen: Stapel wählen und senden', page(exportCard, idleIncoming)],
  ['TeilenImport', 'Teilen: Import-Vorschau', page(exportCard, previewIncoming)],
  ['TeilenStapel', 'Teilen: Stapel wählen', page(exportCard, idleIncoming, deckSheet)],
  ['TeilenKonflikt', 'Teilen: Merge-Konflikt', page(exportCard, previewIncoming, conflictSheet)],
  ['TeilenFehler', 'Teilen: ungültige Datei', page(exportCard, errorIncoming)],
  ['TeilenLeer', 'Teilen: noch kein Stapel', page(emptyExport, idleIncoming)],
  ['TeilenErfolg', 'Teilen: Import fertig', page(exportCard, idleIncoming, importedSheet)],
  ['TeilenAnleitung', 'Teilen: Import-Anleitung', page(exportCard, idleIncoming, guideSheet)],
];

for (const [name, title, frame] of BOARDS) {
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
<style>
${STYLE}
</style>
</helmet>
${frame}
</x-dc>
</body>
</html>
`;
  writeFileSync(new URL(`../design/${name}.dc.html`, import.meta.url), html);
}

const canvasFile = new URL('../design/canvas.json', import.meta.url);
const canvas = JSON.parse(readFileSync(canvasFile, 'utf8'));
const top = 21788;
canvas.notes.t12 = {
  kind: 'title1',
  maxW: 3800,
  text: 'M10: Teilen und Import',
  w: 240,
  x: 0,
  y: top,
};
BOARDS.forEach(([name, title], i) => {
  const key = `${name}.dc.html`;
  canvas.boards[key] = { h: 844, radius: 44, title, w: 390, x: i * 470, y: top + 300 };
  if (!canvas.order.includes(key)) canvas.order.push(key);
});
// Wie das Design-Tool: kompakt, Schlüssel sortiert, ohne Zeilenumbruch am Ende.
const sorted = (v) =>
  Array.isArray(v)
    ? v.map(sorted)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sorted(v[k])]),
        )
      : v;
writeFileSync(canvasFile, JSON.stringify(sorted(canvas)));
console.log(`${BOARDS.length} Artboards geschrieben`);
