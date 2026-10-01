/*
 * Bausteine für die Desktop-Artboards (M13, Entscheidung 2, ADR-017): Werte aus
 * src/ui/tokens/tokens.ts und den vorhandenen Designs, nichts neu erfunden. Die Boards sind
 * statisches HTML im Format des Design-Tools (x-dc mit helmet), erzeugt von
 * scripts/build-desktop-designs.mjs; hier liegen Maße, Stile und kleine Fragmente.
 */

/** Maße der Desktop-Gestaltung (ab 1280 px Fensterbreite, ADR-017). */
export const DESKTOP = {
  /** Sidebar wie in iPadHeute.dc.html. */
  sidebar: 240,
  /** Inhaltsbereich neben der Sidebar, mittig gedeckelt (einschließlich Innenabstand). */
  maxContent: 1440,
  padX: 48,
  padY: 40,
};

export const SIZES = {
  desktop: { w: 1440, h: 900 },
  wide: { w: 1920, h: 1080 },
};

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&amp;family=Figtree:wght@400;500;600;700&amp;display=swap" rel="stylesheet">';

/**
 * Grundstile wie in den iPad-Designs. Dazu die Zustände für Maus und Tastatur, abgeleitet aus den
 * vorhandenen Farben: Zeile mit Fläche (.hv-row, .hv-nav), Fläche mit dunklerer Fläche (.hv-card),
 * Violett mit Link-Violett (.hv-primary), Tinte mit Violett-900 (.hv-ink), Fokusring wie in der App.
 */
