/*
 * Desktop-Artboards: Lernen. Karte (720 px) mit Seitenfeld (320 px) mittig im Fenster, ohne
 * Sidebar (wie auf dem iPhone ist Lernen ein Ablauf im Vollbild). Beispieldaten wie in
 * Lernen.dc.html und Schema.dc.html.
 */
import { areaTag, icon, kbd, kbdOnSurface, label, typeTag } from './kit.mjs';

const CARD_W = 720;
const PANEL_W = 320;
const GAP = 40;
/** Höhe der Bühne: größte Karte (Schema, 600 px) samt Kopfzeile und Knopf; so bleibt die Kopfzeile auf jeder Karte an derselben Stelle. */
const STAGE_H = 792;

const RATINGS = [
  ['Nochmal', '10 min', '1', 'background: #FFFFFF; border: 1.5px solid #DCD6EA; color: #17141F'],
  ['Schwer', '2 T', '2', 'background: #EEE8FD; border: 0; color: #2E1A73'],
  ['Gut', '5 T', '3', 'background: #C9B8F7; border: 0; color: #17141F'],
  ['Leicht', '12 T', '4', 'background: #6A3FE0; border: 0; color: #FFFFFF'],
];

const ratingBar =
  () => `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px">
    ${RATINGS.map(
      ([name, ivl, key, style]) =>
        `<span class="tap" style="position: relative; height: 76px; border-radius: 18px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; ${style}"><span style="font-size: 16px; font-weight: 700">${name}</span><span style="font-size: 12.5px; font-weight: 600; opacity: .8">${ivl}</span><span style="position: absolute; top: 8px; right: 8px">${kbd(key, name === 'Leicht' ? 'dark' : 'light')}</span></span>`,
    ).join('')}
  </div>`;

const flipButton = () =>
  `<span class="tap hv-ink" style="height: 64px; border-radius: 20px; background: #17141F; color: #FFFFFF; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 12px">Antwort zeigen${kbd('Leertaste', 'dark')}</span>`;

const topRow = (
  counter,
  pct,
) => `<div style="height: 44px; display: flex; align-items: center; gap: 12px">
      <a href="DesktopHeute.dc.html" aria-label="Lernen beenden" class="tap hv-row" style="width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; color: #17141F">${icon('close', 22, 2.2)}</a>
      <div style="flex-grow: 1; height: 8px; border-radius: 4px; background: #E4DDF7; overflow: hidden"><div style="height: 8px; border-radius: 4px; background: #6A3FE0; width: ${pct}%"></div></div>
      <div style="font-size: 14px; font-weight: 700; min-width: 34px; text-align: right">${counter}</div>
    </div>`;

/** Karte mit zwei Schichten dahinter (wie im iPhone-Design, auf 720 px übertragen). */
const cardStack = (height, face) => `<div style="position: relative; height: ${height}px">
      <div style="position: absolute; left: 0; right: 0; top: 32px; height: ${height}px; border-radius: 32px; background: #FFFFFF; opacity: .45; transform: translateY(26px) scale(.9)"></div>
      <div style="position: absolute; left: 0; right: 0; top: 14px; height: ${height}px; border-radius: 32px; background: #FFFFFF; opacity: .75; transform: translateY(14px) scale(.95)"></div>
      ${face}
    </div>`;

const faceBox = (height, inner) =>
  `<div style="position: relative; height: ${height}px; box-sizing: border-box; border-radius: 32px; background: #FFFFFF; box-shadow: 0 30px 60px -36px rgba(46,26,115,.4); padding: 36px; display: flex; flex-direction: column; gap: 22px">${inner}</div>`;

const front = (height) =>
  faceBox(
    height,
    `<div style="display: flex; gap: 8px; align-items: center">${areaTag('SR')}${typeTag('Frage')}<span style="margin-left: auto; font-size: 14px; font-weight: 700; color: #6A3FE0">§ 242 StGB</span></div>
      <div style="flex-grow: 1; display: flex; align-items: center"><div class="d" style="font-size: 36px; line-height: 1.18; font-weight: 700; letter-spacing: -0.02em; text-wrap: balance; max-width: 560px">Was versteht man unter Gewahrsam?</div></div>
      <div style="font-size: 14px; font-weight: 600; color: #6B6678; display: flex; align-items: center; gap: 8px">${icon('flip', 16)}Klicken zum Umdrehen</div>`,
  );

