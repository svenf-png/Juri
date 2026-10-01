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
  label,
  pageHead,
  primaryButton,
  shell,
} from './kit.mjs';

const toggle = (on) =>
  `<span style="width: 50px; height: 30px; border-radius: 15px; background: ${on ? '#6A3FE0' : '#DCD6EA'}; position: relative; display: block; flex-shrink: 0"><span style="position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 12px; background: #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,.2); transform: translateX(${on ? 20 : 0}px)"></span></span>`;

const SURFACE_CARD = 'border-radius: 28px; background: #F6F4FB;';

/* Erfolge */
const HEAT = ['#F1EEF7', '#EEE8FD', '#C9B8F7', '#9A7BEF', '#6A3FE0'];
const heatCells = () => {
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const cells = [];
  for (let col = 0; col < 26; col++) {
    for (let row = 0; row < 7; row++) {
      const last = col === 25;
      if (last && row > 1) {
        cells.push('<span style="border-radius: 7px"></span>');
        continue;
      }
      const r = next();
      const level = r < 0.22 ? 0 : r < 0.42 ? 1 : r < 0.68 ? 2 : r < 0.88 ? 3 : 4;
      const record = col === 24 && row === 2;
      cells.push(
        `<span style="border-radius: 7px; background: ${record ? HEAT[4] : HEAT[level]}; ${record ? 'box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #17141F' : ''}"></span>`,
      );
    }
  }
  return cells.join('');
};

const statTile = (n, text, { big = false, sub = '' } = {}) =>
  `<div style="border-radius: 28px; box-sizing: border-box; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; gap: 4px; min-height: 108px; ${big ? 'background: #6A3FE0; color: #FFFFFF; flex-direction: row; align-items: center; justify-content: flex-start; gap: 16px' : 'background: #F6F4FB'}">
    <span class="d" style="font-size: ${big ? 64 : 40}px; line-height: 1; font-weight: 800; letter-spacing: -0.03em">${n}</span>
    <span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: ${big ? 18 : 15}px; font-weight: ${big ? 700 : 600}; ${big ? '' : 'color: #6B6678'}">${text}</span>${sub ? `<span style="font-size: 13px; opacity: .9">${sub}</span>` : ''}</span>
  </div>`;

const badge = (name, sub, ic, frac) => {
  const c = 2 * Math.PI * 35;
  return `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center">
    <div style="position: relative; width: 76px; height: 76px">
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="35" fill="none" stroke="#EEE8FD" stroke-width="3.5"></circle><circle cx="38" cy="38" r="35" fill="none" stroke="#6A3FE0" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} 999" transform="rotate(-90 38 38)"></circle></svg>
      <span style="position: absolute; left: 9px; top: 9px; width: 58px; height: 58px; border-radius: 29px; display: flex; align-items: center; justify-content: center; background: ${frac === 1 ? '#6A3FE0' : '#EEE8FD'}; color: ${frac === 1 ? '#FFFFFF' : '#6A3FE0'}">${icon(ic, 26)}</span>
    </div>
    <span style="font-size: 14px; font-weight: 700">${name}</span>
    <span style="font-size: 12px; font-weight: 600; color: #6B6678; margin-top: -6px">${sub}</span>
  </div>`;
};

