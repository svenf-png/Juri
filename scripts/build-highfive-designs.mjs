/*
 * Erzeugt die Artboards zu High fives (M11, Entscheidung 2) aus den Werten von
 * design/HighFive.dc.html und trägt sie in design/canvas.json ein. Aufruf:
 * node scripts/build-highfive-designs.mjs
 *
 * Die Boards sind statisches HTML im Format des Design-Tools (x-dc mit helmet). Jedes Board hat
 * dieselben Beispieldaten wie src/ui/screens/highfive/designFixture.ts, damit der Bildvergleich
 * (tests/e2e/highfive.spec.ts) App und Design gegenüberstellen kann. Das iPad-Board übernimmt die
 * Sidebar aus design/iPadErfolge.dc.html.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&amp;family=Figtree:wght@400;500;600;700&amp;display=swap" rel="stylesheet">';
const STYLE = `body{margin:0;font-family:'Figtree',-apple-system,system-ui,sans-serif;color:#17141F;background:#FFFFFF;-webkit-font-smoothing:antialiased}
a{color:#5B34D1;text-decoration:none}a:hover{color:#4B2AA8}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
.d{font-family:'Bricolage Grotesque','Figtree',system-ui,sans-serif}
.tap{transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .25s,color .25s}
.tap:active{transform:scale(.95)}
@keyframes slap{0%{transform:scale(.3) rotate(-35deg);opacity:0}45%{transform:scale(1.25) rotate(8deg);opacity:1}65%{transform:scale(.92) rotate(-3deg)}100%{transform:none}}
.slap{animation:slap .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes wave{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.4);opacity:0}}
.wave{animation:wave 1s cubic-bezier(.2,.8,.2,1) .25s both}
.wave2{animation:wave 1s cubic-bezier(.2,.8,.2,1) .45s both}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.rise{animation:rise .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.fade{animation:fadein .3s ease both}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

const HAND =
  'M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V12M16 12V9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5.2-2.6L3.6 14.8a1.5 1.5 0 0 1 2.3-1.9L7 14';
const hand = (size, stroke, w = 1.9) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${HAND}"></path></svg>`;
const CHEVRON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B3AEC0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>';
const CLOSE =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/* Beispieldaten (gleich in designFixture.ts). */
const MARA = { initial: 'M', name: 'Mara', win: '12 Tage in Folge' };
const JONAS = { initial: 'J', name: 'Jonas', win: '200 Karten angelegt' };
const RECEIVED = [
  ['M', 'Mara', 'für 1.000 Wiederholungen', 'gestern'],
  ['J', 'Jonas', 'einfach so', 'Sa'],
];
const CONTACTS = [
  ['M', 'Mara', '12 Tage in Folge · zuletzt gesehen gestern'],
  ['J', 'Jonas', 'zuletzt gesehen Sa'],
];

const back = `<a href="Erfolge.dc.html" style="height: 44px; display: flex; align-items: center; gap: 2px; font-size: 16px; font-weight: 600; margin-left: -10px">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>Erfolge</a>`;

const head = (
  size,
) => `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: -8px">
    <h1 class="d" style="margin: 0; font-size: ${size}px; font-weight: 750; letter-spacing: -0.03em">High fives</h1>
    <p style="margin: 0; font-size: 15px; color: #6B6678; line-height: 1.4">Für Erfolge der anderen. Oder einfach so.</p>
  </div>`;

const label = (text) =>
  `<span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">${text}</span>`;

const person = (
  p,
  given = false,
) => `<div style="border-radius: 22px; background: #F6F4FB; padding: 14px 14px 14px 16px; display: flex; align-items: center; gap: 12px">
        <span style="width: 42px; height: 42px; border-radius: 21px; background: #17141F; color: #FFFFFF; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${p.initial}</span>
        <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px">
          <span style="font-size: 16px; font-weight: 700">${p.name}</span>
          <span style="font-size: 13.5px; color: #4B2AA8; font-weight: 600">${p.win}</span>
        </div>
        <button class="tap" aria-label="High five an ${p.name}" style="width: 52px; height: 52px; border-radius: 26px; border: 0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${given ? '#6A3FE0' : '#FFFFFF'}; color: ${given ? '#FFFFFF' : '#6A3FE0'}; box-shadow: ${given ? 'none' : '0 4px 12px -6px rgba(46,26,115,.4)'}">${hand(22, 'currentColor')}</button>
      </div>`;

