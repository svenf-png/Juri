/*
 * Designs aus design/*.dc.html als eigenständige Seiten für Vergleichstests (Annahme A12).
 *
 * Die .dc.html-Dateien stammen aus dem Design-Tool und brauchen dessen Laufzeit (support.js).
 * Hier nur das Nötigste: renderVals() mit den Standardwerten aufrufen, <sc-for>-Listen und
 * {{…}}-Platzhalter einsetzen und statt Google Fonts dieselben Schriftdateien wie die App laden
 * (src/ui/tokens/fonts.css), damit sich Design und App nur im Layout unterscheiden können.
 */
import { readFileSync } from 'node:fs';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Bewusste Korrekturen am Design, jeweils mit Grund. Sie gelten für jeden Vergleich.
 */
const SEARCH_PLACEHOLDER = {
  css: 'input::placeholder { color: #726E7A }',
  reason:
    'Annahme A2: Das Design setzt für die Suche keine Platzhalterfarbe, der Browser nimmt seine ' +
    'eigene (in WebKit deutlich heller). Die App nimmt #726E7A (4,55:1 auf der Fläche).',
};

const PLACEHOLDER = {
  css: 'textarea::placeholder, input::placeholder { color: #726E7A }',
  reason: 'Annahme A2: #8E8A99 erreicht auf der Fläche nur 3,08:1, die App nimmt #726E7A.',
};

const FIXES: Record<string, { css: string; reason: string }[]> = {
  'SchemaEditor.dc.html': [PLACEHOLDER],
  'SchemaPunkt.dc.html': [PLACEHOLDER],
  'SchemaNeueKarte.dc.html': [PLACEHOLDER],
  'SchemaVerknuepfen.dc.html': [PLACEHOLDER],
  'SchemaVerknuepfenLeer.dc.html': [PLACEHOLDER],
  'Schema.dc.html': [
    {
      css: '.sheet { height: 359px !important }',
      reason:
        'Das Sheet ist 356 px hoch, sein Inhalt braucht 359 px: Der Griff schrumpft im Design von ' +
        '5 auf 2 px. Die App nimmt 359 px und behält den Griff.',
    },
  ],
  'Luecke.dc.html': [
    {
      css: 'a[aria-label="Lernen beenden"] + div + div { min-width: 34px; text-align: right }',
      reason:
        'Luecke.dc.html und Antwort.dc.html lassen die Mindestbreite des Zählers weg, ' +
        'Lernen.dc.html setzt 34 px. Die App nimmt 34 px, damit die Leiste beim Weiterschalten ' +
        'nicht springt.',
    },
  ],
  'Bibliothek.dc.html': [SEARCH_PLACEHOLDER],
  'Erstellen.dc.html': [
    {
      css: 'textarea::placeholder, input::placeholder { color: #726E7A }',
      reason: 'Annahme A2: #8E8A99 erreicht auf der Fläche nur 3,08:1, die App nimmt #726E7A.',
    },
  ],
  'iPadStapel.dc.html': [
    SEARCH_PLACEHOLDER,
    {
      css:
        'a[aria-label="Stapel teilen"], a[href="iPad.dc.html"] { flex-shrink: 0 } ' +
        'a[href="iPad.dc.html"] { white-space: nowrap }',
      reason:
        'Im Design schrumpfen bei der langen Zeile unter dem Titel der Teilen-Knopf zum Oval ' +
        '(35 × 48 px) und der Lernen-Knopf bricht um. Die App hält beide ungeschrumpft.',
    },
  ],
  'iPadHeute.dc.html': [
    {
      css: 'a[href="HighFive.dc.html"] > span:first-child { flex-shrink: 0 }',
      reason:
        'Der 40-px-Kreis des High-five-Icons darf im Design schrumpfen und wird bei langem ' +
        'Text zum Oval (34 × 40 px). Die App hält ihn rund.',
    },
  ],
};

/** @font-face-Regeln der App, umbenannt auf die Namen im Design, Dateien als data:-URL. */
function fontFaces(): string {
  return readFileSync('src/ui/tokens/fonts.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll("'Bricolage Grotesque Variable'", "'Bricolage Grotesque'")
    .replaceAll("'Figtree Variable'", "'Figtree'")
    .replace(/url\('(@fontsource-variable\/[^']+)'\)/g, (_, path: string) => {
      const data = readFileSync(`node_modules/${path}`).toString('base64');
      return `url(data:font/woff2;base64,${data})`;
    });
}

type Vals = Record<string, unknown>;
interface PropSpec {
  default?: unknown;
}

/** Werte aus renderVals() mit den Standard-Props des Designs. */
function renderVals(html: string): Vals {
  const script =
    /<script type="text\/x-dc"[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!script) return {};
  const specs = JSON.parse(script[1]!) as Record<string, PropSpec>;
  const props = Object.fromEntries(
    Object.entries(specs)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, spec]) => [key, spec.default]),
  );
  class DCLogic {
    props = props;
  }
  // Der Code stammt aus dem eigenen Repository (design/), nicht aus fremden Quellen.
  const make = new Function('DCLogic', `${script[2]!}\nreturn Component;`) as (
    base: typeof DCLogic,
  ) => new () => { renderVals(): Vals };
  const Component = make(DCLogic);
  return new Component().renderVals();
}

type Scope = Record<string, unknown>;