const erfolge = (w, h) =>
  shell(
    w,
    h,
    'erfolge',
    `${pageHead('Erfolge', '', `<span class="tap hv-card" style="height: 44px; padding: 0 18px 0 14px; border-radius: 22px; background: #F6F4FB; display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #17141F"><span style="color: #6A3FE0; display: flex">${icon('hand', 20, 1.9)}</span>2 High fives bekommen</span>`)}
    <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 16px; margin-top: 24px">
      ${statTile(12, 'Tage in Folge', { big: true, sub: '1 Pausentag pro Woche frei' })}
      ${statTile('1.284', 'Wiederholungen')}
      ${statTile('146', 'Karten angelegt')}
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 30px">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 13px; font-weight: 600; color: #6B6678; letter-spacing: .04em; text-transform: uppercase">Letzte 26 Wochen</span>
        <span style="display: flex; padding: 3px; border-radius: 12px; background: #F6F4FB"><span style="height: 32px; padding: 0 14px; border-radius: 10px; background: #FFFFFF; box-shadow: 0 2px 8px -3px rgba(46,26,115,.3); font-size: 13.5px; font-weight: 700; display: flex; align-items: center">Gelernt</span><span style="height: 32px; padding: 0 14px; font-size: 13.5px; font-weight: 600; color: #6B6678; display: flex; align-items: center">Angelegt</span></span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(26, minmax(0, 1fr)); grid-template-rows: repeat(7, 24px); grid-auto-flow: column; gap: 6px">${heatCells()}</div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6B6678; font-weight: 500"><span>April</span><span>Mai</span><span>Juni</span><span>Juli</span><span>August</span><span>September</span></div>
      <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500"><span style="width: 18px; height: 18px; border-radius: 6px; background: #6A3FE0; box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #17141F; margin: 0 4px"></span>Rekord: Mi, 23.9. · 86 Wiederholungen</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 28px">
      <span style="font-size: 13px; font-weight: 600; color: #6B6678; letter-spacing: .04em; text-transform: uppercase">Meilensteine</span>
      <div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px">
        ${badge('Erste Karte', 'geschafft', 'pencil', 1)}${badge('100 angelegt', 'geschafft', 'stack', 1)}${badge('Schema-Baumeister', '7 von 10', 'indent', 0.7)}${badge('7 Tage am Stück', 'geschafft', 'calendar', 1)}${badge('1.000 Wiederholungen', 'geschafft', 'flip', 1)}${badge('Teamplayer', '1 von 3 geteilt', 'share', 0.34)}
      </div>
    </div>`,
  );