const back = (height) =>
  faceBox(
    height,
    `<div style="display: flex; gap: 8px; align-items: center"><span style="font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #6A3FE0">Antwort</span><span style="margin-left: auto; font-size: 14px; font-weight: 700; color: #6B6678">§ 242 StGB</span></div>
      <div style="display: flex; flex-direction: column; gap: 16px">
        <div style="font-size: 16px; font-weight: 600; color: #6B6678; line-height: 1.35">Was versteht man unter Gewahrsam?</div>
        <div style="font-size: 24px; line-height: 1.45; font-weight: 500; max-width: 600px">Die von einem Herrschaftswillen getragene tatsächliche Sachherrschaft eines Menschen über eine Sache, deren Reichweite sich nach der Verkehrsanschauung bestimmt.</div>
      </div>
      <div style="margin-top: auto; border-radius: 16px; background: #F6F4FB; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: #6B6678">${icon('note', 18)}<span><strong style="color: #17141F">Notiz</strong> Fall Rucksack im Hörsaal: Gewahrsam bleibt beim Studenten.</span></div>`,
  );

const POINTS = [
  ['1.', 'Ausübung eines öffentlichen Amtes', 'Art. 34 S. 1 GG', false, 'shown'],
  ['2.', 'Verletzung einer drittbezogenen Amtspflicht', '§ 839 I 1 BGB', true, 'shown'],
  ['3.', 'Verschulden', '§ 276 BGB', false, 'current'],
  ['4.', '', '', false, 'hidden'],
  ['5.', '', '', false, 'hidden'],
];

const pointRow = ([n, text, norm, link, look]) => {
  const hidden = look === 'hidden';
  return `<div style="display: flex; align-items: center; gap: 14px; min-height: 56px; border-bottom: 1px solid #F1EEF7; ${look === 'current' ? 'margin: 0 -12px; padding: 0 12px; border-radius: 14px; background: #F6F4FB; border-bottom-color: transparent' : ''}">
        <span style="width: 28px; height: 28px; border-radius: 14px; background: ${look === 'current' ? '#6A3FE0' : '#F6F4FB'}; color: ${look === 'current' ? '#FFFFFF' : '#4B2AA8'}; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${n.replace('.', '')}</span>
        ${hidden ? '<span style="flex-grow: 1; height: 14px; border-radius: 7px; background: #EEE8FD; max-width: 260px"></span>' : `<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 18px; font-weight: 650">${text}</span><span style="font-size: 13px; color: #6B6678; font-weight: 500">${norm}</span></span>`}
        ${link ? `<span style="height: 30px; padding: 0 11px; border-radius: 15px; background: #EEE8FD; color: #4B2AA8; font-size: 12.5px; font-weight: 700; display: flex; align-items: center; gap: 6px">${icon('link', 14, 2.2)}Karte</span>` : ''}
      </div>`;
};

const schemaFace = (height) =>
  faceBox(
    height,
    `<div style="display: flex; gap: 8px; align-items: center">${areaTag('ZR')}${typeTag('Schema')}<span style="margin-left: auto; font-size: 14px; font-weight: 700; color: #6A3FE0">§ 839 BGB</span></div>
      <div class="d" style="font-size: 28px; line-height: 1.15; font-weight: 700; letter-spacing: -0.02em">Amtshaftungsanspruch</div>
      <div style="display: flex; flex-direction: column">${POINTS.map(pointRow).join('')}</div>`,
  );

const coverFace = (height) =>
  faceBox(
    height,
    `<div style="display: flex; gap: 8px; align-items: center">${areaTag('ZR')}${typeTag('Abdeckung')}<span style="margin-left: auto; font-size: 14px; font-weight: 700; color: #6A3FE0">§ 932 BGB</span></div>
      <div style="flex-grow: 1; border-radius: 20px; background: #FBFAFD; border: 1.5px solid #EFECF5; position: relative; overflow: hidden">
        <div style="position: absolute; left: 36px; top: 34px; width: 330px; height: 14px; border-radius: 7px; background: #E4DDF7"></div>
        <div style="position: absolute; left: 36px; top: 62px; width: 520px; height: 10px; border-radius: 5px; background: #EFECF5"></div>
        <div style="position: absolute; left: 36px; top: 84px; width: 470px; height: 10px; border-radius: 5px; background: #EFECF5"></div>
        <div style="position: absolute; left: 36px; top: 118px; width: 250px; height: 54px; border-radius: 12px; background: #17141F"></div>
        <div style="position: absolute; left: 304px; top: 118px; width: 250px; height: 54px; border-radius: 12px; background: #6A3FE0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 800; font-size: 20px">2 ?</div>
        <div style="position: absolute; left: 36px; top: 196px; width: 320px; height: 54px; border-radius: 12px; background: #17141F"></div>
        <div style="position: absolute; left: 36px; top: 276px; width: 500px; height: 10px; border-radius: 5px; background: #EFECF5"></div>
        <div style="position: absolute; left: 36px; top: 298px; width: 380px; height: 10px; border-radius: 5px; background: #EFECF5"></div>
        <span style="position: absolute; left: 16px; bottom: 14px; height: 26px; padding: 0 10px; border-radius: 13px; background: #FFFFFF; box-shadow: 0 0 0 1px #EFECF5; font-size: 12px; font-weight: 700; color: #4B2AA8; display: flex; align-items: center; gap: 6px">${icon('file', 14, 2.2)}PDF · Skript Sachenrecht S. 14</span>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #6B6678; display: flex; align-items: center; gap: 8px">Feld 2 gefragt · Klicken deckt auf</div>`,
  );