const people = (list) => `<div style="display: flex; flex-direction: column; gap: 10px">
    ${label('Neu von deinen Leuten')}
    ${list.join('\n    ')}
  </div>`;

const justBecause = `<button class="tap" style="height: 56px; border-radius: 18px; border: 1.5px dashed #C9B8F7; background: #FFFFFF; color: #17141F; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px">
    ${hand(20, '#6A3FE0')}
    Einfach so ein High five</button>`;

const received = `<div style="display: flex; flex-direction: column; gap: 10px">
    ${label('Bekommen')}
    <div style="display: flex; flex-direction: column">
      ${RECEIVED.map(
        ([
          i,
          n,
          r,
          w,
        ]) => `<div style="min-height: 56px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #EFECF5">
        <span style="width: 34px; height: 34px; border-radius: 17px; background: #EEE8FD; color: #4B2AA8; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center">${i}</span>
        <span style="flex-grow: 1; font-size: 15px; line-height: 1.35"><strong>${n}</strong> ${r}</span>
        <span style="font-size: 13px; color: #6B6678">${w}</span>
      </div>`,
      ).join('\n      ')}
    </div>
  </div>`;

const emptyCard = `<div style="border-radius: 22px; border: 1.5px dashed #CFC8E0; padding: 16px; display: flex; flex-direction: column; gap: 14px">
    <span style="font-size: 17px; font-weight: 700">Noch keine Kontakte</span>
    <p style="margin: 0; font-size: 14px; line-height: 1.45; color: #6B6678">Kontakte entstehen, wenn du eine Datei von jemandem öffnest, der Juri nutzt. Dann siehst du hier, wofür es ein High five gibt.</p>
    <a class="tap" href="Teilen.dc.html" style="height: 50px; border-radius: 16px; background: #6A3FE0; color: #FFFFFF; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center">Zu „Teilen“</a>
  </div>`;

const frame = (
  inner,
  overlay = '',
) => `<div style="width: 390px; height: 844px; box-sizing: border-box; background: #FFFFFF; position: relative; overflow: hidden; padding: 54px 24px 0 24px; display: flex; flex-direction: column; gap: 20px">
  ${back}
  ${head(38)}
  ${inner}${overlay}
</div>`;

const overlay = (text, primary, close) => `
  <div class="fade" style="position: absolute; inset: 0; background: rgba(255,255,255,.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 0 36px; text-align: center">
    <div style="position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center">
      <span class="wave" style="position: absolute; inset: 30px; border-radius: 50%; border: 3px solid #6A3FE0"></span>
      <span class="wave2" style="position: absolute; inset: 30px; border-radius: 50%; border: 3px solid #C9B8F7"></span>
      <div class="slap" style="width: 120px; height: 120px; border-radius: 60px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; justify-content: center">${hand(64, 'currentColor', 1.7)}</div>
    </div>
    <div class="rise" style="display: flex; flex-direction: column; gap: 8px; animation-delay: .35s">
      <span class="d" style="font-size: 34px; font-weight: 750; letter-spacing: -0.02em">High five!</span>
      <span style="font-size: 16px; color: #6B6678; line-height: 1.4">${text}</span>
    </div>
    <div class="rise" style="display: flex; flex-direction: column; gap: 10px; width: 100%; animation-delay: .5s">
      ${primary ? `<button class="tap" style="height: 56px; border-radius: 18px; border: 0; background: #17141F; color: #FFFFFF; font-size: 16px; font-weight: 700">${primary}</button>` : ''}
      <button class="tap" style="height: 48px; border-radius: 16px; border: 0; background: transparent; color: #6B6678; font-size: 15px; font-weight: 700">${close}</button>
    </div>
  </div>`;

const dim = `<div style="position: absolute; inset: 0; background: rgba(23,20,31,.28)"></div>`;
const handle = `<span style="align-self: center; width: 40px; height: 5px; border-radius: 3px; background: #DCD6EA"></span>`;
const dialog = (padding, gap, inner) => `
  ${dim}
  <div role="dialog" aria-modal="true" style="position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; border-radius: 30px 30px 0 0; background: #FFFFFF; padding: ${padding}; display: flex; flex-direction: column; gap: ${gap}; box-shadow: 0 -20px 40px -24px rgba(46,26,115,.4)">
    ${handle}
    ${inner}
  </div>`;