export const STYLE = `body{margin:0;font-family:'Figtree',-apple-system,system-ui,sans-serif;color:#17141F;background:#FFFFFF;-webkit-font-smoothing:antialiased}
a{color:#5B34D1;text-decoration:none}a:hover{color:#4B2AA8}
button{font-family:inherit;cursor:pointer}
input,textarea{font-family:inherit}
.d{font-family:'Bricolage Grotesque','Figtree',system-ui,sans-serif}
.tap{transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .2s,box-shadow .2s,border-color .2s}
.tap:active{transform:scale(.97)}
.hv-nav:hover{background:#F3F1F8}
.hv-row:hover{background:#F6F4FB}
.hv-card:hover{background:#F1EEF7}
.hv-primary:hover{background:#5B34D1}
.hv-ink:hover{background:#2E1A73}
.hv-ghost:hover{background:#F6F4FB}
.hv-outline:hover{border-color:#A08BEA}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #6A3FE0;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;

export const esc = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/* Symbole wie in src/ui/components/icons.tsx. */
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"></path>',
  stack: '<rect x="4" y="8" width="16" height="12" rx="3"></rect><path d="M7 4.5h10"></path>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"></path><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"></path>',
  calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"></path>',
  share:
    '<path d="M12 15V4M8 8l4-4 4 4"></path><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"></path>',
  sliders:
    '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle>',
  settings:
    '<circle cx="12" cy="12" r="3"></circle><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  search: '<circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4-4"></path>',
  close: '<path d="M6 6l12 12M18 6 6 18"></path>',
  back: '<path d="M15 5l-7 7 7 7"></path>',
  chevron: '<path d="M9 5l7 7-7 7"></path>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  hand: '<path d="M7 12V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V12M16 12V9a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5.2-2.6L3.6 14.8a1.5 1.5 0 0 1 2.3-1.9L7 14"></path>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"></path><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"></path>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"></path><path d="M18 3v4h-4M6 21v-4h4"></path>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>',
  image:
    '<rect x="3" y="5" width="18" height="14" rx="3"></rect><circle cx="9" cy="10" r="1.6"></circle><path d="M21 16l-5-5-8 8"></path>',
  more: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor"></circle><circle cx="12" cy="12" r="1.5" fill="currentColor"></circle><circle cx="18.5" cy="12" r="1.5" fill="currentColor"></circle>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"></path>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"></path>',
  indent: '<path d="M4 6h16M11 12h9M11 18h9M4 10l3 2.5L4 15"></path>',
  outdent: '<path d="M4 6h16M11 12h9M11 18h9M7 10l-3 2.5L7 15"></path>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"></path>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"></path>',
  undo: '<path d="M9 14 4 9l5-5"></path><path d="M4 9h10a6 6 0 0 1 0 12h-3"></path>',
  note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5M9 13h6M9 17h4"></path>',
};

export const icon = (name, size = 20, sw = 2, stroke = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/**
 * Tastenhinweis. Auf hellem Grund weiß mit Rand, auf Violett oder Tinte durchscheinend weiß.
 * Höhe 22, Radius 8 (Token `tag`), Schrift 12/700 wie die Kennzeichen der Karten.
 */
export const kbd = (text, tone = 'light') => {
  const dark = tone === 'dark';
  return `<kbd style="min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 8px; border: 1.5px solid ${dark ? 'rgba(255,255,255,.3)' : '#DCD6EA'}; background: ${dark ? 'rgba(255,255,255,.14)' : '#FFFFFF'}; color: ${dark ? '#FFFFFF' : '#6B6678'}; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0">${text}</kbd>`;
};

/** Kürzel-Chip mit Fläche statt Weiß (auf Flächen, z. B. im Seitenfeld). */
export const kbdOnSurface = (text) =>
  `<kbd style="min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 8px; border: 1.5px solid #DCD6EA; background: #FFFFFF; color: #17141F; font-family: inherit; font-size: 12px; font-weight: 700; line-height: 1; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0">${text}</kbd>`;

const wordmark = `<div class="d" style="font-size: 34px; font-weight: 800; letter-spacing: -0.04em; padding: 0 12px 22px 12px; display: flex; align-items: flex-end; line-height: 1">Jur<span style="position: relative; display: inline-block">ı<span style="position: absolute; left: 50%; top: 1px; width: 8px; height: 8px; margin-left: -4px; border-radius: 3px; background: #6A3FE0; transform: rotate(8deg)"></span></span></div>`;

const NAV = [
  ['heute', 'Heute', 'home', 'DesktopHeute.dc.html'],
  ['stapel', 'Stapel', 'stack', 'DesktopStapel.dc.html'],
  ['erfolge', 'Erfolge', 'trophy', 'DesktopErfolge.dc.html'],
  ['fristen', 'Fristen', 'calendar', 'DesktopFristen.dc.html'],
  ['teilen', 'Teilen', 'share', 'DesktopTeilen.dc.html'],
  ['rhythmus', 'Lernrhythmus', 'sliders', 'DesktopLernrhythmus.dc.html'],
  ['einstellungen', 'Einstellungen', 'settings', 'DesktopEinstellungen.dc.html'],
];

/**
 * Sidebar der Desktop-Gestaltung: wie iPadHeute.dc.html (240 px, Linie rechts), dazu „Suchen“ mit
 * dem Kürzel „/“ und „Neue Karte“ mit „N“ (A53, M7). Die Seite hat dieselbe Höhe wie das Fenster.
 */
export const sidebar = (
  active,
) => `<aside style="width: ${DESKTOP.sidebar}px; flex-shrink: 0; box-sizing: border-box; border-right: 1px solid #EFECF5; padding: 34px 16px 24px 16px; display: flex; flex-direction: column; gap: 4px">
    ${wordmark}
    ${NAV.map(
      ([key, label, ic, href]) =>
        `<a href="${href}" class="${key === active ? '' : 'hv-nav'}" style="height: 44px; border-radius: 12px; padding: 0 12px; display: flex; align-items: center; gap: 12px; ${key === active ? 'background: #F6F4FB; color: #6A3FE0; font-size: 15px; font-weight: 700' : 'color: #17141F; font-size: 15px; font-weight: 600'}">${icon(ic)}${label}</a>`,
    ).join('\n    ')}
    <div style="flex-grow: 1"></div>
    <a href="DesktopStapel.dc.html" class="hv-ghost" style="height: 44px; border-radius: 12px; background: #F6F4FB; padding: 0 10px 0 12px; display: flex; align-items: center; gap: 10px; color: #6B6678; font-size: 15px; font-weight: 600; margin-bottom: 8px">${icon('search', 18)}<span style="flex-grow: 1">Suchen</span>${kbd('/')}</a>
    <a href="DesktopErstellen.dc.html" class="tap hv-ink" style="height: 50px; border-radius: 16px; background: #17141F; color: #FFFFFF; display: flex; align-items: center; gap: 10px; padding: 0 14px 0 18px; font-size: 15px; font-weight: 700">${icon('plus', 18, 2.4)}<span style="flex-grow: 1">Neue Karte</span>${kbd('N', 'dark')}</a>
  </aside>`;

/**
 * Rahmen mit Sidebar (Heute, Stapel, Erfolge, Fristen, Teilen, High fives, Einstellungen). Der
 * Inhalt steht neben der Sidebar und wird ab 1440 px Breite mittig gedeckelt.
 */
export const shell = (
  w,
  h,
  active,
  main,
  { pad = true } = {},
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; display: flex; overflow: hidden">
  ${sidebar(active)}
  <main style="flex: 1 1 0; min-width: 0; display: flex; justify-content: center; ${pad ? '' : ''}">
    <div style="width: 100%; max-width: ${DESKTOP.maxContent}px; box-sizing: border-box; ${pad ? `padding: ${DESKTOP.padY}px ${DESKTOP.padX}px` : ''}; display: flex; flex-direction: column">
      ${main}
    </div>
  </main>
</div>`;

