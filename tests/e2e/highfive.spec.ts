import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign, simulateStatusBar } from './design';

/*
 * High fives (M11): pixelnah zu HighFive.dc.html (iPhone 14) und den M11-Artboards aus
 * scripts/build-highfive-designs.mjs (Entscheidung 2, A12), darunter iPadHighFive.dc.html (iPad quer).
 * Design und App rendern im selben Browser, die App mit den Beispieldaten der Artboards
 * (/styleguide/high-fives/…) und ohne Animationen. Was das Design nicht zeigt (Fußzeilen), trägt
 * `data-addition` und wird im Bild ausgeblendet. Mit JURI_BILDER=1 schreibt der Vergleich die
 * App-Bilder nach docs/bilder/.
 */

type Layout = 'iphone' | 'ipad';

interface Case {
  name: string;
  layout: Layout;
  design: string;
  route: string;
  image: string;
}

const CASES: Case[] = [
  {
    name: 'High fives iPhone',
    layout: 'iphone',
    design: 'HighFive.dc.html',
    route: 'liste',
    image: 'highfive-iphone',
  },
  {
    name: 'High fives iPad',
    layout: 'ipad',
    design: 'iPadHighFive.dc.html',
    route: 'ipad',
    image: 'highfive-ipad',
  },
  {
    name: 'Noch keine Kontakte',
    layout: 'iphone',
    design: 'HighFiveLeer.dc.html',
    route: 'leer',
    image: 'highfive-leer-iphone',
  },
  {
    name: 'High five gegeben',
    layout: 'iphone',
    design: 'HighFiveGegeben.dc.html',
    route: 'gegeben',
    image: 'highfive-gegeben-iphone',
  },
  {
    name: 'Einfach so',
    layout: 'iphone',
    design: 'HighFiveEinfach.dc.html',
    route: 'einfach',
    image: 'highfive-einfach-iphone',
  },
  {
    name: 'High five empfangen',
    layout: 'iphone',
    design: 'HighFiveFeier.dc.html',
    route: 'feier',
    image: 'highfive-feier-iphone',
  },
  {
    name: 'Bildkarte',
    layout: 'iphone',
    design: 'HighFiveKarte.dc.html',
    route: 'karte',
    image: 'highfive-karte-iphone',
  },
  {
    name: 'Kontaktliste',
    layout: 'iphone',
    design: 'HighFiveKontakte.dc.html',
    route: 'kontakte',
    image: 'highfive-kontakte-iphone',
  },
  {
    name: 'Kontakt bearbeiten',
    layout: 'iphone',
    design: 'HighFiveKontakt.dc.html',
    route: 'kontakt',
    image: 'highfive-kontakt-iphone',
  },
  {
    name: 'Gruß-Datei empfangen',
    layout: 'iphone',
    design: 'HighFiveGruss.dc.html',
    route: 'gruss',
    image: 'highfive-gruss-iphone',
  },
  {
    name: 'Datei nicht angenommen',
    layout: 'iphone',
    design: 'HighFiveFehler.dc.html',
    route: 'fehler',
    image: 'highfive-fehler-iphone',
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

test.describe('High fives: pixelnah zum Design', () => {
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
      await page.goto(`/Juri/styleguide/high-fives/${c.route}`);
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
