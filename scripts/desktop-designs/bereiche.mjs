/*
 * Desktop-Artboards der übrigen Bereiche: Erfolge, Fristen, Teilen, High fives, Einstellungen,
 * Lernrhythmus, der Dialog (Sheet am Rechner) und Willkommen. Beispieldaten wie in den Designs
 * (iPadErfolge.dc.html, FristNeu.dc.html, Teilen.dc.html, HighFive.dc.html, Einstellungen.dc.html).
 */
import {
  backLink,
  ghostButton,
  icon,
  inkButton,
  kbd,
  pageHead,
  primaryButton,
  shell,
} from './kit.mjs';

const toggle = (on) =>
  `<span style="width: 50px; height: 30px; border-radius: 15px; background: ${on ? '#6A3FE0' : '#DCD6EA'}; position: relative; display: block; flex-shrink: 0"><span style="position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 12px; background: #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,.2); transform: translateX(${on ? 20 : 0}px)"></span></span>`;

/* Erfolge: Maße und Daten wie iPadErfolge.dc.html und die Vorschau der App (Erfolge.module.css). */
const HEAT = ['#F1EEF7', '#EEE8FD', '#C9B8F7', '#9A7BEF', '#6A3FE0'];
// Stufen der 26 Wochen, je Woche 7 Tage von oben nach unten (f = noch nicht, r = Rekord).
const LEVELS =
  '2,3,1,0,1,3,1,1,3,1,2,3,3,2,1,2,2,2,1,3,0,3,0,1,2,2,2,3,3,2,3,0,0,2,3,0,3,2,3,2,3,3,2,3,1,3,3,3,2,2,3,1,1,2,1,2,2,3,2,1,3,3,3,0,3,1,2,3,1,0,2,3,2,0,0,1,3,2,3,3,2,0,2,2,3,0,3,3,2,0,3,2,2,3,2,3,2,2,3,0,2,3,2,1,1,2,3,1,0,0,3,3,3,3,2,2,1,3,0,3,0,2,2,3,3,1,1,2,1,0,1,3,1,0,2,3,3,3,2,2,3,2,2,1,1,3,2,1,2,3,3,3,3,2,1,3,3,1,0,3,2,1,0,0,3,1,2,3,3,3,4r,0,2,3,1,2,f,f,f,f,f,f'.split(
    ',',
  );
const heatCells = () =>
  LEVELS.map((l) => {
    if (l === 'f') return '<span style="border-radius: 6px"></span>';
    const record = l.endsWith('r');
    return `<span style="border-radius: 6px; background: ${HEAT[Number.parseInt(l, 10)]}; ${record ? 'box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #17141F' : ''}"></span>`;
  }).join('');

const BADGE_PATHS = {
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  stack: 'M4 8h16v12H4zM7 4.5h10',
  tree: 'M5 4h6M8 4v16M8 10h6M8 16h6M14 8h5v4h-5zM14 14h5v4h-5z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  rep: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  share: 'M12 15V4M8 8l4-4 4 4M5 12v7h14v-7',
};

const badge = (name, sub, ic, fraction) => {
  const done = fraction === 1;
  const ring = 2 * Math.PI * 34;
  const dash = done ? '0 999' : `${(ring * fraction).toFixed(1)} 999`;
  return `<li style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center">
    <div style="position: relative; width: 76px; height: 76px; flex-shrink: 0">
      <svg width="76" height="76" viewBox="0 0 76 76" style="position: absolute; left: 0; top: 0" aria-hidden="true"><circle cx="38" cy="38" r="34" fill="${done ? '#6A3FE0' : '#FFFFFF'}" stroke="#EEE8FD" stroke-width="5"></circle><circle cx="38" cy="38" r="34" fill="none" stroke="#6A3FE0" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash}" transform="rotate(-90 38 38)"></circle></svg>
      <div style="position: absolute; left: 0; top: 0; width: 76px; height: 76px; display: flex; align-items: center; justify-content: center; color: ${done ? '#FFFFFF' : '#4B2AA8'}"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${BADGE_PATHS[ic]}"></path></svg></div>
    </div>
    <span style="font-size: 13.5px; font-weight: 700; line-height: 1.2">${name}</span>
    <span style="font-size: 12px; font-weight: 600; color: #6B6678; margin-top: -6px">${sub}</span>
  </li>`;
};