/** Seitenkopf: Überschrift (Display 44), darunter ein Satz; rechts Aktionen. */
export const pageHead = (
  title,
  lead = '',
  actions = '',
) => `<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 32px">
  <div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">
    <h1 class="d" style="margin: 0; font-size: 44px; line-height: 1.05; font-weight: 750; letter-spacing: -0.03em">${title}</h1>
    ${lead ? `<p style="margin: 0; font-size: 16px; line-height: 1.45; color: #6B6678; max-width: 60ch">${lead}</p>` : ''}
  </div>
  ${actions ? `<div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0">${actions}</div>` : ''}
</div>`;

/** Abschnittsüberschrift wie in den Designs (12/800, Großbuchstaben). */
export const label = (text) =>
  `<span style="font-size: 12px; font-weight: 800; color: #6B6678; letter-spacing: .06em; text-transform: uppercase">${text}</span>`;

/** Überschrift wie in iPadHeute.dc.html (13/600, .04em). */
export const labelHeute = (text, extra = '') =>
  `<span style="font-size: 13px; font-weight: 600; color: #6B6678; letter-spacing: .04em; text-transform: uppercase${extra}">${text}</span>`;

export const primaryButton = (
  text,
  { h = 52, size = 16, kb = '', href = '#', grow = false, icon: ic = '' } = {},
) =>
  `<a href="${href}" class="tap hv-primary" style="height: ${h}px; border-radius: 18px; background: #6A3FE0; color: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 22px; font-size: ${size}px; font-weight: 700; ${grow ? 'flex-grow: 1;' : ''} box-shadow: 0 14px 30px -14px rgba(106,63,224,.6)">${ic}${text}${kb ? kbd(kb, 'dark') : ''}</a>`;

export const inkButton = (
  text,
  { h = 52, size = 16, kb = '', href = '#', grow = false, icon: ic = '' } = {},
) =>
  `<a href="${href}" class="tap hv-ink" style="height: ${h}px; border-radius: 18px; background: #17141F; color: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 22px; font-size: ${size}px; font-weight: 700; ${grow ? 'flex-grow: 1;' : ''}">${ic}${text}${kb ? kbd(kb, 'dark') : ''}</a>`;

export const ghostButton = (
  text,
  { h = 52, size = 16, kb = '', href = '#', grow = false, icon: ic = '' } = {},
) =>
  `<a href="${href}" class="tap hv-outline" style="height: ${h}px; border-radius: 18px; border: 1.5px solid #DCD6EA; background: #FFFFFF; color: #17141F; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 22px; font-size: ${size}px; font-weight: 700; ${grow ? 'flex-grow: 1;' : ''}">${ic}${text}${kb ? kbd(kb) : ''}</a>`;

/** Zurück-Link wie in den iPad-Designs. */
export const backLink = (text, href = '#', { selfStart = true } = {}) =>
  `<a href="${href}" style="height: 44px; display: flex; align-items: center; gap: 2px; font-size: 16px; font-weight: 600; margin-left: -10px; ${selfStart ? 'align-self: flex-start' : ''}">${icon('back', 24, 2.2)}${text}</a>`;

/** Formularfeld wie in iPadErstellen.dc.html (Fläche, Radius 20, Beschriftung 12/800). */
export const textField = (
  name,
  value,
  { rows = 0, h = 0, ring = false, placeholder = '', badge = '' } = {},
) =>
  `<label style="border-radius: 20px; background: #F6F4FB; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; ${ring ? 'box-shadow: 0 0 0 2px #6A3FE0;' : ''} ${h ? `min-height: ${h}px; box-sizing: border-box;` : ''}">
    <span style="display: flex; justify-content: space-between; align-items: center"><span style="font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">${name}</span>${badge}</span>
    <span style="padding: 2px; font-size: ${rows ? 20 : 18}px; line-height: 1.4; ${value ? 'color: #17141F' : 'color: #726E7A'}">${value || placeholder}</span>
  </label>`;

/** Kleines Feld mit Rand (Norm, Stapel, Quelle) wie in iPadErstellen.dc.html. */
export const miniField = (name, value, { link = false } = {}) =>
  `<label style="border-radius: 16px; border: 1.5px solid #EFECF5; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px; box-sizing: border-box; min-width: 0">
    <span style="font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">${name}</span>
    <span style="font-size: 15px; font-weight: 400; ${link ? 'color: #5B34D1; font-weight: 600' : 'color: #17141F'}">${value}</span>
  </label>`;

/** Kartentyp wie in der App (Erstellen.module.css `.types`): Abstand 4, Reiter 40 px, 13,5/700. */
export const typeTabs = (items, active) =>
  `<div style="display: grid; grid-template-columns: repeat(${items.length}, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 16px; background: #F6F4FB">
    ${items
      .map(
        (t, i) =>
          `<span style="height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 13.5px; font-weight: 700; ${i === active ? 'background: #FFFFFF; color: #17141F; box-shadow: 0 2px 8px -3px rgba(46,26,115,.3)' : 'color: #6B6678'}">${t}</span>`,
      )
      .join('')}
  </div>`;

/** Reiter Frage / Lücke / Schema / Abdeckung (Segmentleiste der App). */
export const segmented = (items, active, { h = 48, size = 14.5, w = '' } = {}) =>
  `<div style="display: flex; box-sizing: border-box; padding: 3px; border-radius: 16px; background: #F6F4FB; gap: 0; ${w ? `width: ${w};` : ''}">
    ${items
      .map(
        (t, i) =>
          `<span style="flex: 1 1 0; height: ${h - 6}px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: ${size}px; font-weight: ${i === active ? 700 : 600}; ${i === active ? 'background: #FFFFFF; color: #17141F; box-shadow: 0 2px 8px -3px rgba(46,26,115,.3)' : 'color: #6B6678'}">${t}</span>`,
      )
      .join('')}
  </div>`;

/** Kennzeichen auf Karten: Rechtsgebiet (Fläche) und Typ (Rand). */
export const areaTag = (text) =>
  `<span style="height: 26px; padding: 0 9px; border-radius: 8px; background: #F6F4FB; color: #4B2AA8; font-size: 12px; font-weight: 800; display: flex; align-items: center">${text}</span>`;
export const typeTag = (text) =>
  `<span style="height: 26px; padding: 0 10px; border-radius: 8px; border: 1.5px solid #E4DDF7; color: #6B6678; font-size: 12px; font-weight: 700; display: flex; align-items: center">${text}</span>`;

/** Seite eines Boards als vollständiges Dokument im Format des Design-Tools. */
export const page = (title, body) => `<!doctype html>
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