/** Wert zu „a.b.c“ im Geltungsbereich; unbekannte Pfade ergeben `undefined`. */
function lookup(path: string, scope: Scope): unknown {
  let current: unknown = scope;
  for (const part of path.trim().split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Scope)[part];
  }
  return current;
}

/** Text für {{…}}; Funktionen (Klick-Handler des Design-Tools) bleiben leer. */
function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

/** Ende des passenden Schließ-Tags zu einem Öffnungs-Tag, auch bei Verschachtelung. */
function closingTag(markup: string, from: number, tag: string): { bodyEnd: number; end: number } {
  const pattern = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  pattern.lastIndex = from;
  let depth = 1;
  for (let m = pattern.exec(markup); m; m = pattern.exec(markup)) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { bodyEnd: m.index, end: m.index + m[0].length };
  }
  throw new Error(`<${tag}> ist nicht geschlossen`);
}

/**
 * Setzt die Vorlagen des Design-Tools ein: <sc-for list="{{liste}}" as="x"> (auch verschachtelt),
 * <sc-if value="{{bedingung}}"> und {{pfad}} in Text und Attributen.
 */
function expand(markup: string, scope: Scope): string {
  const fill = (text: string) =>
    text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => asText(lookup(path, scope)));
  const open = /<(sc-for|sc-if)\b([^>]*)>/g;
  let out = '';
  let at = 0;
  for (let m = open.exec(markup); m; m = open.exec(markup)) {
    out += fill(markup.slice(at, m.index));
    const bodyStart = m.index + m[0].length;
    const { bodyEnd, end } = closingTag(markup, bodyStart, m[1]!);
    const body = markup.slice(bodyStart, bodyEnd);
    const attr = (name: string) =>
      new RegExp(`\\s${name}="\\{\\{\\s*([\\w.]+)\\s*\\}\\}"`).exec(m[2]!)?.[1];
    if (m[1] === 'sc-for') {
      const items = lookup(attr('list') ?? '', scope);
      const name = /\sas="(\w+)"/.exec(m[2]!)?.[1] ?? 'item';
      if (Array.isArray(items)) {
        for (const item of items as unknown[]) out += expand(body, { ...scope, [name]: item });
      }
    } else if (lookup(attr('value') ?? '', scope)) {
      out += expand(body, scope);
    }
    at = end;
    open.lastIndex = end;
  }
  return out + fill(markup.slice(at));
}

/** Design als eigenständige HTML-Seite samt Korrekturen aus FIXES. */
export function designHtml(file: string): string {
  const html = readFileSync(`design/${file}`, 'utf8');
  const style = /<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>[\s\S]*?<\/helmet>/.exec(html)?.[1];
  const body = /<x-dc>[\s\S]*?<\/helmet>([\s\S]*?)<\/x-dc>/.exec(html)?.[1];
  if (style === undefined || body === undefined) throw new Error(`Unbekanntes Format: ${file}`);
  const fixes = (FIXES[file] ?? []).map((f) => f.css).join('\n');
  // Rahmen wie in der App: Mobil-Emulation (WebKit-Projekte) ohne Viewport-Tag rechnet mit
  // 980 px Breite, und iOS vergrößert Text sonst selbsttätig.
  return (
    '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>html { -webkit-text-size-adjust: 100%; text-size-adjust: 100% }</style>' +
    `<style>${fontFaces()}</style><style>${style}</style><style>${fixes}</style>` +
    `</head><body>${expand(body, renderVals(html))}</body></html>`
  );
}

/** Lädt ein Design in die Seite, ohne Animationen (Endzustand), Schriften geladen. */
export async function showDesign(page: Page, file: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent(designHtml(file));
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Anteil abweichender Pixel zweier PNG-Bilder gleicher Größe, gerechnet in einer leeren Seite
 * desselben Browsers. Ein Pixel weicht ab, wenn ein Farbkanal um mehr als `tolerance` abweicht.
 */
export async function pixelDiff(
  context: BrowserContext,
  a: Buffer,
  b: Buffer,
  tolerance = 16,
): Promise<{ differing: number; total: number; sameSize: boolean; area: string }> {
  const page = await context.newPage();
  try {
    return await page.evaluate(
      async ([a64, b64, tol]) => {
        const pixels = async (b64: string) => {
          const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bitmap, 0, 0);
          return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        };
        const [x, y] = [await pixels(a64), await pixels(b64)];
        const sameSize = x.width === y.width && x.height === y.height;
        const total = x.width * x.height;
        if (!sameSize) return { differing: total, total, sameSize, area: 'alles' };
        let differing = 0;
        const box = { left: x.width, top: x.height, right: -1, bottom: -1 };
        for (let i = 0; i < x.data.length; i += 4) {
          for (let c = 0; c < 4; c++) {
            if (Math.abs(x.data[i + c]! - y.data[i + c]!) > tol) {
              differing++;
              const px = (i / 4) % x.width;
              const py = Math.floor(i / 4 / x.width);
              box.left = Math.min(box.left, px);
              box.right = Math.max(box.right, px);
              box.top = Math.min(box.top, py);
              box.bottom = Math.max(box.bottom, py);
              break;
            }
          }
        }
        const area =
          differing === 0
            ? 'keiner'
            : `x ${box.left} bis ${box.right}, y ${box.top} bis ${box.bottom} (Bildpunkte)`;
        return { differing, total, sameSize, area };
      },
      [a.toString('base64'), b.toString('base64'), tolerance] as const,
    );
  } finally {
    await page.close();
  }
}
