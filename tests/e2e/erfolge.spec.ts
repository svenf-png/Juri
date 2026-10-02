import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign, simulateStatusBar } from './design';

/*
 * Erfolge (M9): pixelnah zu Erfolge.dc.html (iPhone 14), iPadErfolge.dc.html (iPad quer), Fertig.dc.html
 * und den in M9 ergänzten Artboards (Entscheidung 2, A12). Design und App rendern im selben Browser,
 * die App mit den Beispieldaten der Designs (/styleguide/erfolge/…) und ohne Animationen. Was das
 * Design nicht zeigt (der Knopf „Tagesziele“), trägt `data-addition` und wird im Bild ausgeblendet.
 * Mit JURI_BILDER=1 schreibt der Vergleich die App-Bilder nach docs/bilder/.
 */

type Layout = 'iphone' | 'ipad';

interface Case {
  name: string;
  layout: Layout;
  design: string;
  route: string;
  image: string;
  /** Höhe des Design-Rahmens, wenn sie größer ist als der Bildschirm (Erfolge.dc.html: 1260). */
  tall?: number;
}

const CASES: Case[] = [
  {
    name: 'Erfolge iPhone',
    layout: 'iphone',
    design: 'Erfolge.dc.html',
    route: 'liste',
    image: 'erfolge-iphone',
    tall: 1260,
  },
  {
    name: 'Erfolge iPad',
    layout: 'ipad',
    design: 'iPadErfolge.dc.html',
    route: 'liste',
    image: 'erfolge-ipad',
  },
  {
    name: 'Leerzustand',
    layout: 'iphone',
    design: 'ErfolgeLeer.dc.html',
    route: 'leer',
    image: 'erfolge-leer-iphone',
  },
  {
    name: 'Tagesziele',
    layout: 'iphone',
    design: 'ErfolgeZiele.dc.html',
    route: 'ziele',
    image: 'erfolge-ziele-iphone',
  },
  {
    name: 'Tagesziele: Fehler',
    layout: 'iphone',
    design: 'ErfolgeFehler.dc.html',
    route: 'fehler',
    image: 'erfolge-fehler-iphone',
  },
  {
    name: 'Meilenstein-Feier',
    layout: 'iphone',
    design: 'ErfolgeMeilenstein.dc.html',
    route: 'meilenstein',
    image: 'erfolge-meilenstein-iphone',
  },
  {
    name: 'Tagesziel erreicht',
    layout: 'iphone',
    design: 'Fertig.dc.html',
    route: 'fertig',
    image: 'fertig-iphone',
  },
];

const SIZE: Record<Layout, { width: number; height: number }> = {
  iphone: { width: 390, height: 844 },
  ipad: { width: 1180, height: 820 },
};

/** Spielraum für Kantenglättung je Engine, wie in fristen.spec.ts. */
const MAX_DIFF_RATIO = { chromium: 0.001, webkit: 0.002 };

/** Lage aller Textstücke (Text, x, y, Breite, Höhe), für die Fehlersuche bei Abweichungen. */
async function textRects(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent?.trim();
      if (!text) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      out[text] = [r.x, r.y, r.width, r.height].map((v) => v.toFixed(1)).join(' ');
    }
    return out;
  });
}

test.describe('Erfolge: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      const want = SIZE[c.layout];
      test.skip(size?.width !== want.width || size.height !== want.height, 'anderer Viewport');
      if (c.tall) await page.setViewportSize({ width: want.width, height: c.tall });
      await showDesign(page, c.design);
      const design = await page.screenshot({ animations: 'disabled' });
      const designRects = await textRects(page);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/Juri/styleguide/erfolge/${c.route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      if (c.layout === 'iphone') await simulateStatusBar(page);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('[data-addition]').evaluateAll((els) => {
        for (const el of els) (el as HTMLElement).style.setProperty('display', 'none');
      });
      // Ein Sheet setzt den Fokus auf sein erstes Element; das Design zeigt keinen Fokusring.
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
      const app = await page.screenshot({ animations: 'disabled' });

      if (process.env.JURI_BILDER === '1' && browserName === 'chromium') {
        mkdirSync('docs/bilder', { recursive: true });
        writeFileSync(`docs/bilder/${c.image}.png`, app);
      }
      const diff = await pixelDiff(context, design, app);
      if (diff.differing / diff.total > MAX_DIFF_RATIO.chromium) {
        const appRects = await textRects(page);
        for (const [text, rect] of Object.entries(designRects)) {
          if (appRects[text] !== rect) {
            console.log(`Lage ${c.image} "${text}": Design ${rect}, App ${appRects[text] ?? '-'}`);
          }
        }
        mkdirSync('test-results/diff', { recursive: true });
        writeFileSync(`test-results/diff/${c.image}-${browserName}-design.png`, design);
        writeFileSync(`test-results/diff/${c.image}-${browserName}-app.png`, app);
        await test.info().attach('design.png', { body: design, contentType: 'image/png' });
        await test.info().attach('app.png', { body: app, contentType: 'image/png' });
      }
      expect(diff.sameSize).toBe(true);
      expect(
        diff.differing / diff.total,
        `${diff.differing} von ${diff.total} Pixeln weichen ab, Bereich: ${diff.area}`,
      ).toBeLessThanOrEqual(
        browserName === 'webkit' ? MAX_DIFF_RATIO.webkit : MAX_DIFF_RATIO.chromium,
      );
    });
  }
});
