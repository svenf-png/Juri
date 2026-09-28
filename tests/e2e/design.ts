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
const FIXES: Record<string, { css: string; reason: string }[]> = {
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

type Vals = Record<string, Record<string, unknown>[]>;
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

/** Setzt <sc-for list="{{liste}}" as="x"> … {{x.feld}} … </sc-for> ein (nicht verschachtelt). */
function expand(markup: string, vals: Vals): string {
  return markup.replace(
    /<sc-for list="\{\{(\w+)\}\}" as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g,
    (_, list: string, as: string, inner: string) =>
      (vals[list] ?? [])
        .map((item) =>
          inner.replace(new RegExp(`\\{\\{${as}\\.(\\w+)\\}\\}`, 'g'), (__, key: string) =>
            String(item[key]),
          ),
        )
        .join(''),
  );
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