const statTile = (value, text) =>
  `<div style="border-radius: 22px; background: #F6F4FB; padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; gap: 2px"><span class="d" style="font-size: 30px; font-weight: 750; letter-spacing: -0.02em">${value}</span><span style="font-size: 14px; font-weight: 600; color: #6B6678">${text}</span></div>`;

const erfolge = (w, h) =>
  shell(
    w,
    h,
    'erfolge',
    `<div style="display: flex; flex-direction: column; gap: 26px">
    <div style="display: flex; flex-direction: column; gap: 6px"><h1 class="d" style="margin: 0; font-size: 44px; font-weight: 750; letter-spacing: -0.03em">Erfolge</h1></div>
    <div style="display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: 12px">
      <div style="border-radius: 22px; background: #6A3FE0; color: #FFFFFF; padding: 18px 20px; display: flex; align-items: center; gap: 14px"><span class="d" style="font-size: 56px; font-weight: 800; line-height: .9; letter-spacing: -0.04em">12</span><div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 17px; font-weight: 700">Tage in Folge</span><span style="font-size: 12.5px; opacity: .9">1 Pausentag pro Woche frei</span></div></div>
      ${statTile('1.284', 'Wiederholungen')}${statTile('146', 'Karten angelegt')}
      <a href="DesktopHighFive.dc.html" class="tap hv-card" style="border-radius: 22px; background: #F6F4FB; padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; gap: 2px; color: #17141F"><span class="d" style="font-size: 30px; font-weight: 750; letter-spacing: -0.02em">2</span><span style="font-size: 14px; font-weight: 600; color: #6B6678">High fives bekommen</span></a>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 13px; font-weight: 600; color: #6B6678; letter-spacing: .04em; text-transform: uppercase">Letzte 26 Wochen</span>
        <span style="display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: #F6F4FB"><span style="height: 32px; padding: 0 14px; border-radius: 9px; background: #FFFFFF; box-shadow: 0 2px 6px -2px rgba(46,26,115,.25); font-size: 13px; font-weight: 700; display: flex; align-items: center">Gelernt</span><span style="height: 32px; padding: 0 14px; font-size: 13px; font-weight: 700; color: #6B6678; display: flex; align-items: center">Angelegt</span></span>
      </div>
      <div style="display: grid; grid-auto-flow: column; grid-template-columns: repeat(26, minmax(0, 1fr)); grid-template-rows: repeat(7, 22px); gap: 5px">${heatCells()}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: #6B6678; font-weight: 600"><span>April</span><span>Mai</span><span>Juni</span><span>Juli</span><span>August</span><span>September</span></div>
      <div style="display: flex; align-items: center; gap: 10px"><span style="width: 16px; height: 16px; border-radius: 5px; background: #6A3FE0; box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #17141F; flex-shrink: 0"></span><span style="font-size: 14px; font-weight: 600">Rekord: Mi, 23.9. · 86 Wiederholungen</span></div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px">
      <span style="font-size: 13px; font-weight: 600; color: #6B6678; letter-spacing: .04em; text-transform: uppercase">Meilensteine</span>
      <ul style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px 10px">
        ${badge('Erste Karte', 'geschafft', 'pen', 1)}${badge('100 angelegt', 'geschafft', 'stack', 1)}${badge('Schema-Baumeister', '7 von 10', 'tree', 0.7)}${badge('7 Tage am Stück', 'geschafft', 'cal', 1)}${badge('1.000 Wiederholungen', 'geschafft', 'rep', 1)}${badge('Teamplayer', '1 von 3 geteilt', 'share', 1 / 3)}
      </ul>
    </div>
    </div>`,
  );