const panelStats = (
  counts,
) => `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px">
        ${[
          ['Nochmal', 'background: #FFFFFF; border: 1.5px solid #DCD6EA; color: #17141F'],
          ['Schwer', 'background: #EEE8FD; color: #2E1A73'],
          ['Gut', 'background: #C9B8F7; color: #17141F'],
          ['Leicht', 'background: #6A3FE0; color: #FFFFFF'],
        ]
          .map(
            ([name, style], i) =>
              `<div style="height: 64px; border-radius: 16px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; ${style}"><span class="d" style="font-size: 22px; font-weight: 750; line-height: 1">${counts[i]}</span><span style="font-size: 11px; font-weight: 700">${name}</span></div>`,
          )
          .join('')}
      </div>`;

const SHORTCUTS = [
  [kbdOnSurface('Leertaste'), 'Umdrehen'],
  [[1, 2, 3, 4].map(kbdOnSurface).join(' '), 'Bewerten'],
  [[kbdOnSurface('←'), kbdOnSurface('→')].join(' '), 'Nochmal, Gut'],
  [[kbdOnSurface('Strg'), kbdOnSurface('Z')].join(' '), 'Zurücknehmen'],
  [kbdOnSurface('Esc'), 'Beenden'],
];

const panel = (
  counts,
  open,
  undoable,
) => `<aside style="width: ${PANEL_W}px; flex-shrink: 0; box-sizing: border-box; border-radius: 28px; background: #FFFFFF; padding: 24px; display: flex; flex-direction: column; gap: 20px">
      <div style="display: flex; flex-direction: column; gap: 12px">
        ${label('Diese Runde')}
        ${panelStats(counts)}
        <span style="font-size: 14px; color: #6B6678; font-weight: 500">${open}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #EFECF5; padding-top: 18px">
        ${label('Kürzel')}
        <div style="display: flex; flex-direction: column; margin-top: 6px">
          ${SHORTCUTS.map(([keys, text]) => `<div style="display: flex; align-items: center; gap: 12px; min-height: 40px"><span style="width: 128px; flex-shrink: 0; display: flex; gap: 4px; flex-wrap: wrap">${keys}</span><span style="font-size: 14.5px; font-weight: 600">${text}</span></div>`).join('')}
        </div>
      </div>
      <span class="tap ${undoable ? 'hv-card' : ''}" style="height: 48px; border-radius: 16px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 700; color: ${undoable ? '#17141F' : '#726E7A'}">${icon('undo', 18)}Zurücknehmen</span>
    </aside>`;

const stage = (w, h, { cardH, face, counter, pct, action, counts, open, undoable }) =>
  `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #F6F4FB; display: flex; align-items: center; justify-content: center; overflow: hidden">
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start; height: ${STAGE_H}px">
    <div style="width: ${CARD_W}px; display: flex; flex-direction: column; gap: 20px">
      ${topRow(counter, pct)}
      <div style="height: ${cardH + 44}px">${cardStack(cardH, face(cardH))}</div>
      ${action}
    </div>
    <div style="padding-top: 0">${panel(counts, open, undoable)}</div>
  </div>
</div>`;

const frage = (w, h) =>
  stage(w, h, {
    cardH: 560,
    face: front,
    counter: '1/4',
    pct: 0,
    action: flipButton(),
    counts: [0, 0, 0, 0],
    open: '4 Karten offen',
    undoable: false,
  });

