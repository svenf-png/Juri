/*
 * Desktop-Artboards: Heute und Stapel. Beispieldaten wie in den Designs (iPadHeute.dc.html,
 * iPadStapel.dc.html), damit der Bildvergleich später App und Board gegenüberstellen kann.
 */
import { icon, kbd, label, labelHeute, shell, sidebar } from './kit.mjs';

const accent = '#6A3FE0';
const ladder = ['', '#EEE8FD', '#C9B8F7', '#9A7BEF', accent];

const segments = (filled, total = 24) =>
  Array.from(
    { length: total },
    (_, i) =>
      `<div style="height: 12px; border-radius: 4px; background: ${i < filled ? accent : '#EEE8FD'}"></div>`,
  ).join('');

const days = () => {
  const labels = ['Di', 'Mi', 'Do', 'Fr', 'Sa', 'So', 'Mo'];
  const level = [3, 4, 0, 2, 3, 1, 2];
  return labels
    .map((l, i) => {
      const lv = level[i];
      let dot = 'width: 44px; height: 44px; border-radius: 22px; box-sizing: border-box; ';
      dot += lv === 0 ? 'border: 2px dashed #D6D1E2;' : `background: ${ladder[lv]};`;
      if (i === 1) dot += ' box-shadow: 0 0 0 3px #FFFFFF, 0 0 0 5px #17141F;';
      return `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px"><div style="${dot}"></div><div style="font-size: 12.5px; font-weight: 600; color: ${i === 6 ? '#17141F' : '#6B6678'}">${l}</div></div>`;
    })
    .join('');
};

const areaTile = (
  code,
  name,
  due,
) => `<a href="DesktopStapel.dc.html" class="tap hv-card" style="border-radius: 20px; background: #F6F4FB; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; color: #17141F">
      <span style="display: flex; align-items: center; justify-content: space-between">
        <span style="width: 40px; height: 30px; border-radius: 10px; background: #FFFFFF; color: #4B2AA8; font-size: 12.5px; font-weight: 800; display: flex; align-items: center; justify-content: center">${code}</span>
        <span style="color: #B3AEC0">${icon('chevron', 18, 2.2, '#B3AEC0')}</span>
      </span>
      <span style="margin-top: auto; display: flex; flex-direction: column; gap: 2px">
        <span style="font-size: 17px; font-weight: 600">${name}</span>
        <span style="display: flex; align-items: baseline; gap: 8px"><span class="d" style="font-size: 40px; line-height: 1.05; font-weight: 780; letter-spacing: -0.03em; color: #6A3FE0">${due}</span><span style="font-size: 14px; font-weight: 600; color: #6B6678">fällig</span></span>
      </span>
    </a>`;

const heute = (w, h) =>
  shell(
    w,
    h,
    'heute',
    `<div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px">
    <div style="display: flex; flex-direction: column; gap: 26px; min-width: 0">
      <div style="font-size: 16px; font-weight: 500; color: #6B6678">Montag, 28. September</div>
      <h1 class="d" style="margin: 0; font-size: 72px; line-height: .98; letter-spacing: -0.035em; font-weight: 780"><span style="color: #6A3FE0">18 Karten</span><br>warten heute.</h1>
      <a href="DesktopFristen.dc.html" class="tap hv-card" style="align-self: flex-start; height: 38px; padding: 0 16px 0 12px; border-radius: 19px; background: #F6F4FB; color: #17141F; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600">${icon('calendar', 18, 2, accent)}Klausur Zivilrecht <strong style="color: #6A3FE0">in 11 Tagen</strong></a>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <div style="display: flex; justify-content: space-between; font-size: 15px"><span style="color: #6B6678; font-weight: 500">Tagesziel</span><span style="font-weight: 700">6 <span style="color: #6B6678; font-weight: 500">von 24</span></span></div>
        <div style="display: grid; grid-template-columns: repeat(24, minmax(0, 1fr)); gap: 4px">${segments(6)}</div>
      </div>
      <a href="DesktopLernenFrage.dc.html" class="tap hv-primary" style="height: 68px; border-radius: 22px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; padding: 0 26px 0 28px; font-size: 20px; font-weight: 700; box-shadow: 0 14px 30px -14px rgba(106,63,224,.6)"><span>Lernen starten</span>${icon('arrowRight', 24, 2.2)}</a>
    </div>
    <div style="display: flex; flex-direction: column; gap: 26px; padding-top: 38px; min-width: 0">
      <div style="display: flex; flex-direction: column; gap: 10px">
        ${labelHeute('Nächste Fristen')}
        <div style="border-radius: 20px; background: #6A3FE0; color: #FFFFFF; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center">
          <span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">Klausur Zivilrecht</span><span style="font-size: 13px; opacity: .9">Fr, 9.10. · 64 % sitzen sicher</span></span>
          <span class="d" style="font-size: 32px; font-weight: 800; letter-spacing: -0.03em">11 T</span>
        </div>
        <div style="border-radius: 20px; border: 1.5px solid #EFECF5; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center">
          <span style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px; font-weight: 700">LL.M. Modul Vertragsrecht</span><span style="font-size: 13px; color: #6B6678">Fr, 15.1.2027</span></span>
          <span class="d" style="font-size: 26px; font-weight: 800; letter-spacing: -0.03em">109 T</span>
        </div>
      </div>
      <a href="DesktopHighFive.dc.html" class="tap hv-card" style="min-height: 64px; border-radius: 20px; background: #F6F4FB; padding: 0 18px; display: flex; align-items: center; gap: 12px; color: #17141F">
        <span style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 20px; background: #FFFFFF; color: #6A3FE0; display: flex; align-items: center; justify-content: center">${icon('hand', 22, 1.9)}</span>
        <span style="flex-grow: 1; font-size: 15px; font-weight: 600"><strong>Mara</strong> hat 12 Tage in Folge geschafft</span>
        <span style="font-size: 14px; font-weight: 700; color: #6A3FE0">High five</span>
      </a>
    </div>
  </div>
  <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; margin-top: 44px">
    <div style="display: flex; flex-direction: column; gap: 12px; min-width: 0">
      ${labelHeute('Fällig nach Rechtsgebiet')}
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px">
        ${areaTile('ZR', 'Zivilrecht', 8)}${areaTile('SR', 'Strafrecht', 6)}${areaTile('ÖR', 'Öffentliches Recht', 6)}
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 12px; min-width: 0">
      <div style="display: flex; justify-content: space-between; align-items: center">
        ${labelHeute('Letzte 7 Tage')}
        <span style="height: 24px; padding: 0 10px; border-radius: 12px; background: #EEE8FD; color: #4B2AA8; font-size: 13px; font-weight: 700; display: flex; align-items: center">+3 Karten angelegt</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; padding-top: 10px">${days()}</div>
    </div>
  </div>`,
  );