const sheet = (eyebrow, title, body) =>
  dialog(
    '12px 24px 34px 24px',
    '14px',
    `<span style="display: flex; align-items: center; gap: 8px; color: #6A3FE0; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-top: 6px">${eyebrow}</span>
    <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.015em">${title}</h2>
    ${body}`,
  );
const titled = (title, body) =>
  dialog(
    '12px 22px 34px 22px',
    '16px',
    `<div style="display: flex; justify-content: space-between; align-items: center">
      <h2 class="d" style="margin: 0; font-size: 24px; font-weight: 750; letter-spacing: -0.02em">${title}</h2>
      <button class="tap" aria-label="Schließen" style="width: 40px; height: 40px; border-radius: 20px; border: 0; background: #F6F4FB; color: #17141F; display: flex; align-items: center; justify-content: center">${CLOSE}</button>
    </div>
    ${body}`,
  );

const primary = (text) =>
  `<button class="tap" style="height: 60px; border-radius: 20px; border: 0; background: #6A3FE0; color: #FFFFFF; font-size: 18px; font-weight: 700; box-shadow: 0 10px 24px -10px rgba(106,63,224,.55)">${text}</button>`;
const soft = (text) =>
  `<button class="tap" style="height: 52px; border-radius: 18px; border: 0; background: #F6F4FB; color: #17141F; font-size: 16px; font-weight: 700">${text}</button>`;
const ghost = (text) =>
  `<button class="tap" style="height: 52px; border-radius: 18px; border: 0; background: transparent; color: #6B6678; font-size: 16px; font-weight: 700">${text}</button>`;
const para = (text) => `<p style="margin: 0; font-size: 16px; line-height: 1.5">${text}</p>`;
const paraMuted = (text) =>
  `<p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6B6678">${text}</p>`;
const hint = (text) =>
  `<p style="margin: 0; font-size: 13px; color: #6B6678; line-height: 1.4">${text}</p>`;
const problem = (text) =>
  `<p style="margin: 0; font-size: 14px; font-weight: 600; color: #B42318; line-height: 1.4">${text}</p>`;
const avatar42 = (i) =>
  `<span style="width: 42px; height: 42px; border-radius: 21px; background: #17141F; color: #FFFFFF; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${i}</span>`;

const givenFrame = frame(
  `${people([person(MARA, true), person(JONAS)])}
  ${justBecause}
  ${received}`,
  overlay('An Mara für „12 Tage in Folge“', 'Per Nachricht senden …', 'Schließen'),
);
const anyFrame = frame(
  `${people([person(MARA), person(JONAS)])}
  ${justBecause}
  ${received}`,
  overlay('Einfach so. Such dir aus, an wen.', 'Per Nachricht senden …', 'Schließen'),
);
const feierFrame = frame(
  `${people([person(MARA), person(JONAS)])}
  ${justBecause}
  ${received}`,
  overlay('Mara schickt dir ein High five für 12 Tage in Folge.', '', 'Schön'),
);
const leerFrame = frame(`${emptyCard}
  ${justBecause}`);

const onList = (sheetHtml) =>
  frame(
    `${people([person(MARA), person(JONAS)])}
  ${justBecause}
  ${received}`,
    sheetHtml,
  );

const cardPreview =
  '<div role="img" style="align-self: center; width: 216px; height: 270px; border-radius: 20px; background: #6A3FE0"></div>';
const cardSheet = onList(
  sheet(
    'High five',
    'Bildkarte',
    `${cardPreview}
    ${paraMuted('Das Bild schickst du per Nachricht an wen du magst.')}
    ${primary('Bild teilen')}${soft('Als Gruß-Datei für Juri')}${ghost('Zurück')}`,
  ),
);

const contactRow = ([i, n, s]) =>
  `<button class="tap" style="width: 100%; min-height: 64px; padding: 0; border: 0; border-bottom: 1px solid #EFECF5; background: none; display: flex; align-items: center; gap: 12px; color: #17141F; text-align: left">${avatar42(i)}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">${n}</span><span style="font-size: 13px; color: #6B6678; font-weight: 500">${s}</span></span><span style="display: flex; flex-shrink: 0">${CHEVRON}</span></button>`;
