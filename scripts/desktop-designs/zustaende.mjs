/*
 * Desktop-Artboard „Zustände“: Ruhe, Hover und Tastaturfokus der Bausteine, abgeleitet aus den
 * vorhandenen Farben (kein neuer Ton). Gedrückt bleibt wie auf dem Handy (.tap: Skalierung .97).
 */
import { icon, kbd, label } from './kit.mjs';

const FOCUS = 'outline: 2px solid #6A3FE0; outline-offset: 2px;';

const cell = (caption, inner) =>
  `<div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start"><span style="font-size: 12px; font-weight: 700; color: #6B6678">${caption}</span>${inner}</div>`;

const group = (
  name,
  note,
  cells,
) => `<section style="display: flex; flex-direction: column; gap: 12px; padding: 22px 0; border-top: 1px solid #EFECF5">
    <div style="display: flex; align-items: baseline; gap: 14px">${label(name)}<span style="font-size: 13px; color: #6B6678">${note}</span></div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px">${cells.join('')}</div>
  </section>`;

const nav = (state) => {
  const style =
    state === 'aktiv'
      ? 'background: #F6F4FB; color: #6A3FE0; font-weight: 700'
      : state === 'hover'
        ? 'background: #F3F1F8; color: #17141F; font-weight: 600'
        : 'color: #17141F; font-weight: 600';
  return `<span style="width: 208px; height: 44px; box-sizing: border-box; border-radius: 12px; padding: 0 12px; display: flex; align-items: center; gap: 12px; font-size: 15px; ${style}; ${state === 'fokus' ? FOCUS : ''}">${icon('stack')}Stapel</span>`;
};

const button = (bg, extra = '') =>
  `<span style="height: 52px; box-sizing: border-box; border-radius: 18px; padding: 0 22px; display: flex; align-items: center; gap: 10px; background: ${bg}; color: #FFFFFF; font-size: 16px; font-weight: 700; ${extra}">Lernen starten</span>`;

const outline = (border, extra = '') =>
  `<span style="height: 52px; box-sizing: border-box; border-radius: 18px; padding: 0 22px; display: flex; align-items: center; border: 1.5px solid ${border}; background: #FFFFFF; font-size: 16px; font-weight: 700; ${extra}">Speichern</span>`;

const row = (bg, extra = '') =>
  `<span style="width: 260px; height: 56px; box-sizing: border-box; border-radius: 12px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; background: ${bg}; font-size: 15.5px; font-weight: 650; ${extra}">Verschulden<span style="font-size: 13px; color: #6B6678; font-weight: 600">§ 276 BGB</span></span>`;

const field = (bg, extra = '') =>
  `<span style="width: 260px; box-sizing: border-box; border-radius: 20px; padding: 12px 18px; display: flex; flex-direction: column; gap: 4px; background: ${bg}; ${extra}"><span style="font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6B6678">Norm</span><span style="font-size: 17px">§ 242 StGB</span></span>`;

const link = (color, extra = '') =>
  `<span style="font-size: 16px; font-weight: 700; color: ${color}; ${extra}">Gruß-Datei öffnen</span>`;

const zustaende = (
  w,
  h,
) => `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background: #FFFFFF; padding: 40px 48px; display: flex; flex-direction: column; overflow: hidden">
  <h1 class="d" style="margin: 0 0 4px; font-size: 40px; font-weight: 750; letter-spacing: -0.03em">Zustände am Rechner</h1>
  <p style="margin: 0 0 18px; font-size: 15px; color: #6B6678; max-width: 70ch; line-height: 1.45">Mit Maus und Tastatur gibt es zwei Zustände mehr als auf dem Handy: Hover und sichtbaren Fokus (Tab). Beide sind aus den vorhandenen Farben abgeleitet. Gedrückt bleibt wie bisher (Skalierung auf 97 %).</p>
  ${group('Navigation', 'Hover #F3F1F8 (Linie weich), aktiv bleibt Fläche mit Violett', [cell('Ruhe', nav('ruhe')), cell('Hover', nav('hover')), cell('Aktiv', nav('aktiv')), cell('Fokus', nav('fokus'))])}
  ${group('Knöpfe', 'Violett wird Link-Violett (#5B34D1), Tinte wird Violett-900 (#2E1A73), der Rand des Umrisses wird #A08BEA', [cell('Primär, Ruhe', button('#6A3FE0')), cell('Primär, Hover', button('#5B34D1')), cell('Tinte, Hover', button('#2E1A73')), cell('Fokus', button('#6A3FE0', FOCUS)), cell('Umriss, Ruhe', outline('#DCD6EA')), cell('Umriss, Hover', outline('#A08BEA')), cell('Fokus', outline('#DCD6EA', FOCUS)), cell('Tastenhinweis', `<span style="display: flex; gap: 6px; height: 52px; align-items: center">${kbd('N')}${kbd('Strg ↵')}${kbd('Leertaste')}</span>`)])}
  ${group('Zeilen, Flächen und Felder', 'Zeile: Fläche bei Hover; Fläche: dunklere Fläche; Feld: Hover wie Fläche, Fokus mit Ring', [cell('Zeile, Ruhe', row('transparent')), cell('Zeile, Hover', row('#F6F4FB')), cell('Zeile, Fokus', row('transparent', FOCUS)), cell('Zeile, gewählt', row('#F6F4FB', 'box-shadow: inset 0 0 0 2px #6A3FE0')), cell('Feld, Ruhe', field('#F6F4FB')), cell('Feld, Hover', field('#F1EEF7')), cell('Feld, Fokus', field('#F6F4FB', 'box-shadow: 0 0 0 2px #6A3FE0')), cell('Link, Hover', `${link('#4B2AA8')}`)])}
</div>`;

export const boards = [
  { name: 'DesktopZustaende', title: 'Desktop: Zustände', build: zustaende, noWide: true },
];