/* Fristen: Karten wie Fristen.dc.html und FristNeu.dc.html (Fristen.module.css), im Raster mit zwei Spalten. */
const frist = ({ kind, name, meta, days, hero = false, dashed = false, bar = 0 }) => {
  const fg = hero ? '#FFFFFF' : '#17141F';
  return `<div style="border-radius: 24px; box-sizing: border-box; padding: ${hero ? '18px 20px' : '16px 20px'}; display: flex; flex-direction: ${hero ? 'column' : 'row'}; justify-content: space-between; align-items: ${hero ? 'stretch' : 'center'}; gap: ${hero ? 12 : 10}px; ${hero ? 'background: #6A3FE0; color: #FFFFFF; grid-column: span 2' : dashed ? 'border: 1.5px dashed #C9B8F7' : 'border: 1.5px solid #EFECF5'}">
    <div style="display: flex; justify-content: space-between; align-items: ${hero ? 'flex-start' : 'center'}; gap: 10px; ${hero ? '' : 'flex-grow: 1'}">
      <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0">
        <span style="font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; ${hero ? 'opacity: .85' : 'color: #6A3FE0'}">${kind}</span>
        <span style="font-size: ${hero ? 19 : 17}px; font-weight: 700; color: ${fg}">${name}</span>
        <span style="font-size: 13.5px; ${hero ? 'opacity: .9' : 'color: #6B6678'}">${meta}</span>
      </div>
      ${days ? `<div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0"><span class="d" style="font-size: ${hero ? 38 : 30}px; font-weight: 800; line-height: .95; letter-spacing: -0.03em; color: ${fg}">${days}</span><span style="font-size: 12px; font-weight: 700; ${hero ? 'opacity: .9' : 'color: #6B6678'}">Tage</span></div>` : `<span style="height: 34px; padding: 0 12px; border-radius: 17px; background: #EEE8FD; color: #4B2AA8; font-size: 13px; font-weight: 700; display: flex; align-items: center; flex-shrink: 0">Datum setzen</span>`}
    </div>
    ${hero ? `<div style="display: flex; flex-direction: column; gap: 6px"><div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,.28); overflow: hidden"><div style="width: ${bar}%; height: 8px; border-radius: 4px; background: #FFFFFF"></div></div><div style="display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; font-weight: 600; opacity: .95"><span>${bar} % sitzen sicher</span><span>Endspurt ab Fr, 2.10.</span></div></div>` : ''}
  </div>`;
};

const fristenBody = `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-content: start">
  <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px"><h1 class="d" style="margin: 0; font-size: 44px; line-height: 1.05; font-weight: 750; letter-spacing: -0.03em">Fristen</h1><p style="margin: 0; font-size: 16px; line-height: 1.45; color: #6B6678; max-width: 60ch">Bis zum Termin kommt alles im Umfang rechtzeitig dran. Danach läuft der normale Rhythmus weiter.</p></div>
  <div style="display: flex; justify-content: flex-end; align-items: flex-start; gap: 12px">${ghostButton('Fristen als Kalenderdatei sichern', { h: 48, size: 15 })}${inkButton('+ Frist hinzufügen', { h: 48, size: 15, kb: 'F' })}</div>
  ${frist({ kind: 'Klausur', name: 'Zivilrecht, AG-Klausur', meta: 'Fr, 9.10. · ZR · 3 Stapel · 101 Karten', days: 11, hero: true, bar: 64 })}
  ${frist({ kind: 'LL.M.', name: 'Modul Vertragsrecht', meta: 'Fr, 15.1.2027 · Tag #LLM · 58 Karten', days: 109 })}
  ${frist({ kind: 'Examen', name: '2. Staatsexamen, schriftlich', meta: 'Alle Rechtsgebiete', days: 0, dashed: true })}
</div>`;

const fristen = (w, h) => shell(w, h, 'fristen', fristenBody);

/* Teilen: Werte wie Teilen.dc.html (Teilen.module.css), die Karte links, Empfangen rechts. */
const fileIcon = `<span style="position: relative; width: 58px; height: 70px; flex-shrink: 0"><span style="position: absolute; left: 8px; top: 4px; width: 50px; height: 64px; border-radius: 10px; background: #C9B8F7"></span><span style="position: absolute; left: 0; top: 0; width: 50px; height: 64px; box-sizing: border-box; border-radius: 10px; background: #6A3FE0; color: #FFFFFF; font-size: 10px; font-weight: 800; letter-spacing: .04em; display: flex; align-items: flex-end; justify-content: flex-start; padding: 7px">JURI</span></span>`;

const switchRow = (text, on) =>
  `<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="font-size: 15px; font-weight: 600">${text}</span>${toggle(on)}</div>`;

const teilen = (w, h) =>
  shell(
    w,
    h,
    'teilen',
    `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 20px; align-content: start">
      <h1 class="d" style="grid-column: 1 / -1; margin: 0; font-size: 44px; line-height: 1.05; font-weight: 750; letter-spacing: -0.03em">Teilen</h1>
      <div style="align-self: start; border-radius: 26px; background: #F6F4FB; padding: 20px; display: flex; flex-direction: column; gap: 16px">
        <div style="display: flex; align-items: center; gap: 16px">${fileIcon}<div style="display: flex; flex-direction: column; gap: 3px; min-width: 0"><span style="font-size: 17px; font-weight: 700">Amtshaftung.juri</span><span style="font-size: 13.5px; color: #6B6678; font-weight: 500">21 Karten · 3 PDFs · 2,4 MB</span></div></div>
        <div style="box-sizing: border-box; min-height: 52px; border-top: 1px solid #DCD6EA; border-bottom: 1px solid #DCD6EA; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="font-size: 15px; font-weight: 600; color: #6B6678">Stapel</span><span style="display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700">Amtshaftung · ZR${icon('chevron', 16, 2.2, '#B3AEC0')}</span></div>
        ${switchRow('Eigene Notizen mitschicken', false)}
        ${switchRow('Erfolge mitschicken', true)}
        <div style="font-size: 13px; color: #6B6678; line-height: 1.4; margin-top: -8px">Dein Lernfortschritt bleibt immer privat auf deinem Gerät.</div>
        <span class="tap hv-ink" style="height: 56px; border-radius: 18px; background: #17141F; color: #FFFFFF; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px">${icon('share', 20, 2.2)}Herunterladen${kbd('E', 'dark')}</span>
      </div>
      <div style="align-self: start; display: flex; flex-direction: column; gap: 20px">
        <div style="display: flex; flex-direction: column; gap: 12px">
          <span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">Empfangen</span>
          <div style="border-radius: 22px; border: 1.5px dashed #CFC8E0; padding: 16px; display: flex; flex-direction: column; gap: 14px">
            <p style="margin: 0; font-size: 14px; line-height: 1.45; color: #6B6678">Stapel von anderen kommen als .juri-Datei. Speichere sie zuerst auf deinem Rechner.</p>
            <span class="tap hv-primary" style="height: 50px; border-radius: 16px; background: #6A3FE0; color: #FFFFFF; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px">Datei öffnen${kbd('I', 'dark')}</span>
            <span style="height: 44px; color: #5B34D1; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center">So geht’s</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; height: 44px; font-size: 14px; font-weight: 600"><span style="color: #6B6678">Alles sichern</span><span style="font-weight: 700; color: #5B34D1">Backup exportieren</span></div>
      </div>
    </div>`,
  );

/* High fives */
const personCard = (
  initial,
  name,
  win,
) => `<div class="hv-card" style="border-radius: 22px; background: #F6F4FB; padding: 14px 14px 14px 16px; display: flex; align-items: center; gap: 12px">
    <span style="width: 42px; height: 42px; border-radius: 21px; background: #17141F; color: #FFFFFF; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${initial}</span>
    <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">${name}</span><span style="font-size: 13.5px; color: #4B2AA8; font-weight: 600">${win}</span></div>
    <span class="tap" style="width: 52px; height: 52px; border-radius: 26px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #FFFFFF; color: #6A3FE0; box-shadow: 0 4px 12px -6px rgba(46,26,115,.4)">${icon('hand', 22, 1.9)}</span>
  </div>`;

const receivedRow = (i, n, r, when) =>
  `<div style="min-height: 56px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #EFECF5"><span style="width: 34px; height: 34px; border-radius: 17px; background: #EEE8FD; color: #4B2AA8; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${i}</span><span style="flex-grow: 1; font-size: 15px; line-height: 1.35"><strong>${n}</strong> ${r}</span><span style="font-size: 13px; color: #6B6678">${when}</span></div>`;

const contactRow = (i, n, sub) =>
  `<div class="hv-row" style="min-height: 60px; margin: 0 -10px; padding: 0 10px; border-radius: 14px; display: flex; align-items: center; gap: 12px"><span style="width: 38px; height: 38px; border-radius: 19px; background: #17141F; color: #FFFFFF; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${i}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15.5px; font-weight: 700">${n}</span><span style="font-size: 13px; color: #6B6678; font-weight: 500">${sub}</span></span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div>`;

const label7 = (text) =>
  `<span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">${text}</span>`;

const highFive = (w, h) =>
  shell(
    w,
    h,
    'erfolge',
    `<div style="display: flex; flex-direction: column; gap: 26px">
    ${backLink('Erfolge', 'DesktopErfolge.dc.html')}
    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: -8px"><h1 class="d" style="margin: 0; font-size: 44px; font-weight: 750; letter-spacing: -0.03em; line-height: normal">High fives</h1><p style="margin: 0; font-size: 15px; color: #6B6678; line-height: 1.4">Für Erfolge der anderen. Oder einfach so.</p></div>
    <div style="display: grid; grid-template-columns: 1.1fr 1fr 0.9fr; gap: 40px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        <div style="display: flex; flex-direction: column; gap: 10px">
        ${label7('Neu von deinen Leuten')}
        ${personCard('M', 'Mara', '12 Tage in Folge')}${personCard('J', 'Jonas', '200 Karten angelegt')}
        </div>
        <span class="tap hv-outline" style="height: 56px; border-radius: 18px; border: 1.5px dashed #C9B8F7; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 700"><span style="color: #6A3FE0; display: flex">${icon('hand', 20, 1.9)}</span>Einfach so ein High five${kbd('H')}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        <div style="display: flex; flex-direction: column; gap: 10px">
        ${label7('Bekommen')}
        <div style="display: flex; flex-direction: column">${receivedRow('M', 'Mara', 'für 1.000 Wiederholungen', 'gestern')}${receivedRow('J', 'Jonas', 'einfach so', 'Sa')}</div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0">
        <div style="display: flex; justify-content: space-between; align-items: center">${label7('Deine Leute (2)')}${kbd('K')}</div>
        <div style="display: flex; flex-direction: column">${contactRow('M', 'Mara', '12 Tage in Folge · zuletzt gesehen gestern')}${contactRow('J', 'Jonas', 'zuletzt gesehen Sa')}</div>
        <div style="min-height: 44px; border-top: 1px solid #EFECF5; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600"><span style="color: #6B6678">Gruß von jemandem?</span><span style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #5B34D1">Gruß-Datei öffnen${kbd('O')}</span></div>
      </div>
    </div>
    </div>`,
  );

/* Einstellungen: Maße der App (Einstellungen.module.css, Entwicklungsstand.module.css). */
const valueRow = (name, value) =>
  `<div style="min-height: 58px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #EFECF5"><span style="font-size: 16px; font-weight: 600">${name}</span><span style="font-size: 16px; font-weight: 700; color: #6B6678; text-align: right">${value}</span></div>`;

const section = (name, inner) =>
  `<section style="margin-top: 8px; display: flex; flex-direction: column; gap: 12px"><span style="font-size: 12px; font-weight: 800; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">${name}</span>${inner}</section>`;

const softButton = (text, { h = 52, size = 16, radius = 18 } = {}) =>
  `<a href="#" class="tap hv-row" style="height: ${h}px; border-radius: ${radius}px; background: #F6F4FB; color: #17141F; display: flex; align-items: center; justify-content: center; padding: 0 ${radius === 18 ? 20 : 16}px; font-size: ${size}px; font-weight: 700">${text}</a>`;

const einstellungen = (w, h) =>
  shell(
    w,
    h,
    'einstellungen',
    `<div style="display: contents; line-height: 1.4">${pageHead('Einstellungen')}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; margin-top: 28px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        <div style="display: flex; align-items: center; gap: 14px"><span style="width: 56px; height: 56px; border-radius: 28px; background: #EEE8FD; color: #4B2AA8; font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0">S</span><label style="flex: 1; min-width: 0; border-radius: 20px; background: #F6F4FB; padding: 12px 8px 12px 16px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Name</span><span style="min-height: 28px; font-size: 18px">Sven</span></label></div>
        ${section('Lernen', `<div style="border-top: 1px solid #EFECF5"><div class="hv-row" style="min-height: 64px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #EFECF5"><span style="display: flex; flex-direction: column; gap: 2px; padding: 8px 0"><span style="font-size: 16px; font-weight: 600">Lernrhythmus</span><span style="font-size: 13px; color: #6B6678">FSRS, 90 % Behaltensquote</span></span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div></div>`)}
        ${section('Speicher', `<div style="border-top: 1px solid #EFECF5">${valueRow('Dauerhaft gespeichert', 'Nein')}${valueRow('Belegt', '3,1 MB von 947 MB')}</div>${softButton('Dauerhaft speichern anfordern', { h: 44, size: 15, radius: 14 })}<p style="margin: 0; font-size: 13px; line-height: 1.4; color: #6B6678">Dauerhaft gespeicherte Daten löscht der Browser nicht von sich aus, um Platz zu schaffen. Die Daten liegen nur in diesem Browser. Gegen das Löschen der Website-Daten oder den Verlust des Geräts hilft nur ein Backup.</p>`)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        ${section('Backup', `<div style="border-top: 1px solid #EFECF5">${valueRow('Letztes Backup', 'Noch keins')}</div><div style="display: flex; flex-direction: column; gap: 10px">${inkButton('Backup erstellen', { h: 52, size: 16 })}${ghostButton('Backup einspielen', { h: 52, size: 16 })}</div><p style="margin: 0; font-size: 13px; line-height: 1.4; color: #6B6678">Tipp: Das Backup landet im Download-Ordner dieses Browsers. Leg es an einem sicheren Ort ab, dann hilft es auch auf einem neuen Gerät.</p>`)}
        ${section('Entwicklungsstand', `<div style="border-radius: 20px; background: #F6F4FB; padding: 14px 16px; box-sizing: border-box; min-height: 44px; display: grid; grid-template-columns: 1fr auto; gap: 10px 12px; align-items: center"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">Alle Schritte fertig</span><span style="font-size: 13px; font-weight: 600; color: #6B6678">Version 1.1.0</span></span><span style="width: 10px; height: 10px; margin-right: 4px; border-right: 2.2px solid #B3AEC0; border-bottom: 2.2px solid #B3AEC0; transform: rotate(45deg); grid-column: 2; grid-row: 1"></span><span style="grid-column: 1 / -1; grid-row: 2; display: block; height: 8px; border-radius: 4px; background: #E4DDF7; overflow: hidden"><span style="display: block; width: 100%; height: 8px; border-radius: 4px; background: #6A3FE0"></span></span></div>`)}
        ${section('Entwicklung', `<div style="display: flex; flex-direction: column; gap: 10px">${softButton('Testinstanz öffnen')}${softButton('Styleguide ansehen')}${softButton('Heute mit Beispieldaten')}</div>`)}
      </div>
    </div>
    <p style="margin: auto 0 0; padding-top: 12px; font-size: 13px; color: #6B6678; text-align: center">Juri · Version 1.1.0 (1afa43c)</p></div>`,
  );

/* Lernrhythmus: Maße der App (Lernrhythmus.module.css). */
const preset = (name, ret, load, on) =>
  `<span style="border-radius: 20px; box-sizing: border-box; height: 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; ${on ? 'background: #6A3FE0; color: #FFFFFF' : 'border: 1.5px solid #E4DDF7'}"><span style="font-size: 14px; font-weight: 700">${name}</span><span class="d" style="font-size: 26px; font-weight: 750; letter-spacing: -0.02em">${ret}</span><span style="font-size: 11.5px; font-weight: 600; opacity: .8">${load}</span></span>`;

const stepper = (v) =>
  `<span style="display: flex; align-items: center; gap: 4px"><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">−</span><span style="min-width: 36px; text-align: center; font-size: 17px; font-weight: 800">${v}</span><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">+</span></span>`;

/* Zeile wie in der App: ohne border-box, die Trennlinie kommt zur Mindesthöhe dazu. */
const rhythmRow = (inner, { min = 58, last = false, link = false } = {}) =>
  `<div class="${link ? 'hv-row' : ''}" style="min-height: ${min}px; display: flex; align-items: center; justify-content: space-between; gap: 12px; ${last ? '' : 'border-bottom: 1px solid #EFECF5'}">${inner}</div>`;

const rhythmValue = (name, value) =>
  rhythmRow(
    `<span style="font-size: 16px; font-weight: 600">${name}</span><span style="font-size: 16px; font-weight: 700; color: #6B6678; white-space: nowrap">${value}</span>`,
  );

const lernrhythmus = (w, h) =>
  shell(
    w,
    h,
    'rhythmus',
    `<div style="display: contents; line-height: normal">${pageHead('Lernrhythmus')}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 48px; margin-top: 28px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 16px; background: #F6F4FB"><span style="height: 42px; border-radius: 12px; background: #FFFFFF; box-shadow: 0 2px 8px -3px rgba(46,26,115,.3); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700">FSRS (empfohlen)</span><span style="height: 42px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #6B6678">Leitner-Kasten</span></div>
        <div style="display: flex; flex-direction: column; gap: 16px">
          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">${preset('Entspannt', '85 %', 'weniger Last', false)}${preset('Standard', '90 %', 'ausgewogen', true)}${preset('Examen', '95 %', 'mehr Last', false)}</div>
          <div style="display: flex; flex-direction: column; gap: 8px"><span style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 600"><span>Ziel-Behaltensquote</span><span style="font-weight: 800; color: #6A3FE0">90 %</span></span><div style="height: 28px; margin: 2px 0; display: flex; align-items: center"><div style="position: relative; width: 100%; height: 8px; border-radius: 4px; background: #E4DDF7"><div style="width: 59%; height: 8px; border-radius: 4px; background: #6A3FE0"></div><span style="position: absolute; left: 59%; top: -6px; width: 20px; height: 20px; margin-left: -10px; border-radius: 10px; background: #6A3FE0; box-shadow: 0 0 0 3px #FFFFFF, 0 2px 6px rgba(46,26,115,.4)"></span></div></div><span style="font-size: 13px; color: #6B6678; line-height: 1.4">Wahrscheinlichkeit, eine Karte bei Fälligkeit noch zu wissen. Höher heißt: kürzere Abstände, mehr Wiederholungen pro Tag.</span></div>
          <div style="border-radius: 20px; background: #F6F4FB; padding: 16px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Beispiel: immer „Gut“ (ca.)</span><div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">${['3 T', '→ 9 T', '→ 25 T', '→ 2 Mon', '→ 4 Mon'].map((t) => `<span style="height: 30px; padding: 0 10px; border-radius: 15px; background: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">${t}</span>`).join('')}</div></div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px; min-width: 0">
        <div style="display: flex; flex-direction: column; border-top: 1px solid #EFECF5">
          ${rhythmRow(`<span style="font-size: 16px; font-weight: 600">Neue Karten pro Tag</span>${stepper(20)}`)}
          ${rhythmValue('Längster Abstand', '180 Tage')}
          ${rhythmRow(`<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 600">Fristen</span><span style="font-size: 13px; color: #6B6678">Examen, Klausuren, LL.M.: Abstände enden rechtzeitig davor</span></span><span style="display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: #6B6678; white-space: nowrap"><span style="color: #6A3FE0">3</span>${icon('chevron', 16, 2.2, '#B3AEC0')}</span>`, { min: 72, link: true })}
          ${rhythmValue('Lernschritte bei „Nochmal“', '1 min · 10 min')}
        </div>
        <div class="hv-row" style="margin-top: -8px; min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="font-size: 16px; font-weight: 600">Profil, Speicher und Backup</span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div>
      </div>
    </div></div>`,
  );

/* Dialog: Sheets stehen am Rechner als Fenster in der Mitte (statt unten am Rand). Das Fenster ist 441 px hoch und steht auf ganzen Pixeln. */
const dialog = (
  w,
  h,
) => `<div style="position: relative; width: ${w}px; height: ${h}px; overflow: hidden">
  ${fristen(w, h)}
  <div style="position: absolute; inset: 0; background: rgba(23,20,31,.28)"></div>
  <div role="dialog" aria-modal="true" aria-labelledby="t" style="position: absolute; left: 50%; top: ${Math.round((h - 441) / 2)}px; width: 560px; margin-left: -280px; box-sizing: border-box; border-radius: 30px; background: #FFFFFF; padding: 28px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 30px 60px -20px rgba(46,26,115,.45)">
    <div style="display: flex; justify-content: space-between; align-items: center"><h2 id="t" class="d" style="margin: 0; font-size: 26px; font-weight: 750; letter-spacing: -0.02em">Neue Frist</h2><span aria-label="Schließen" class="tap hv-card" style="width: 40px; height: 40px; border-radius: 20px; background: #F6F4FB; display: flex; align-items: center; justify-content: center">${icon('close', 18, 2.4)}</span></div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap">${['Examen', 'Klausur', 'LL.M.', 'Eigene'].map((t, i) => `<span style="height: 38px; padding: 0 14px; border-radius: 19px; box-sizing: border-box; font-size: 14px; font-weight: 700; display: flex; align-items: center; ${i === 1 ? 'background: #6A3FE0; color: #FFFFFF' : 'border: 1.5px solid #E4DDF7; background: #FFFFFF; color: #17141F'}">${t}</span>`).join('')}</div>
    <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 10px"><label style="border-radius: 16px; background: #F6F4FB; padding: 10px 14px; min-height: 57px; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Name</span><span style="font-size: 16px; color: #726E7A">z. B. Klausur ÖR</span></label><label style="border-radius: 16px; background: #F6F4FB; padding: 10px 14px; min-height: 57px; box-sizing: border-box; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Datum</span><span data-mask style="font-size: 15px; color: #726E7A">TT.MM.JJJJ</span></label></div>
    <div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">Umfang: Rechtsgebiete, Stapel oder Tags</span><div style="display: flex; gap: 6px"><span style="height: 36px; padding: 0 12px; border-radius: 18px; background: #17141F; color: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">Alle Karten</span><span style="height: 36px; padding: 0 12px; border-radius: 18px; border: 1.5px dashed #CFC8E0; box-sizing: border-box; color: #6B6678; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">+ Eingrenzen</span></div></div>
    <div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; font-weight: 700">Endspurt</span><span style="font-size: 13px; color: #6B6678">Letzte 7 Tage: jede Karte noch einmal</span></span>${toggle(true)}</div>
    ${primaryButton('Frist speichern', { h: 56, size: 17 })}
  </div>
</div>`;

/* Zeichen der App (AppIconMark: Kachel, zwei Karten, J), Maße der 200-px-Vorlage skaliert. */
const appMark = (size) =>
  `<div style="position: relative; flex-shrink: 0; width: ${size}px; height: ${size}px"><div style="position: absolute; left: 0; top: 0; width: 200px; height: 200px; border-radius: 45px; overflow: hidden; transform: scale(${size / 200}); transform-origin: 0 0; background: #6A3FE0"><div style="position: absolute; left: 52px; top: 40px; width: 110px; height: 130px; border-radius: 18px; background: #9A7BEF; transform: rotate(8deg)"></div><div style="position: absolute; left: 40px; top: 36px; width: 110px; height: 130px; border-radius: 18px; background: #FFFFFF; display: flex; align-items: center; justify-content: center"><span class="d" style="font-family: 'Bricolage Grotesque', 'Figtree', system-ui, sans-serif; font-size: 96px; font-weight: 800; color: #17141F; letter-spacing: -0.04em; line-height: 1; margin-top: -6px">J</span></div></div></div>`;

/* Willkommen: Fläche in Violett links mit Zeichen und Text, Formular rechts (Maße der App). */
const willkommen = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); overflow: hidden; line-height: 1.4">
  <div style="background: #6A3FE0; color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; padding: 56px; box-sizing: border-box">
    ${appMark(72)}
    <p style="margin: 0; max-width: 520px; display: flex; flex-direction: column; gap: 16px"><span class="d" style="display: block; font-size: 56px; line-height: 1; font-weight: 780; letter-spacing: -0.035em">Karteikarten für das Referendariat.</span><span style="display: block; font-size: 18px; line-height: 1.45; opacity: .9">Alles bleibt auf deinem Gerät, ohne Konto und ohne Server.</span></p>
  </div>
  <div style="display: flex; align-items: center; justify-content: center; padding: 56px; box-sizing: border-box">
    <div style="width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 24px">
      <h1 class="d" style="margin: 0; font-size: 48px; line-height: .98; font-weight: 780; letter-spacing: -0.035em">Willkommen <br>bei <span style="color: #6A3FE0">Juri.</span></h1>
      <label style="border-radius: 20px; background: #F6F4FB; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Wie heißt du?</span><span style="min-height: 28px; font-size: 18px; color: #726E7A">Vorname</span></label>
      <span style="margin-top: -12px; font-size: 13px; line-height: 1.4; color: #6B6678">Dein Name steht nur auf diesem Gerät und in Dateien, die du selbst teilst.</span>
      <span class="tap" style="height: 60px; border-radius: 20px; background: #6A3FE0; opacity: .45; box-shadow: 0 10px 24px -10px rgba(106,63,224,.55); color: #FFFFFF; font-size: 18px; font-weight: 700; display: flex; align-items: center; padding: 0 24px; gap: 8px"><span>Los geht’s</span><span style="margin-left: auto; display: flex">${icon('arrowRight', 22, 2.2)}</span></span>
    </div>
  </div>
</div>`;

export const boards = [
  { name: 'DesktopErfolge', title: 'Desktop: Erfolge', build: erfolge },
  { name: 'DesktopFristen', title: 'Desktop: Fristen', build: fristen },
  { name: 'DesktopTeilen', title: 'Desktop: Teilen', build: teilen },
  { name: 'DesktopHighFive', title: 'Desktop: High fives', build: highFive },
  { name: 'DesktopEinstellungen', title: 'Desktop: Einstellungen', build: einstellungen },
  { name: 'DesktopLernrhythmus', title: 'Desktop: Lernrhythmus', build: lernrhythmus },
  { name: 'DesktopDialog', title: 'Desktop: Dialog statt Sheet', build: dialog },
  { name: 'DesktopWillkommen', title: 'Desktop: Willkommen', build: willkommen },
];
