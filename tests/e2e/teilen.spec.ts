import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign, simulateStatusBar } from './design';

/*
 * Teilen und Import (M10): pixelnah zu den Artboards aus scripts/build-teilen-designs.mjs, die auf
 * Teilen.dc.html und BackupImport.dc.html beruhen (Entscheidung 2, A12). Design und App rendern im
 * selben Browser, die App mit den Beispieldaten der Artboards (/styleguide/teilen/…) und ohne
 * Animationen. Mit JURI_BILDER=1 schreibt der Vergleich die App-Bilder nach docs/bilder/.
 */

type Layout = 'iphone';

interface Case {
  name: string;
  layout: Layout;
  design: string;
  route: string;
  image: string;
}

const CASES: Case[] = [
  {
    name: 'Stapel wählen und senden',
    layout: 'iphone',
    design: 'TeilenBereit.dc.html',
    route: 'bereit',
    image: 'teilen-iphone',
  },
  {
    name: 'Import-Vorschau',
    layout: 'iphone',
    design: 'TeilenImport.dc.html',
    route: 'import',
    image: 'teilen-import-iphone',
  },
  {
    name: 'Stapel wählen (Sheet)',
    layout: 'iphone',
    design: 'TeilenStapel.dc.html',
    route: 'stapel',
    image: 'teilen-stapel-iphone',
  },
  {
    name: 'Merge-Konflikt',
    layout: 'iphone',
    design: 'TeilenKonflikt.dc.html',
    route: 'konflikt',
    image: 'teilen-konflikt-iphone',
  },
  {
    name: 'Ungültige Datei',
    layout: 'iphone',
    design: 'TeilenFehler.dc.html',
    route: 'fehler',
    image: 'teilen-fehler-iphone',
  },
  {
    name: 'Noch kein Stapel',
    layout: 'iphone',
    design: 'TeilenLeer.dc.html',
    route: 'leer',
    image: 'teilen-leer-iphone',
  },
  {
    name: 'Import fertig',
    layout: 'iphone',
    design: 'TeilenErfolg.dc.html',
    route: 'erfolg',
    image: 'teilen-erfolg-iphone',
  },
  {
    name: 'Import-Anleitung',
    layout: 'iphone',
    design: 'TeilenAnleitung.dc.html',
    route: 'anleitung',
    image: 'teilen-anleitung-iphone',
  },
];

const SIZE: Record<Layout, { width: number; height: number }> = {
  iphone: { width: 390, height: 844 },
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

test.describe('Teilen: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      const want = SIZE[c.layout];
      test.skip(size?.width !== want.width || size.height !== want.height, 'anderer Viewport');
      await showDesign(page, c.design);
      const design = await page.screenshot({ animations: 'disabled' });
      const designRects = await textRects(page);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/Juri/styleguide/teilen/${c.route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      await simulateStatusBar(page);
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