/* Fristen */
const frist = ({ kind, name, meta, days, hero = false, dashed = false, bar = 0 }) => {
  const fg = hero ? '#FFFFFF' : '#17141F';
  return `<div style="border-radius: 24px; box-sizing: border-box; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; ${hero ? 'background: #6A3FE0; color: #FFFFFF; grid-column: span 2' : dashed ? 'border: 1.5px dashed #C9B8F7' : 'border: 1.5px solid #EFECF5'}">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px">
      <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0">
        <span style="font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; ${hero ? 'opacity: .85' : 'color: #6A3FE0'}">${kind}</span>
        <span style="font-size: ${hero ? 22 : 18}px; font-weight: 700; color: ${fg}">${name}</span>
        <span style="font-size: 14px; ${hero ? 'opacity: .9' : 'color: #6B6678'}">${meta}</span>
      </div>
      ${days ? `<div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0"><span class="d" style="font-size: ${hero ? 48 : 34}px; font-weight: 800; line-height: .95; letter-spacing: -0.03em; color: ${fg}">${days}</span><span style="font-size: 12px; font-weight: 700; ${hero ? 'opacity: .9' : 'color: #6B6678'}">Tage</span></div>` : `<span style="height: 34px; padding: 0 14px; border-radius: 17px; background: #EEE8FD; color: #4B2AA8; font-size: 13px; font-weight: 700; display: flex; align-items: center; flex-shrink: 0">Datum setzen</span>`}
    </div>
    ${hero ? `<div style="display: flex; flex-direction: column; gap: 6px"><div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,.28); overflow: hidden"><div style="width: ${bar}%; height: 8px; border-radius: 4px; background: #FFFFFF"></div></div><div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; opacity: .95"><span>${bar} % sitzen sicher</span><span>Endspurt ab Fr, 2.10.</span></div></div>` : ''}
  </div>`;
};

const fristenBody = `${pageHead(
  'Fristen',
  'Bis zum Termin kommt alles im Umfang rechtzeitig dran. Danach läuft der normale Rhythmus weiter.',
  `${ghostButton('Als Kalenderdatei sichern', { h: 48, size: 15 })}${inkButton('+ Frist hinzufügen', { h: 48, size: 15, kb: 'F' })}`,
)}
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 28px">
    ${frist({ kind: 'Klausur', name: 'Zivilrecht, AG-Klausur', meta: 'Fr, 9.10. · ZR · 3 Stapel · 101 Karten', days: 11, hero: true, bar: 64 })}
    ${frist({ kind: 'LL.M.', name: 'Modul Vertragsrecht', meta: 'Fr, 15.1.2027 · Tag #LLM · 58 Karten', days: 109 })}
    ${frist({ kind: 'Examen', name: '2. Staatsexamen, schriftlich', meta: 'Alle Rechtsgebiete', days: 0, dashed: true })}
  </div>`;

const fristen = (w, h) => shell(w, h, 'fristen', fristenBody);

/* Teilen */
const fileIcon = `<span style="position: relative; width: 58px; height: 68px; flex-shrink: 0"><span style="position: absolute; left: 8px; top: 4px; width: 50px; height: 64px; border-radius: 12px; background: #C9B8F7"></span><span style="position: absolute; left: 0; top: 0; width: 50px; height: 64px; box-sizing: border-box; border-radius: 12px; background: #6A3FE0; color: #FFFFFF; font-size: 9px; font-weight: 800; letter-spacing: .06em; display: flex; align-items: flex-end; padding: 8px">JURI</span></span>`;

const switchRow = (text, on) =>
  `<div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="font-size: 16px; font-weight: 600">${text}</span>${toggle(on)}</div>`;

const teilen = (w, h) =>
  shell(
    w,
    h,
    'teilen',
    `${pageHead('Teilen')}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; margin-top: 28px; align-items: start">
      <div style="${SURFACE_CARD} padding: 24px; display: flex; flex-direction: column; gap: 6px">
        <div style="display: flex; align-items: center; gap: 18px; padding-bottom: 16px; border-bottom: 1px solid #EFECF5">${fileIcon}<div style="display: flex; flex-direction: column; gap: 2px"><span class="d" style="font-size: 22px; font-weight: 750; letter-spacing: -0.02em">Amtshaftung.juri</span><span style="font-size: 14px; color: #6B6678">21 Karten · 3 PDFs · 2,4 MB</span></div></div>
        <div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EFECF5"><span style="font-size: 16px; color: #6B6678; font-weight: 500">Stapel</span><span style="display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700">Amtshaftung · ZR${icon('chevron', 16, 2.2, '#B3AEC0')}</span></div>
        ${switchRow('Eigene Notizen mitschicken', false)}
        ${switchRow('Erfolge mitschicken', true)}
        <p style="margin: 0 0 8px; font-size: 13px; color: #6B6678">Dein Lernfortschritt bleibt immer privat auf deinem Gerät.</p>
        <div style="margin-top: 4px">${inkButton('Herunterladen', { h: 56, kb: 'E', icon: icon('share', 20), size: 16 })}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px">
        ${label('Empfangen')}
        <div style="border-radius: 28px; border: 1.5px dashed #CFC8E0; padding: 24px; display: flex; flex-direction: column; gap: 16px">
          <p style="margin: 0; font-size: 15px; line-height: 1.45; color: #6B6678">Stapel von anderen kommen als .juri-Datei. Speichere sie zuerst auf deinem Rechner.</p>
          ${primaryButton('Datei öffnen', { h: 56, kb: 'I' })}
          <span style="align-self: center; font-size: 14px; font-weight: 700; color: #5B34D1">So geht’s</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; font-size: 14px"><span style="color: #6B6678; font-weight: 500">Alles sichern</span><span style="font-weight: 700; color: #5B34D1">Backup exportieren</span></div>
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
  `<div style="min-height: 56px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #EFECF5"><span style="width: 34px; height: 34px; border-radius: 17px; background: #EEE8FD; color: #4B2AA8; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center">${i}</span><span style="flex-grow: 1; font-size: 15px; line-height: 1.35"><strong>${n}</strong> ${r}</span><span style="font-size: 13px; color: #6B6678">${when}</span></div>`;

const contactRow = (i, n, sub) =>
  `<div class="hv-row" style="min-height: 60px; margin: 0 -10px; padding: 0 10px; border-radius: 14px; display: flex; align-items: center; gap: 12px"><span style="width: 38px; height: 38px; border-radius: 19px; background: #17141F; color: #FFFFFF; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center">${i}</span><span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15.5px; font-weight: 700">${n}</span><span style="font-size: 13px; color: #6B6678">${sub}</span></span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div>`;

const highFive = (w, h) =>
  shell(
    w,
    h,
    'erfolge',
    `${backLink('Erfolge', 'DesktopErfolge.dc.html')}
    <div style="margin-top: -8px">${pageHead('High fives', 'Für Erfolge der anderen. Oder einfach so.')}</div>
    <div style="display: grid; grid-template-columns: 1.1fr 1fr 0.9fr; gap: 40px; margin-top: 30px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0">
        ${label('Neu von deinen Leuten')}
        ${personCard('M', 'Mara', '12 Tage in Folge')}${personCard('J', 'Jonas', '200 Karten angelegt')}
        <span class="tap hv-outline" style="height: 56px; border-radius: 18px; border: 1.5px dashed #C9B8F7; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 16px; font-weight: 700"><span style="color: #6A3FE0; display: flex">${icon('hand', 20, 1.9)}</span>Einfach so ein High five${kbd('H')}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0">
        ${label('Bekommen')}
        <div style="display: flex; flex-direction: column">${receivedRow('M', 'Mara', 'für 1.000 Wiederholungen', 'gestern')}${receivedRow('J', 'Jonas', 'einfach so', 'Sa')}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0">
        <div style="display: flex; justify-content: space-between; align-items: center">${label('Deine Leute (2)')}${kbd('K')}</div>
        <div style="display: flex; flex-direction: column">${contactRow('M', 'Mara', '12 Tage in Folge · zuletzt gesehen gestern')}${contactRow('J', 'Jonas', 'zuletzt gesehen Sa')}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #EFECF5; font-size: 14px"><span style="color: #6B6678; font-weight: 500">Gruß von jemandem?</span><span style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #5B34D1">Gruß-Datei öffnen${kbd('O')}</span></div>
      </div>
    </div>`,
  );

/* Einstellungen */
const valueRow = (name, value, { link = false } = {}) =>
  `<div class="${link ? 'hv-row' : ''}" style="min-height: 58px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EFECF5; ${link ? 'margin: 0 -10px; padding: 0 10px; border-radius: 12px' : ''}"><span style="font-size: 16px; font-weight: 600">${name}</span><span style="font-size: 16px; font-weight: 700; color: #6B6678; display: flex; align-items: center; gap: 6px">${value}${link ? icon('chevron', 16, 2.2, '#B3AEC0') : ''}</span></div>`;

const section = (name, inner) =>
  `<section style="display: flex; flex-direction: column; gap: 10px"><span style="font-size: 12px; font-weight: 800; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">${name}</span>${inner}</section>`;

const einstellungen = (w, h) =>
  shell(
    w,
    h,
    'einstellungen',
    `${pageHead('Einstellungen')}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 48px; margin-top: 28px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 28px; min-width: 0">
        <div style="display: flex; align-items: center; gap: 14px"><span style="width: 56px; height: 56px; border-radius: 28px; background: #EEE8FD; color: #4B2AA8; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0">S</span><label style="flex-grow: 1; border-radius: 20px; background: #F6F4FB; padding: 12px 18px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Name</span><span style="font-size: 18px">Sven</span></label></div>
        ${section('Lernen', `<div class="hv-row" style="min-height: 72px; margin: 0 -10px; padding: 0 10px; border-radius: 12px; border-top: 1px solid #EFECF5; border-bottom: 1px solid #EFECF5; display: flex; align-items: center; justify-content: space-between"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 600">Lernrhythmus</span><span style="font-size: 13px; color: #6B6678">FSRS, 90 % Behaltensquote</span></span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div>`)}
        ${section('Speicher', `<div style="border-top: 1px solid #EFECF5">${valueRow('Dauerhaft gespeichert', 'Nein')}${valueRow('Belegt', '3,1 MB von 947 MB')}</div>${ghostButton('Dauerhaft speichern anfordern', { h: 48, size: 15 })}<p style="margin: 0; font-size: 13px; line-height: 1.45; color: #6B6678">Dauerhaft gespeicherte Daten löscht der Browser nicht von sich aus, um Platz zu schaffen. Die Daten liegen nur in diesem Browser. Gegen das Löschen der Website-Daten oder den Verlust des Geräts hilft nur ein Backup.</p>`)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 28px; min-width: 0">
        ${section('Backup', `<div style="border-top: 1px solid #EFECF5">${valueRow('Letztes Backup', 'Noch keins')}</div><div style="display: flex; gap: 12px">${inkButton('Backup erstellen', { h: 52, size: 15, grow: true })}${ghostButton('Backup einspielen', { h: 52, size: 15, grow: true })}</div><p style="margin: 0; font-size: 13px; line-height: 1.45; color: #6B6678">Tipp: Das Backup landet im Download-Ordner dieses Browsers. Leg es an einem sicheren Ort ab, dann hilft es auch auf einem neuen Gerät.</p>`)}
        ${section('Entwicklungsstand', `<div style="border-radius: 24px; background: #F6F4FB; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px"><div style="display: flex; justify-content: space-between; align-items: center"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 17px; font-weight: 700">13 von 14 Schritten fertig</span><span style="font-size: 13px; color: #6B6678; font-weight: 600">Version 1.0.1</span></span>${icon('chevron', 18, 2.2, '#B3AEC0')}</div><div style="height: 8px; border-radius: 4px; background: #E4DDF7; overflow: hidden"><div style="width: 93%; height: 8px; border-radius: 4px; background: #6A3FE0"></div></div></div>`)}
      </div>
    </div>`,
  );

/* Lernrhythmus */
const preset = (name, ret, load, on) =>
  `<span style="border-radius: 20px; box-sizing: border-box; height: 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; ${on ? 'background: #6A3FE0; color: #FFFFFF' : 'border: 1.5px solid #EFECF5'}"><span style="font-size: 14px; font-weight: 700">${name}</span><span class="d" style="font-size: 28px; font-weight: 750; letter-spacing: -0.02em">${ret}</span><span style="font-size: 12px; font-weight: 600; opacity: .8">${load}</span></span>`;

const stepper = (v) =>
  `<span style="display: flex; align-items: center; gap: 4px"><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">−</span><span style="min-width: 36px; text-align: center; font-size: 17px; font-weight: 800">${v}</span><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">+</span></span>`;

const lernrhythmus = (w, h) =>
  shell(
    w,
    h,
    'rhythmus',
    `${pageHead('Lernrhythmus')}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 48px; margin-top: 28px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 18px; min-width: 0">
        <div style="display: flex; padding: 3px; border-radius: 16px; background: #F6F4FB"><span style="flex: 1 1 0; height: 44px; border-radius: 13px; background: #FFFFFF; box-shadow: 0 2px 8px -3px rgba(46,26,115,.3); display: flex; align-items: center; justify-content: center; font-size: 14.5px; font-weight: 700">FSRS (empfohlen)</span><span style="flex: 1 1 0; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 14.5px; font-weight: 600; color: #6B6678">Leitner-Kasten</span></div>
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">${preset('Entspannt', '85 %', 'weniger Last', false)}${preset('Standard', '90 %', 'ausgewogen', true)}${preset('Examen', '95 %', 'mehr Last', false)}</div>
        <div style="display: flex; flex-direction: column; gap: 8px"><span style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 600"><span>Ziel-Behaltensquote</span><span style="font-weight: 800; color: #6A3FE0">90 %</span></span><div style="height: 28px; display: flex; align-items: center"><div style="position: relative; width: 100%; height: 8px; border-radius: 4px; background: #E4DDF7"><div style="width: 59%; height: 8px; border-radius: 4px; background: #6A3FE0"></div><span style="position: absolute; left: 59%; top: -6px; width: 20px; height: 20px; margin-left: -10px; border-radius: 10px; background: #6A3FE0; box-shadow: 0 0 0 3px #FFFFFF, 0 2px 6px rgba(46,26,115,.4)"></span></div></div><span style="font-size: 13px; color: #6B6678; line-height: 1.4">Wahrscheinlichkeit, eine Karte bei Fälligkeit noch zu wissen. Höher heißt: kürzere Abstände, mehr Wiederholungen pro Tag.</span></div>
        <div style="border-radius: 20px; background: #F6F4FB; padding: 16px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Beispiel: immer „Gut“ (ca.)</span><div style="display: flex; gap: 6px; flex-wrap: wrap">${['3 T', '→ 9 T', '→ 25 T', '→ 2 Mon', '→ 4 Mon'].map((t) => `<span style="height: 30px; padding: 0 10px; border-radius: 15px; background: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">${t}</span>`).join('')}</div></div>
      </div>
      <div style="display: flex; flex-direction: column; border-top: 1px solid #EFECF5; min-width: 0">
        <div style="min-height: 58px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EFECF5"><span style="font-size: 16px; font-weight: 600">Neue Karten pro Tag</span>${stepper(20)}</div>
        ${valueRow('Längster Abstand', '180 Tage')}
        <div class="hv-row" style="min-height: 72px; margin: 0 -10px; padding: 0 10px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #EFECF5"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 600">Fristen</span><span style="font-size: 13px; color: #6B6678">Examen, Klausuren, LL.M.: Abstände enden rechtzeitig davor</span></span><span style="display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; color: #6A3FE0">3${icon('chevron', 16, 2.2, '#B3AEC0')}</span></div>
        ${valueRow('Lernschritte bei „Nochmal“', '1 min · 10 min')}
        <div class="hv-row" style="min-height: 58px; margin: 0 -10px; padding: 0 10px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between"><span style="font-size: 16px; font-weight: 600">Profil, Speicher und Backup</span>${icon('chevron', 16, 2.2, '#B3AEC0')}</div>
      </div>
    </div>`,
  );

/* Dialog: Sheets stehen am Rechner als Fenster in der Mitte (statt unten am Rand). */
const dialog = (
  w,
  h,
) => `<div style="position: relative; width: ${w}px; height: ${h}px; overflow: hidden">
  ${fristen(w, h)}
  <div style="position: absolute; inset: 0; background: rgba(23,20,31,.28)"></div>
  <div role="dialog" aria-modal="true" aria-labelledby="t" style="position: absolute; left: 50%; top: 50%; width: 560px; margin-left: -280px; transform: translateY(-50%); box-sizing: border-box; border-radius: 30px; background: #FFFFFF; padding: 28px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 30px 60px -20px rgba(46,26,115,.45)">
    <div style="display: flex; justify-content: space-between; align-items: center"><h2 id="t" class="d" style="margin: 0; font-size: 26px; font-weight: 750; letter-spacing: -0.02em">Neue Frist</h2><span aria-label="Schließen" class="tap hv-card" style="width: 40px; height: 40px; border-radius: 20px; background: #F6F4FB; display: flex; align-items: center; justify-content: center">${icon('close', 18, 2.4)}</span></div>
    <div style="display: flex; gap: 6px; flex-wrap: wrap">${['Examen', 'Klausur', 'LL.M.', 'Eigene'].map((t, i) => `<span style="height: 38px; padding: 0 14px; border-radius: 19px; box-sizing: border-box; font-size: 14px; font-weight: 700; display: flex; align-items: center; ${i === 1 ? 'background: #6A3FE0; color: #FFFFFF' : 'border: 1.5px solid #E4DDF7; background: #FFFFFF; color: #17141F'}">${t}</span>`).join('')}</div>
    <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 10px"><label style="border-radius: 16px; background: #F6F4FB; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Name</span><span style="font-size: 16px; color: #726E7A">z. B. Klausur ÖR</span></label><label style="border-radius: 16px; background: #F6F4FB; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Datum</span><span style="font-size: 15px; color: #726E7A">TT.MM.JJJJ</span></label></div>
    <div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 12px; font-weight: 700; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">Umfang: Rechtsgebiete, Stapel oder Tags</span><div style="display: flex; gap: 6px"><span style="height: 34px; padding: 0 12px; border-radius: 17px; background: #17141F; color: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">Alle Karten</span><span style="height: 34px; padding: 0 12px; border-radius: 17px; border: 1.5px dashed #CFC8E0; box-sizing: border-box; color: #6B6678; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">+ Eingrenzen</span></div></div>
    <div style="min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px"><span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; font-weight: 700">Endspurt</span><span style="font-size: 13px; color: #6B6678">Letzte 7 Tage: jede Karte noch einmal</span></span>${toggle(true)}</div>
    ${primaryButton('Frist speichern', { h: 56, size: 17, kb: 'Strg ↵' })}
  </div>
</div>`;

/* Willkommen: Fläche links mit dem Zeichen, Formular rechts. */
const willkommen = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden">
  <div style="background: #6A3FE0; color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; padding: 56px; box-sizing: border-box">
    <span style="width: 72px; height: 72px; border-radius: 20px; background: #FFFFFF; color: #6A3FE0; display: flex; align-items: center; justify-content: center"><span class="d" style="font-size: 40px; font-weight: 800; letter-spacing: -0.04em">J</span></span>
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 520px"><h2 class="d" style="margin: 0; font-size: 56px; line-height: 1; font-weight: 780; letter-spacing: -0.035em">Karteikarten für das Referendariat.</h2><p style="margin: 0; font-size: 18px; line-height: 1.45; opacity: .9">Alles bleibt auf deinem Gerät, ohne Konto und ohne Server.</p></div>
  </div>
  <div style="display: flex; align-items: center; justify-content: center; padding: 56px; box-sizing: border-box">
    <div style="width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 24px">
      <h1 class="d" style="margin: 0; font-size: 48px; line-height: .98; font-weight: 780; letter-spacing: -0.035em">Willkommen<br>bei <span style="color: #6A3FE0">Juri.</span></h1>
      <label style="border-radius: 20px; background: #F6F4FB; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Wie heißt du?</span><span style="font-size: 20px; color: #726E7A">Vorname</span></label>
      <span style="font-size: 13px; color: #6B6678; margin-top: -12px">Dein Name steht nur auf diesem Gerät und in Dateien, die du selbst teilst.</span>
      <span class="tap" style="height: 60px; border-radius: 20px; background: #C9B8F7; color: #FFFFFF; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; padding: 0 24px">Los geht’s${icon('arrowRight', 22, 2.2)}</span>
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