/* Stapel */
const STACKS = [
  [
    'Zivilrecht',
    [
      ['Deliktsrecht', '48 Karten', 3],
      ['ZPO: Versäumnisurteil', '32 Karten', 3],
      ['Amtshaftung', '21 Karten · auch ÖR', 2, true],
    ],
  ],
  [
    'Strafrecht',
    [
      ['Diebstahl & Betrug', '40 Karten', 4],
      ['StPO: Revision', '27 Karten', 2],
    ],
  ],
  [
    'Öffentliches Recht',
    [
      ['Amtshaftung', '21 Karten · auch ZR', 2],
      ['VwGO: Anfechtungsklage', '35 Karten', 4],
    ],
  ],
];

const stackRow = ([name, meta, due, selected]) =>
  `<div class="${selected ? '' : 'hv-row'}" style="min-height: 56px; border-radius: 14px; padding: 8px 10px; box-sizing: border-box; display: flex; align-items: center; gap: 8px; ${selected ? 'background: #F6F4FB; box-shadow: inset 3px 0 0 #6A3FE0' : ''}">
    <span style="flex-grow: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15px; font-weight: 700">${name}</span><span style="font-size: 12.5px; color: #6B6678; font-weight: 500">${meta}</span></span>
    <span style="min-width: 26px; height: 26px; border-radius: 13px; background: #EEE8FD; color: #4B2AA8; font-size: 12.5px; font-weight: 800; display: flex; align-items: center; justify-content: center">${due}</span>
  </div>`;

const CARDS = [
  [
    'Frage',
    'Wer haftet nach Art. 34 S. 1 GG im Außenverhältnis?',
    'Art. 34 S. 1 GG',
    'fällig heute',
    true,
  ],
  ['Schema', 'Amtshaftungsanspruch: Prüfungsaufbau', '§ 839 BGB', 'fällig morgen'],
  ['Lücke', 'Subsidiarität bei Fahrlässigkeit', '§ 839 I 2 BGB', 'fällig in 5 Tagen'],
  ['Abdeckung', 'Übersicht Staatshaftung', 'PDF S. 3', 'überfällig seit 2 Tagen', true],
  ['Frage', 'Wann ist eine Amtspflicht drittbezogen?', '§ 839 BGB', 'Neu, heute dran'],
  [
    'Frage',
    'Folge der schuldhaften Nichteinlegung eines Rechtsmittels?',
    '§ 839 III BGB',
    'Neu, kommt später',
  ],
];

const cardRow = ([type, front, norm, due, hot]) =>
  `<div class="hv-row" style="display: grid; grid-template-columns: 96px minmax(0, 1fr) 150px 170px; align-items: center; gap: 16px; min-height: 60px; padding: 0 12px; border-radius: 12px; border-bottom: 1px solid #EFECF5">
    <span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6A3FE0">${type}</span>
    <span style="font-size: 16px; font-weight: 650; line-height: 1.3">${front}</span>
    <span style="font-size: 13.5px; font-weight: 600; color: #6B6678">${norm}</span>
    <span style="font-size: 13.5px; font-weight: 600; ${hot ? 'color: #4B2AA8' : 'color: #6B6678'}">${due}</span>
  </div>`;

