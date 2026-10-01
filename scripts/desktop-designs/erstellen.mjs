/*
 * Desktop-Artboards: Erstellen, PDF neben dem Formular, Felder aufziehen (Abdeckung) und der
 * Schema-Editor. Alle stehen im Vollbild ohne Sidebar (wie auf dem iPhone und dem iPad), mit
 * Kopfzeile, zwei Spalten und, wo es speichert, einer Fußleiste.
 */
import {
  DESKTOP,
  areaTag,
  backLink,
  ghostButton,
  icon,
  kbd,
  label,
  miniField,
  primaryButton,
  segmented,
  textField,
  typeTabs,
  typeTag,
} from './kit.mjs';

const chip = (text) =>
  `<span style="height: 30px; padding: 0 12px; border-radius: 15px; background: #EEE8FD; color: #4B2AA8; font-size: 13px; font-weight: 700; display: flex; align-items: center">${text}</span>`;

/** Rahmen eines Vollbild-Ablaufs: Kopfzeile, Inhalt, optional Fußleiste; Inhalt mittig gedeckelt. */
const fullscreen = (
  w,
  h,
  { left = '', center = '', right = '', body, foot = '' },
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: flex; flex-direction: column; overflow: hidden">
  <div style="flex-shrink: 0; display: flex; justify-content: center">
    <div style="width: 100%; max-width: ${DESKTOP.maxContent}px; box-sizing: border-box; height: 72px; padding: 0 ${DESKTOP.padX}px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center"><div style="justify-self: start">${left}</div><div>${center}</div><div style="justify-self: end">${right}</div></div>
  </div>
  <div style="flex: 1 1 0; min-height: 0; display: flex; justify-content: center">
    <div style="width: 100%; max-width: ${DESKTOP.maxContent}px; box-sizing: border-box; padding: 8px ${DESKTOP.padX}px 0">${body}</div>
  </div>
  ${foot ? `<div style="flex-shrink: 0; border-top: 1px solid #EFECF5; display: flex; justify-content: center"><div style="width: 100%; max-width: ${DESKTOP.maxContent}px; box-sizing: border-box; height: 87px; padding: 0 ${DESKTOP.padX}px; display: flex; align-items: center; justify-content: space-between; gap: 24px">${foot}</div></div>` : ''}
</div>`;

const title = (text) =>
  `<h1 class="d" style="margin: 0; font-size: 22px; font-weight: 750; letter-spacing: -0.02em">${text}</h1>`;

const progress = (done, goal, text) => `<div style="display: flex; align-items: center; gap: 14px">
    <div style="width: 280px; height: 8px; border-radius: 4px; background: #EEE8FD; overflow: hidden"><div style="width: ${Math.round((done / goal) * 100)}%; height: 8px; border-radius: 4px; background: #6A3FE0"></div></div>
    <span style="font-size: 14px; color: #6B6678; font-weight: 500">${text}</span>
  </div>`;

const saveButtons = (nextLabel) => `<div style="display: flex; gap: 12px">
    ${ghostButton('Speichern', { h: 56 })}
    ${primaryButton(nextLabel, { h: 56, kb: 'Strg ↵' })}
  </div>`;

const toolButton = (ic, text) =>
  `<span class="tap hv-outline" style="flex: 1 1 0; height: 52px; border-radius: 16px; border: 1.5px solid #EFECF5; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 15px; font-weight: 700"><span style="color: #6A3FE0; display: flex">${icon(ic, 18)}</span>${text}</span>`;

const previewCard = (face) =>
  `<div style="height: 380px; box-sizing: border-box; border-radius: 32px; background: #FFFFFF; box-shadow: 0 30px 60px -36px rgba(46,26,115,.4); padding: 28px; display: flex; flex-direction: column; gap: 18px; border: 1px solid #F3F1F8">${face}</div>`;

const previewFront = `<div style="display: flex; gap: 8px; align-items: center">${areaTag('SR')}${typeTag('Frage')}<span style="margin-left: auto; font-size: 13px; font-weight: 700; color: #6A3FE0">§ 242 StGB</span></div>
      <div style="flex-grow: 1; display: flex; align-items: center"><div class="d" style="font-size: 30px; line-height: 1.18; font-weight: 700; letter-spacing: -0.02em; text-wrap: balance">Was versteht man unter Gewahrsam?</div></div>
      <div style="font-size: 13px; font-weight: 600; color: #6B6678; display: flex; align-items: center; gap: 8px">${icon('flip', 16)}Klicken zum Umdrehen</div>`;

/** Erstellen: Formular links, so sieht es später beim Lernen aus rechts. */
const erstellen = (w, h) =>
  fullscreen(w, h, {
    left: backLink('Schließen', 'DesktopHeute.dc.html', { selfStart: false }),
    center: title('Neue Karte'),
    right: chip('3 von 5 heute'),
    body: `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 460px; gap: 56px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 16px; min-width: 0">
        ${typeTabs(['Frage', 'Lücke', 'Schema', 'Abdeckung'], 0)}
        ${textField('Vorderseite', 'Was versteht man unter Gewahrsam?', { rows: 1, h: 132 })}
        ${textField('Rückseite', 'Die von einem Herrschaftswillen getragene tatsächliche Sachherrschaft eines Menschen über eine Sache.', { rows: 1, h: 168, lh: 1.45 })}
        <div style="display: flex; gap: 12px">${toolButton('file', 'PDF')}${toolButton('image', 'Foto / Bild')}</div>
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
          ${miniField('Norm', '§ 242 StGB')}${miniField('Stapel', 'Diebstahl &amp; Betrug · SR')}${miniField('Tags', '#Klausur')}
        </div>
        ${textField('Notiz', '', { placeholder: 'Eigene Notiz, erscheint beim Lernen unter der Antwort', h: 102 })}
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px; padding-top: 4px; min-width: 0">
        <div style="display: flex; align-items: center; justify-content: space-between">${label('Vorschau')}${segmented(['Vorderseite', 'Rückseite'], 0, { h: 36, size: 13, w: '210px' })}</div>
        ${previewCard(previewFront)}
        <span style="font-size: 13px; color: #6B6678; line-height: 1.4">So erscheint die Karte beim Lernen. Die Rückseite zeigst du mit dem Umschalter.</span>
      </div>
    </div>`,
    foot: `${progress(3, 5, '3 von 5 heute')}${saveButtons('Speichern &amp; nächste')}`,
  });

/* PDF neben dem Formular */
const pageLine = (width) =>
  `<span style="width: ${width}; height: 8px; border-radius: 4px; background: #E6E2EE; flex-shrink: 0"></span>`;
const pageGap = (height) => `<span style="height: ${height}px; flex-shrink: 0"></span>`;

/* Beispielseite wie die Vorschau der App (AbdeckungVorschau, Seite der iPad-Ansicht). */
const pageText = (
  extra = '',
) => `<div style="position: absolute; inset: 0; box-sizing: border-box; padding: 40px 44px; display: flex; flex-direction: column; gap: 11px; overflow: hidden">
      <span style="font-size: 12px; color: #8E8A99; font-weight: 600">§ 5 Gutgläubiger Erwerb beweglicher Sachen</span>
      <span style="width: 70%; height: 12px; border-radius: 4px; background: #CFCAD9; margin-top: 6px; flex-shrink: 0"></span>
      ${pageGap(4)}${pageLine('100%')}${pageLine('96%')}${pageLine('91%')}${pageGap(6)}
      <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #17141F; font-family: Georgia, 'Times New Roman', serif"><span style="background: rgba(106,63,224,.18); box-shadow: 0 0 0 2px rgba(106,63,224,.18); border-radius: 2px">Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.</span> (§ 932 II BGB)</p>
      ${pageGap(6)}${pageLine('100%')}${pageLine('94%')}${pageLine('98%')}${pageLine('60%')}${pageGap(8)}${pageLine('100%')}${pageLine('88%')}
      ${extra}
    </div>`;

const popup = `<div style="position: absolute; left: 88px; top: 150px; border-radius: 14px; background: #17141F; color: #FFFFFF; padding: 4px; display: flex; gap: 2px; box-shadow: 0 12px 28px -12px rgba(0,0,0,.5)"><span style="height: 38px; padding: 0 12px; border-radius: 10px; background: #6A3FE0; display: flex; align-items: center; font-size: 13.5px; font-weight: 700">Als Antwort</span><span style="height: 38px; padding: 0 12px; display: flex; align-items: center; font-size: 13.5px; font-weight: 700">Als Frage</span><span style="height: 38px; padding: 0 12px; display: flex; align-items: center; font-size: 13.5px; font-weight: 700">Als Lücke</span></div>`;

const pagerButton = (ic) =>
  `<span class="tap hv-outline" style="width: 44px; height: 44px; border-radius: 22px; border: 1.5px solid #DCD6EA; box-sizing: border-box; background: #FFFFFF; display: flex; align-items: center; justify-content: center">${icon(ic, 22, 2.2)}</span>`;

const pdfPane = `<div style="display: flex; flex-direction: column; height: 100%; min-width: 0; background: #FBFAFD; border-right: 1px solid #F3F1F8; box-sizing: border-box; padding: 0 32px 24px">
    <div style="height: 72px; flex-shrink: 0; display: flex; align-items: center; gap: 16px">
      <a href="DesktopHeute.dc.html" style="position: relative; height: 44px; margin-left: -10px; display: flex; align-items: center; gap: 2px; font-size: 16px; font-weight: 600; flex-shrink: 0">${icon('back', 24, 2.2)}Schließen</a>
      <span style="flex: 1; min-width: 0; text-align: center; font-size: 14.5px; font-weight: 700">Skript Sachenrecht.pdf<span style="color: #6B6678; font-weight: 600"> · S. 14 / 62</span></span>
      <span style="display: flex; gap: 4px; padding: 3px; border-radius: 14px; background: #FFFFFF; box-shadow: 0 0 0 1px #EFECF5; flex-shrink: 0"><span style="height: 34px; padding: 0 16px; border-radius: 11px; background: #17141F; color: #FFFFFF; font-size: 14px; font-weight: 700; display: flex; align-items: center">Text</span><span style="height: 34px; padding: 0 16px; border-radius: 11px; color: #6B6678; font-size: 14px; font-weight: 700; display: flex; align-items: center">Abdecken</span></span>
    </div>
    <div style="position: relative; flex: 1 1 0; min-height: 0; border-radius: 20px; background: #FFFFFF; box-shadow: 0 24px 48px -28px rgba(46,26,115,.35); overflow: hidden">${pageText(popup)}</div>
    <div style="height: 64px; flex-shrink: 0; box-sizing: border-box; padding-top: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px">
      <span style="font-size: 13px; color: #6B6678; font-weight: 500; display: flex; align-items: center; gap: 4px">Text mit der Maus markieren<span style="display: inline-flex; align-items: center; gap: 4px"> · Zoom ${kbd('+')} ${kbd('−')} ${kbd('0')}</span></span>
      <span style="display: flex; align-items: center; gap: 6px">${pagerButton('back')}<span style="width: 104px; height: 44px; border-radius: 22px; border: 1.5px solid #DCD6EA; box-sizing: border-box; background: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700">S. 14 / 62</span>${pagerButton('chevron')}</span>
    </div>
  </div>`;

const erstellenPdf = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: grid; grid-template-columns: 53.4884% 1fr; overflow: hidden">
  ${pdfPane}
  <div style="display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; padding: 0 48px 0 40px">
    <div style="height: 72px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between">${title('Neue Karte')}${chip('3 von 5 heute')}</div>
    <div style="flex: 1 1 0; display: flex; flex-direction: column; gap: 16px; padding-top: 8px">
      ${typeTabs(['Frage', 'Lücke', 'Schema', 'Abdeckung'], 0)}
      ${textField('Vorderseite', 'Wann ist der Erwerber nach § 932 II BGB nicht in gutem Glauben?', { rows: 1, h: 120 })}
      ${textField('Rückseite', 'Wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.', { rows: 1, h: 150, lh: 1.45, badge: '<span style="height: 24px; padding: 0 9px; border-radius: 12px; background: #FFFFFF; color: #4B2AA8; font-size: 12px; font-weight: 700; display: flex; align-items: center; text-transform: none; letter-spacing: 0">aus PDF übernommen</span>' })}
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
        ${miniField('Norm', '§ 932 II BGB', { input: true })}${miniField('Stapel', 'Sachenrecht · ZR')}${miniField('Quelle', 'PDF S. 14', { link: true })}
      </div>
    </div>
    <div style="flex-shrink: 0; height: 120px; display: flex; flex-direction: column; justify-content: center; gap: 14px">
      ${progress(3, 5, 'noch 2 bis zum Tagesziel')}
      <div style="display: flex; gap: 12px">${ghostButton('Speichern', { h: 56 })}${primaryButton('Speichern &amp; nächste aus PDF', { h: 56, grow: true, kb: 'Strg ↵' })}</div>
    </div>
  </div>
</div>`;

/* Felder aufziehen: Seite und Felder in Prozent der Fläche (640 x 460), Aussehen wie CoverSurface. */
const pct = (v, total) => `${(v / total) * 100}%`;
const maskBox = (n, x, y, bw, bh, selected) =>
  `<div style="position: absolute; left: ${pct(x, 640)}; top: ${pct(y, 460)}; width: ${pct(bw, 640)}; height: ${pct(bh, 460)}; box-sizing: border-box; border-radius: 8px; background: ${selected ? '#6A3FE0' : '#C9B8F7'}; color: ${selected ? '#FFFFFF' : '#2E1A73'}; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; ${selected ? 'box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #17141F' : 'overflow: hidden'}">${n}${
    selected
      ? [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ]
          .map(
            ([hx, hy]) =>
              `<span style="position: absolute; left: ${hx * 100}%; top: ${hy * 100}%; width: 14px; height: 14px; margin: -7px 0 0 -7px; box-sizing: border-box; border-radius: 7px; background: #FFFFFF; border: 2px solid #6A3FE0"></span>`,
          )
          .join('')
      : ''
  }</div>`;

const pageBar = (x, y, bw, bh, color) =>
  `<div style="position: absolute; left: ${pct(x, 640)}; top: ${pct(y, 460)}; width: ${pct(bw, 640)}; height: ${pct(bh, 460)}; border-radius: 7px; background: ${color}"></div>`;

const FIELDS = ['Feld 1', 'Feld 2', 'Feld 3'];

const abdeckungEditor = (w, h) =>
  fullscreen(w, h, {
    left: backLink('Zurück', '#', { selfStart: false }),
    center: title('Felder'),
    right: `<span class="tap hv-primary" style="height: 44px; padding: 0 22px; border-radius: 22px; background: #6A3FE0; color: #FFFFFF; font-size: 15px; font-weight: 700; display: flex; align-items: center">Fertig</span>`,
    body: `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 40px; height: 100%; padding-bottom: 32px; box-sizing: border-box">
      <div style="display: flex; flex-direction: column; gap: 14px; min-width: 0; min-height: 0">
        <div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 14px; font-weight: 500; color: #6B6678">Felder über Begriffe aufziehen.</span><span style="display: flex; align-items: center; gap: 8px"><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; opacity: .45; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">−</span><span style="min-width: 56px; text-align: center; font-size: 14px; font-weight: 700">100 %</span><span style="width: 36px; height: 36px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600">+</span></span></div>
        <div style="flex: 1 1 0; min-height: 0; border-radius: 24px; background: #F6F4FB; display: flex; align-items: center; justify-content: center; overflow: hidden">
          <div style="position: relative; flex-shrink: 0; width: 100%; aspect-ratio: 640 / 460; background: #FFFFFF; overflow: hidden">
            ${pageBar(36, 34, 280, 14, '#DCD6EA')}
            ${pageBar(36, 70, 560, 10, '#E4DDF7')}
            ${pageBar(36, 92, 500, 10, '#E4DDF7')}
            ${pageBar(36, 114, 540, 10, '#E4DDF7')}
            ${maskBox(1, 36, 160, 190, 44, false)}
            ${maskBox(2, 250, 160, 150, 44, true)}
            ${maskBox(3, 36, 240, 250, 44, false)}
            ${pageBar(36, 322, 520, 10, '#E4DDF7')}
            ${pageBar(36, 344, 430, 10, '#E4DDF7')}
          </div>
        </div>
      </div>
      <aside style="display: flex; flex-direction: column; gap: 18px; min-width: 0">
        <div style="display: flex; flex-direction: column; gap: 8px">
          ${label('Felder')}
          <div style="display: flex; flex-direction: column; gap: 6px">
            ${FIELDS.map(
              (name, i) =>
                `<div class="${i === 1 ? '' : 'hv-row'}" style="min-height: 56px; border-radius: 16px; box-sizing: border-box; padding: 0 14px; display: flex; align-items: center; gap: 12px; ${i === 1 ? 'background: #F6F4FB; box-shadow: inset 0 0 0 2px #6A3FE0' : 'border: 1.5px solid #EFECF5'}"><span style="width: 28px; height: 28px; border-radius: 14px; background: ${i === 1 ? '#6A3FE0' : '#17141F'}; color: #FFFFFF; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center">${i + 1}</span><span style="font-size: 15px; font-weight: 700; flex-grow: 1">${name}</span><span style="font-size: 12.5px; color: #6B6678; font-weight: 500">${i === 1 ? 'gewählt' : ''}</span></div>`,
            ).join('')}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px">
          <span class="tap hv-outline" style="height: 48px; border-radius: 16px; border: 1.5px solid #EFECF5; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14.5px; font-weight: 700">Feld in der Mitte anlegen</span>
          <span class="tap hv-ghost" style="height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14.5px; font-weight: 700; color: #B42318">${icon('trash', 18)}Feld löschen${kbd('Entf')}</span>
        </div>
        <div style="margin-top: auto; border-top: 1px solid #EFECF5; padding-top: 16px; display: flex; flex-direction: column; gap: 4px">
          ${label('Kürzel')}
          ${[
            [`${kbd('Tab')}`, 'Feld wählen'],
            [`${kbd('←')} ${kbd('→')} ${kbd('↑')} ${kbd('↓')}`, 'Verschieben'],
            [`${kbd('Umschalt')} ${kbd('Pfeile')}`, 'Größe ändern'],
            [`${kbd('Strg')} ${kbd('Rad')}`, 'Zoomen'],
          ]
            .map(
              ([keys, text]) =>
                `<div style="display: flex; align-items: center; gap: 12px; min-height: 38px"><span style="width: 140px; flex-shrink: 0; display: flex; gap: 4px">${keys}</span><span style="font-size: 14px; font-weight: 600">${text}</span></div>`,
            )
            .join('')}
        </div>
      </aside>
    </div>`,
  });

/* Schema-Editor */
const ROWS = [
  ['1.', 'Ausübung eines öffentlichen Amtes', '', 0],
  ['2.', 'Verletzung einer drittbezogenen Amtspflicht', '', 0],
  ['a)', 'Amtspflicht', '', 1],
  ['b)', 'Drittbezogenheit', '', 1, true],
  ['3.', 'Verschulden', '', 0],
  ['4.', 'Kausaler Schaden', '', 0],
  ['5.', 'Kein Haftungsausschluss', '§ 839 I 2, III BGB', 0],
];

const schemaRow = ([n, text, norm, level, selected]) =>
  `<div class="${selected ? '' : 'hv-row'}" style="display: flex; align-items: center; gap: 14px; min-height: ${level ? 52 : 56}px; border-bottom: 1px solid #F3F1F8; ${level ? 'padding-left: 36px;' : ''} ${selected ? 'margin: 0 -12px; padding: 0 12px 0 48px; border-radius: 14px; background: #F6F4FB; box-shadow: inset 0 0 0 2px #6A3FE0; border-bottom-color: transparent' : ''}">
    <span style="width: ${level ? 22 : 26}px; font-size: 14px; font-weight: ${level ? 700 : 800}; color: ${level ? '#6B6678' : '#6A3FE0'}">${n}</span>
    <span style="font-size: ${level ? 16.5 : 17.5}px; font-weight: ${level ? 500 : 600}; flex-grow: 1">${text}</span>
    ${selected ? `<span style="height: 28px; padding: 0 10px; border-radius: 14px; background: #6A3FE0; color: #FFFFFF; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 5px">${icon('link', 12, 2.6)}verknüpft</span>` : ''}
    ${norm ? `<span style="font-size: 13px; color: #6B6678">${norm}</span>` : ''}
  </div>`;

const iconButton = (name, aria) =>
  `<span class="tap hv-card" aria-label="${aria}" style="width: 48px; height: 48px; border-radius: 14px; background: #F6F4FB; display: flex; align-items: center; justify-content: center">${icon(name, 20)}</span>`;

const detailField = (name, value, { placeholder = '', h = 0 } = {}) =>
  `<label style="display: flex; flex-direction: column; gap: 6px; border-radius: 16px; background: #F6F4FB; padding: 12px 16px; ${h ? `min-height: ${h}px; box-sizing: border-box;` : ''}"><span style="font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">${name}</span><span style="font-size: 16px; line-height: 1.4; ${value ? 'color: #17141F' : 'color: #726E7A'}">${value || placeholder}</span></label>`;

const schemaEditor = (w, h) =>
  fullscreen(w, h, {
    left: backLink('Zurück', '#', { selfStart: false }),
    center: title('Schema'),
    right: `<span class="tap hv-primary" style="height: 44px; padding: 0 12px 0 20px; border-radius: 22px; background: #6A3FE0; color: #FFFFFF; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px">Sichern${kbd('Strg ↵', 'dark')}</span>`,
    body: `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 460px; gap: 56px; align-items: start">
      <div style="display: flex; flex-direction: column; gap: 6px; min-width: 0">
        <h2 class="d" style="margin: 0; font-size: 32px; font-weight: 750; letter-spacing: -0.03em; line-height: 1.15">Amtshaftungsanspruch</h2>
        <span style="font-size: 15px; color: #6B6678; font-weight: 500">§ 839 BGB i. V. m. Art. 34 GG · ZR, ÖR</span>
        <div style="display: flex; flex-direction: column; border-top: 1px solid #EFECF5; margin-top: 18px">${ROWS.map(schemaRow).join('')}</div>
        <div style="display: flex; gap: 8px; margin-top: 16px">
          <span class="tap hv-card" style="height: 48px; padding: 0 18px; border-radius: 14px; background: #F6F4FB; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700">${icon('plus', 18, 2.2)}Punkt hinzufügen</span>
          ${iconButton('indent', 'Einrücken')}${iconButton('outdent', 'Ausrücken')}
        </div>
      </div>
      <aside style="border-radius: 28px; border: 1.5px solid #EFECF5; box-sizing: border-box; padding: 24px; display: flex; flex-direction: column; gap: 14px; min-width: 0">
        <div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; color: #6A3FE0">PUNKT 2 b)</span><span class="d" style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em">Punkt bearbeiten</span></div>
        ${detailField('Text', 'Drittbezogenheit')}
        ${detailField('Norm', '', { placeholder: '§ 839 BGB' })}
        ${detailField('Inhalt', '', { placeholder: 'Definition oder Prüfungsinhalt. Erscheint beim Lernen unter dem Punkt.', h: 92 })}
        <div style="display: flex; flex-direction: column; gap: 8px">
          ${label('Verknüpfung')}
          <div style="border-radius: 18px; background: #FFFFFF; box-shadow: 0 20px 44px -18px rgba(46,26,115,.45), 0 0 0 1px #EFECF5; padding: 10px; display: flex; flex-direction: column; gap: 6px">
            <label style="height: 42px; border-radius: 12px; background: #F6F4FB; display: flex; align-items: center; gap: 8px; padding: 0 12px; color: #6B6678">${icon('search', 16)}<span style="font-size: 15px; color: #17141F">Drittbezogenheit</span></label>
            <div style="min-height: 50px; border-radius: 12px; background: #EEE8FD; padding: 6px 12px; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15px; font-weight: 700">Drittbezogenheit der Amtspflicht</span><span style="font-size: 12.5px; color: #4B2AA8; font-weight: 600">Frage · Amtshaftung</span></div>
            <div style="min-height: 50px; border-radius: 12px; padding: 6px 12px; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 15px; font-weight: 700">Drittschutz im Baurecht</span><span style="font-size: 12.5px; color: #6B6678; font-weight: 600">Schema · Baurecht</span></div>
            <div style="height: 40px; padding: 0 12px; display: flex; align-items: center; font-size: 14px; font-weight: 700; color: #5B34D1">+ Neue Karte „Drittbezogenheit“ anlegen</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; border-top: 1px solid #EFECF5; padding-top: 14px">
          ${iconButton('up', 'Nach oben')}${iconButton('down', 'Nach unten')}
          <span style="flex-grow: 1"></span>
          <span class="tap hv-ghost" style="height: 48px; padding: 0 14px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #B42318">${icon('trash', 18)}Punkt löschen</span>
        </div>
      </aside>
    </div>`,
  });

export const boards = [
  { name: 'DesktopErstellen', title: 'Desktop: Erstellen', build: erstellen },
  { name: 'DesktopErstellenPdf', title: 'Desktop: Erstellen mit PDF', build: erstellenPdf },
  { name: 'DesktopAbdeckungEditor', title: 'Desktop: Felder aufziehen', build: abdeckungEditor },
  { name: 'DesktopSchemaEditor', title: 'Desktop: Schema-Editor', build: schemaEditor },
];
