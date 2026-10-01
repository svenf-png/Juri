import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';

/*
 * Stapel und Erstellen (M3): pixelnah zu Bibliothek.dc.html, Stapel.dc.html, Erstellen.dc.html
 * (iPhone 14) und iPadStapel.dc.html (iPad quer), A12. Wie bei Heute rendern Design und App im
 * selben Browser, die App mit den Beispieldaten der Designs (/styleguide/stapel/…).
 *
 * Die bei der Freigabe ergänzten Bedienelemente stehen im Design nicht und werden im Bild
 * ausgeblendet (sie verschieben nichts): „+ Stapel“, der Stift-Chip der Rechtsgebiete und „⋯“.
 * Mit JURI_BILDER=1 schreibt der Vergleich die App-Bilder nach docs/bilder/.
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

const ADDITIONS = [
  'button:has-text("+ Stapel")',
  'button[aria-label="Rechtsgebiete verwalten"]',
  'button[aria-label="Stapel-Menü"]',
  'aside [data-addition]',
];

const CASES: Case[] = [
  {
    name: 'Stapel-Übersicht iPhone',
    design: 'Bibliothek.dc.html',
    route: '/Juri/styleguide/stapel/liste',
    width: 390,
    height: 844,
    hide: ADDITIONS,
    image: 'stapel-iphone',
  },
  {
    name: 'Stapel-Detail iPhone',
    design: 'Stapel.dc.html',
    route: '/Juri/styleguide/stapel/detail',
    width: 390,
    height: 844,
    hide: ADDITIONS,
    image: 'stapel-detail-iphone',
  },
  {
    name: 'Neue Karte iPhone',
    design: 'Erstellen.dc.html',
    route: '/Juri/styleguide/erstellen',
    width: 390,
    height: 844,
    hide: ADDITIONS,
    image: 'erstellen-iphone',
  },
  {
    name: 'Stapel Master-Detail iPad',
    design: 'iPadStapel.dc.html',
    route: '/Juri/styleguide/stapel/ipad',
    width: 1180,
    height: 820,
    hide: ADDITIONS,
    image: 'stapel-ipad',
  },
];

/**
 * Spielraum für Kantenglättung je Engine. Chromium liegt unter 0,001. WebKit zeichnet Text der
 * Design-Seite und der App an einzelnen Stellen um Bruchteile eines Pixels verschieden; in der CI
 * gemessen 0,0011 (Neue Karte) und 0,0016 (Stapel-Übersicht, noch mit abweichender
 * Platzhalterfarbe). Für WebKit gilt deshalb 0,002, Lage und Größe prüft dennoch jedes Pixel.
 */
const MAX_DIFF_RATIO = { chromium: 0.001, webkit: 0.002 };

async function openPreview(page: Page, c: Case) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(c.route);
  if (c.width === 390) {
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--sim-safe-top', '47px');
    });
  }
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Die CSP der App erlaubt keine eingefügten Stylesheets; Eigenschaften am Element gehen.
  for (const selector of c.hide) {
    await page.locator(selector).evaluateAll((els) => {
      for (const el of els) (el as HTMLElement).style.visibility = 'hidden';
    });
  }
  // Die fest stehende Tab-Bar liegt in Chromium auf eigener Ebene; bei Scrollposition 0 ist
  // `absolute` wie im Design gleichwertig (siehe heute.spec.ts).
  await page.evaluate(() => {
    const tabBar = Array.from(document.querySelectorAll('nav')).at(-1);
    if (tabBar && getComputedStyle(tabBar).position === 'fixed') tabBar.style.position = 'absolute';
  });
}

test.describe('Stapel und Erstellen: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      test.skip(
        size?.width !== c.width || size.height !== c.height,
        'nur für den Viewport des Designs',
      );
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
        // Auch als Dateien, zum Ansehen ohne den HTML-Bericht.
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