const antwort = (w, h) =>
  stage(w, h, {
    cardH: 560,
    face: back,
    counter: '3/4',
    pct: 50,
    action: ratingBar(),
    counts: [1, 0, 1, 0],
    open: '2 Karten offen',
    undoable: true,
  });

const schema = (w, h) =>
  stage(w, h, {
    cardH: 600,
    face: schemaFace,
    counter: '2/4',
    pct: 25,
    action: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px"><span class="tap hv-ink" style="height: 64px; border-radius: 20px; background: #17141F; color: #FFFFFF; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 12px">Nächster Punkt${kbd('Leertaste', 'dark')}</span><span class="tap hv-outline" style="height: 64px; border-radius: 20px; border: 1.5px solid #DCD6EA; box-sizing: border-box; background: #FFFFFF; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center">Alle zeigen</span></div>`,
    counts: [0, 1, 0, 0],
    open: '3 Karten offen',
    undoable: true,
  });

const abdeckung = (w, h) =>
  stage(w, h, {
    cardH: 580,
    face: coverFace,
    counter: '4/4',
    pct: 75,
    action: `<span class="tap hv-ink" style="height: 64px; border-radius: 20px; background: #17141F; color: #FFFFFF; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 12px">Feld 2 aufdecken${kbd('Leertaste', 'dark')}</span>`,
    counts: [1, 1, 1, 0],
    open: '1 Karte offen',
    undoable: true,
  });

const stat = (n, name, style) =>
  `<div style="height: 88px; border-radius: 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; ${style}"><span class="d" style="font-size: 28px; font-weight: 750; line-height: 1">${n}</span><span style="font-size: 13px; font-weight: 700">${name}</span></div>`;

/** „Geschafft.“ wie Lernen.dc.html, im Fenster mittig; Bilanz in einer Zeile. */
const fertig = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; overflow: hidden">
  <div style="position: relative; width: 170px; height: 170px">
    <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true"><circle cx="85" cy="85" r="74" fill="none" stroke="#EEE8FD" stroke-width="12"></circle><circle cx="85" cy="85" r="74" fill="none" stroke="#6A3FE0" stroke-width="12" stroke-linecap="round" stroke-dasharray="465" stroke-dashoffset="0" transform="rotate(-90 85 85)"></circle></svg>
    <div style="position: absolute; left: 45px; top: 45px; width: 80px; height: 80px; border-radius: 40px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; justify-content: center">${icon('check', 40, 2.6)}</div>
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center">
    <h1 class="d" style="margin: 0; font-size: 56px; font-weight: 750; letter-spacing: -0.03em">Geschafft.</h1>
    <p style="margin: 0; font-size: 18px; color: #6B6678; line-height: 1.45">4 Karten in dieser Runde. Morgen kommen 9 dazu.</p>
  </div>
  <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; width: 560px">
    ${stat(1, 'Nochmal', 'background: #FFFFFF; border: 1.5px solid #DCD6EA; color: #17141F')}${stat(1, 'Schwer', 'background: #EEE8FD; color: #2E1A73')}${stat(1, 'Gut', 'background: #C9B8F7; color: #17141F')}${stat(1, 'Leicht', 'background: #6A3FE0; color: #FFFFFF')}
  </div>
  <div style="display: flex; flex-direction: column; gap: 10px; width: 560px">
    <a href="DesktopHeute.dc.html" class="tap hv-primary" style="height: 64px; border-radius: 20px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; box-shadow: 0 14px 30px -14px rgba(106,63,224,.6)">Zurück zu Heute</a>
    <span class="tap hv-card" style="height: 52px; border-radius: 18px; background: #F6F4FB; color: #17141F; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700">2 Karten noch einmal lernen</span>
  </div>
</div>`;

export const boards = [
  { name: 'DesktopLernenFrage', title: 'Desktop: Lernen, Vorderseite', build: frage },
  { name: 'DesktopLernenAntwort', title: 'Desktop: Lernen, Bewertung', build: antwort },
  { name: 'DesktopLernenSchema', title: 'Desktop: Lernen, Schema', build: schema },
  { name: 'DesktopLernenAbdeckung', title: 'Desktop: Lernen, Abdeckung', build: abdeckung },
  { name: 'DesktopFertig', title: 'Desktop: Geschafft', build: fertig },
];