const contactsSheet = onList(
  titled(
    'Deine Leute',
    `<div style="display: flex; flex-direction: column">${CONTACTS.map(contactRow).join('')}</div>
    ${paraMuted('Die Namen kommen aus den Dateien. Hier kannst du sie für dich umbenennen.')}`,
  ),
);
const contactSheet = onList(
  titled(
    'Kontakt',
    `<label style="border-radius: 20px; background: #F6F4FB; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px">
      <span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Name</span>
      <input value="Mara" style="width: 100%; box-sizing: content-box; min-height: 28px; padding: 0; border: 0; background: transparent; font-size: 18px; color: #17141F; outline: none">
    </label>
    ${hint('So hat sich die Person in ihrer Datei genannt.')}
    ${primary('Speichern')}${ghost('Kontakt entfernen')}`,
  ),
);
const greetingSheet = onList(
  sheet(
    'High five',
    'Gruß-Datei',
    `<div style="display: flex; align-items: center; gap: 12px">${avatar42('M')}<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">Mara</span><span style="font-size: 13px; color: #6B6678">Gruß-Datei</span></div></div>
    ${para('Mara schickt dir ein High five für 12 Tage in Folge.')}
    ${paraMuted('Mara kommt zu deinen Kontakten.')}
    ${primary('Annehmen')}${ghost('Abbrechen')}`,
  ),
);
const errorSheet = onList(
  sheet(
    'High five',
    'Datei nicht angenommen',
    `${problem('Dieses High five ist für jemand anderen.')}
    ${paraMuted('Es wurde nichts verändert.')}
    ${primary('Andere Datei wählen')}${ghost('Schließen')}`,
  ),
);

/* iPad: Sidebar und Rahmen aus iPadErfolge.dc.html, Inhalt in zwei Spalten. */
const erfolgeIpad = readFileSync(new URL('../design/iPadErfolge.dc.html', import.meta.url), 'utf8');
const aside = /<aside[\s\S]*?<\/aside>/.exec(erfolgeIpad)?.[0];
if (!aside) throw new Error('Sidebar in iPadErfolge.dc.html nicht gefunden');
const ipad = `<div style="width: 1180px; height: 820px; box-sizing: border-box; background: #FFFFFF; display: flex; overflow: hidden">
  ${aside}
  <main style="flex-grow: 1; min-width: 0; box-sizing: border-box; padding: 40px 44px; display: flex; flex-direction: column; gap: 26px">
    ${back}
    ${head(44)}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        ${people([person(MARA), person(JONAS)])}
        ${justBecause}
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        ${received}
      </div>
    </div>
  </main>
</div>`;

const BOARDS = [
  ['HighFiveLeer', 'High fives: noch keine Kontakte', leerFrame, 390, 844],
  ['HighFiveGegeben', 'High fives: gegeben', givenFrame, 390, 844],
  ['HighFiveEinfach', 'High fives: einfach so', anyFrame, 390, 844],
  ['HighFiveFeier', 'High fives: empfangen', feierFrame, 390, 844],
  ['HighFiveKarte', 'High fives: Bildkarte', cardSheet, 390, 844],
  ['HighFiveKontakte', 'High fives: Kontaktliste', contactsSheet, 390, 844],
  ['HighFiveKontakt', 'High fives: Kontakt bearbeiten', contactSheet, 390, 844],
  ['HighFiveGruss', 'High fives: Gruß-Datei empfangen', greetingSheet, 390, 844],
  ['HighFiveFehler', 'High fives: Datei nicht angenommen', errorSheet, 390, 844],
  ['iPadHighFive', 'iPad High fives', ipad, 1180, 820],
];

for (const [name, title, body] of BOARDS) {
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
${body}
</x-dc>
</body>
</html>
`;
  writeFileSync(new URL(`../design/${name}.dc.html`, import.meta.url), html);
}

const canvasFile = new URL('../design/canvas.json', import.meta.url);
const canvas = JSON.parse(readFileSync(canvasFile, 'utf8'));
const top = 23400;
canvas.notes.t13 = {
  kind: 'title1',
  maxW: 3800,
  text: 'M11: High fives',
  w: 240,
  x: 0,
  y: top,
};
let x = 0;
for (const [name, boardTitle, , w, h] of BOARDS) {
  const key = `${name}.dc.html`;
  canvas.boards[key] = { h, radius: 44, title: boardTitle, w, x, y: top + 300 };
  x += w + 80;
  if (!canvas.order.includes(key)) canvas.order.push(key);
}
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
