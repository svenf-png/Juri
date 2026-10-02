/*
 * Erzeugt die Desktop-Artboards (M13, Entscheidung 2, ADR-017) und trägt sie in design/canvas.json
 * ein. Aufruf: node scripts/build-desktop-designs.mjs
 *
 * Jedes Board entsteht in zwei Größen: 1440 × 900 (Referenz laut Plan) und 1920 × 1080 (Inhalt
 * ist ab 1440 px Breite mittig gedeckelt). Bausteine und Maße stehen in scripts/desktop-designs/,
 * die Boards selbst in den Dateien daneben. Die Boards nie von Hand ändern, sondern hier.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SIZES, page } from './desktop-designs/kit.mjs';
import { boards as heuteStapel } from './desktop-designs/heute-stapel.mjs';
import { boards as lernen } from './desktop-designs/lernen.mjs';
import { boards as erstellen } from './desktop-designs/erstellen.mjs';
import { boards as bereiche } from './desktop-designs/bereiche.mjs';
import { boards as zustaende } from './desktop-designs/zustaende.mjs';

const BOARDS = [...heuteStapel, ...lernen, ...erstellen, ...bereiche, ...zustaende];

const out = [];
for (const board of BOARDS) {
  for (const [key, size] of Object.entries(SIZES)) {
    if (key === 'wide' && board.noWide) continue;
    const name = key === 'wide' ? `${board.name}1920` : board.name;
    const title = key === 'wide' ? `${board.title} (1920 × 1080)` : board.title;
    writeFileSync(
      new URL(`../design/${name}.dc.html`, import.meta.url),
      page(title, board.build(size.w, size.h)),
    );
    out.push({ name, title, w: size.w, h: size.h, wide: key === 'wide' });
  }
}

const canvasFile = new URL('../design/canvas.json', import.meta.url);
const canvas = JSON.parse(readFileSync(canvasFile, 'utf8'));
// Frühere Läufe entfernen, damit eine geänderte Liste keine Reste hinterlässt.
canvas.boards = Object.fromEntries(
  Object.entries(canvas.boards).filter(([key]) => !key.startsWith('Desktop')),
);
canvas.order = canvas.order.filter((key) => !key.startsWith('Desktop'));
const top = 25000;
canvas.notes.t14 = { kind: 'title1', maxW: 8000, text: 'M13: Desktop', w: 240, x: 0, y: top };
for (const row of [false, true]) {
  let x = 0;
  for (const b of out.filter((o) => o.wide === row)) {
    const key = `${b.name}.dc.html`;
    canvas.boards[key] = {
      h: b.h,
      radius: 44,
      title: b.title,
      w: b.w,
      x,
      y: top + 300 + (row ? 1100 : 0),
    };
    x += b.w + 80;
    canvas.order.push(key);
  }
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
console.log(`${out.length} Artboards geschrieben`);