/** Stapel: Liste neben der Sidebar, rechts die Karten als Tabelle; der Inhalt rechts wird gedeckelt. */
const stapel = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: flex; overflow: hidden">
  ${sidebar('stapel')}
  <section style="width: 340px; flex-shrink: 0; box-sizing: border-box; border-right: 1px solid #EFECF5; padding: 34px 20px 20px 20px; display: flex; flex-direction: column; gap: 16px">
    <div style="display: flex; align-items: baseline; justify-content: space-between">
      <h1 class="d" style="margin: 0; font-size: 34px; font-weight: 750; letter-spacing: -0.03em">Stapel</h1>
      <a href="#" style="font-size: 14px; font-weight: 700; color: #5B34D1">+ Stapel</a>
    </div>
    <label style="height: 42px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; color: #6B6678">${icon('search', 16)}<span style="flex-grow: 1; font-size: 15px; color: #726E7A">Karten, Normen, Tags</span>${kbd('/')}</label>
    <div style="display: flex; gap: 6px">
      <span style="height: 38px; padding: 0 16px; border-radius: 19px; background: #6A3FE0; color: #FFFFFF; font-size: 14px; font-weight: 700; display: flex; align-items: center">Alle</span>
      ${['ZR', 'SR', 'ÖR'].map((c) => `<span class="hv-outline" style="height: 38px; padding: 0 16px; border-radius: 19px; border: 1.5px solid #EFECF5; box-sizing: border-box; font-size: 14px; font-weight: 700; display: flex; align-items: center">${c}</span>`).join('')}
      <span class="hv-outline" style="width: 38px; height: 38px; border-radius: 19px; border: 1.5px solid #EFECF5; box-sizing: border-box; display: flex; align-items: center; justify-content: center">${icon('pencil', 16)}</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px; overflow: hidden">
      ${STACKS.map(([name, rows]) => `<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; font-weight: 800; color: #6B6678; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px">${name}</span>${rows.map(stackRow).join('')}</div>`).join('')}
    </div>
  </section>
  <main style="flex: 1 1 0; min-width: 0; display: flex; justify-content: center">
    <div style="width: 100%; max-width: 1100px; box-sizing: border-box; padding: 34px 48px; display: flex; flex-direction: column; gap: 20px">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px">
        <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
          <h2 class="d" style="margin: 0; font-size: 40px; font-weight: 750; letter-spacing: -0.03em">Amtshaftung</h2>
          <span style="font-size: 15px; color: #6B6678">§ 839 BGB i. V. m. Art. 34 GG · von Mara · 21 Karten</span>
        </div>
        <div style="display: flex; gap: 10px; flex-shrink: 0">
          <a href="DesktopTeilen.dc.html" aria-label="Stapel teilen" class="tap hv-card" style="width: 48px; height: 48px; border-radius: 16px; background: #F6F4FB; color: #17141F; display: flex; align-items: center; justify-content: center">${icon('share')}</a>
          <a href="DesktopLernenFrage.dc.html" class="tap hv-primary" style="height: 48px; padding: 0 22px; border-radius: 16px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; font-size: 16px; font-weight: 700">2 fällige lernen</a>
        </div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <span style="height: 34px; padding: 0 14px; border-radius: 17px; background: #17141F; color: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">Zivilrecht</span>
        <span style="height: 34px; padding: 0 14px; border-radius: 17px; background: #17141F; color: #FFFFFF; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">Öffentliches Recht</span>
        <span style="height: 34px; padding: 0 14px; border-radius: 17px; border: 1.5px dashed #CFC8E0; box-sizing: border-box; color: #6B6678; font-size: 13.5px; font-weight: 700; display: flex; align-items: center">+ Rechtsgebiet</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <div style="display: flex; height: 12px; gap: 3px"><span style="width: 48%; background: #6A3FE0; border-radius: 6px"></span><span style="width: 33%; background: #C9B8F7; border-radius: 6px"></span><span style="width: 19%; background: #EEE8FD; border-radius: 6px"></span></div>
        <div style="display: flex; gap: 18px; font-size: 13px; font-weight: 600; color: #6B6678"><span>sicher</span><span>im Lernen</span><span>neu</span></div>
      </div>
      <div style="display: flex; flex-direction: column; margin: 4px -12px 0">
        <div style="display: grid; grid-template-columns: 96px minmax(0, 1fr) 150px 170px; gap: 16px; height: 34px; align-items: center; padding: 0 12px; border-bottom: 1.5px solid #EFECF5">
          ${label('Typ')}${label('Karte')}${label('Norm')}${label('Fällig')}
        </div>
        ${CARDS.map(cardRow).join('')}
      </div>
    </div>
  </main>
</div>`;

export const boards = [
  { name: 'DesktopHeute', title: 'Desktop: Heute', build: heute },
  { name: 'DesktopStapel', title: 'Desktop: Stapel', build: stapel },
];
