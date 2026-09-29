import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';

/*
 * Fristen (M8): pixelnah zu Fristen.dc.html und den in M8 ergänzten Artboards (Entscheidung 2)
 * auf dem iPhone 14 (A12). Design und App rendern im selben Browser, die App mit den Beispieldaten
 * der Designs (/styleguide/fristen/…) und ohne Animationen. Was das Design nicht zeigt (der
 * Knopf „Fristen als Kalenderdatei sichern“), trägt `data-addition` und wird im Bild ausgeblendet;
 * er steht unter dem letzten Element und verschiebt nichts. Mit JURI_BILDER=1 schreibt der
 * Vergleich die App-Bilder nach docs/bilder/.
 */

interface Case {
  name: string;
  design: string;
  route: string;
  image: string;
}

const CASES: Case[] = [
  { name: 'Liste', design: 'Fristen.dc.html', route: 'liste', image: 'fristen-iphone' },
  {
    name: 'Leerzustand',
    design: 'FristenLeer.dc.html',
    route: 'leer',
    image: 'fristen-leer-iphone',
  },
  {
    name: 'Endspurt',
    design: 'FristenEndspurt.dc.html',
    route: 'endspurt',
    image: 'fristen-endspurt-iphone',
  },
  { name: 'Neue Frist', design: 'FristNeu.dc.html', route: 'neu', image: 'frist-neu-iphone' },
  {
    name: 'Frist bearbeiten',
    design: 'FristBearbeiten.dc.html',
    route: 'bearbeiten',
    image: 'frist-bearbeiten-iphone',
  },
  {
    name: 'Eingabe prüfen',
    design: 'FristFehler.dc.html',
    route: 'fehler',
    image: 'frist-fehler-iphone',
  },
  {
    name: 'Umfang wählen',
    design: 'FristUmfang.dc.html',
    route: 'umfang',
    image: 'frist-umfang-iphone',
  },
  {
    name: 'Frist löschen',
    design: 'FristLoeschen.dc.html',
    route: 'loeschen',
    image: 'frist-loeschen-iphone',
  },
];

/** Spielraum für Kantenglättung je Engine, wie in schema.spec.ts. */
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

test.describe('Fristen: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      test.skip(size?.width !== 390 || size.height !== 844, 'nur für den iPhone-14-Viewport');
      await showDesign(page, c.design);
      const design = await page.screenshot({ animations: 'disabled' });
      const designRects = await textRects(page);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/Juri/styleguide/fristen/${c.route}`);
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--sim-safe-top', '47px');
      });
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
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
