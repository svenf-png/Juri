import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';

/*
 * Lernen (M4): pixelnah zu Lernen.dc.html (erste Karte), Luecke.dc.html (gebündelte Lücken),
 * Einstellungen.dc.html (Lernrhythmus) und HeuteErledigt.dc.html auf dem iPhone 14 (A12). Wie bei
 * Heute und Stapel rendern Design und App im selben Browser, die App mit den Beispieldaten der
 * Designs (/styleguide/…) und ohne Animationen. Mit JURI_BILDER=1 schreibt der Vergleich die
 * App-Bilder nach docs/bilder/.
 *
 * Elemente, die die App ergänzt und das Design nicht zeigt, stehen in `hide` und werden im Bild
 * ausgeblendet (sie verschieben nichts).
 */

interface Case {
  name: string;
  design: string;
  route: string;
  width: number;
  height: number;
  hide: string[];
  image: string;
}

const CASES: Case[] = [
  {
    name: 'Lernen: Frage',
    design: 'Lernen.dc.html',
    route: '/Juri/styleguide/lernen/frage',
    width: 390,
    height: 844,
    hide: [],
    image: 'lernen-frage-iphone',
  },
  {
    name: 'Lernen: gebündelte Lücken',
    design: 'Luecke.dc.html',
    route: '/Juri/styleguide/lernen/luecke',
    width: 390,
    height: 844,
    hide: [],
    image: 'lernen-luecke-iphone',
  },
  {
    name: 'Lernrhythmus',
    design: 'Einstellungen.dc.html',
    route: '/Juri/styleguide/lernrhythmus',
    width: 390,
    height: 1060,
    // Ergänzung: der Weg zu Profil, Speicher und Backup (auf dem iPad führt die Sidebar hierher).
    hide: ['[data-addition]'],
    image: 'lernrhythmus-iphone',
  },
  {
    name: 'Heute: alles erledigt',
    design: 'HeuteErledigt.dc.html',
    route: '/Juri/styleguide/heute-erledigt',
    width: 390,
    height: 844,
    hide: [],
    image: 'heute-erledigt-iphone',
  },
];

/** Spielraum für Kantenglättung je Engine, wie in stapel.spec.ts. */
const MAX_DIFF_RATIO = { chromium: 0.001, webkit: 0.002 };

async function openPreview(page: Page, c: Case) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(c.route);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sim-safe-top', '47px');
  });
  await expect(page.locator('main').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const selector of c.hide) {
    await page.locator(selector).evaluateAll((els) => {
      for (const el of els) (el as HTMLElement).style.visibility = 'hidden';
    });
  }
  // Die fest stehende Tab-Bar liegt in Chromium auf eigener Ebene (siehe heute.spec.ts).
  await page.evaluate(() => {
    const tabBar = Array.from(document.querySelectorAll('nav')).at(-1);
    if (tabBar && getComputedStyle(tabBar).position === 'fixed') tabBar.style.position = 'absolute';
  });
}

test.describe('Lernen: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      test.skip(size?.width !== 390 || size.height !== 844, 'nur für den iPhone-14-Viewport');
      // Das Design von Einstellungen ist 1060 px hoch; der Viewport wächst mit.
      await page.setViewportSize({ width: c.width, height: c.height });
      await showDesign(page, c.design);
      const design = await page.screenshot({ animations: 'disabled' });
      await openPreview(page, c);
      const app = await page.screenshot({ animations: 'disabled' });

      if (process.env.JURI_BILDER === '1' && browserName === 'chromium') {
        mkdirSync('docs/bilder', { recursive: true });
        writeFileSync(`docs/bilder/${c.image}.png`, app);
      }
      const diff = await pixelDiff(context, design, app);
      if (diff.differing > 0) {
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
