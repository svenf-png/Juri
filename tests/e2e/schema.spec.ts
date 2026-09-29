import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';

/*
 * Schema (M5): pixelnah zu Schema.dc.html (Lernen mit verknüpfter Karte) und SchemaEditor.dc.html
 * sowie zu den in M5 ergänzten Artboards (Entscheidung 2) auf dem iPhone 14 (A12). Design und App
 * rendern im selben Browser, die App mit den Beispieldaten der Designs (/styleguide/schema/…) und
 * ohne Animationen. Mit JURI_BILDER=1 schreibt der Vergleich die App-Bilder nach docs/bilder/.
 */

interface Case {
  name: string;
  design: string;
  route: string;
  image: string;
  /** Angleichung der Design-Seite, wenn das Design in sich uneinheitlich ist (mit Grund). */
  prepare?: (page: Page) => Promise<void>;
}

const CASES: Case[] = [
  {
    name: 'Schema lernen: verknüpfte Karte',
    design: 'Schema.dc.html',
    route: 'lernen',
    image: 'schema-lernen-iphone',
  },
  {
    name: 'Schema lernen: Punkte mit Inhalt',
    design: 'SchemaLernenInhalt.dc.html',
    route: 'inhalt',
    image: 'schema-inhalt-iphone',
  },
  {
    name: 'Schema bearbeiten: Verknüpfen',
    design: 'SchemaEditor.dc.html',
    route: 'editor',
    image: 'schema-editor-iphone',
    // SchemaEditor.dc.html zeigt im Suchfeld „Drittbez“, im Knopf darunter „Drittbezogenheit“. Die App
    // nimmt beides aus derselben Eingabe; das Design bekommt dafür die ganze Eingabe.
    prepare: async (page) => {
      await page.evaluate(() => {
        const input = document.querySelector('input');
        if (input) input.value = 'Drittbezogenheit';
      });
    },
  },
  {
    name: 'Schema bearbeiten: Punkt',
    design: 'SchemaPunkt.dc.html',
    route: 'punkt',
    image: 'schema-punkt-iphone',
  },
  {
    name: 'Schema bearbeiten: Verknüpfung ändern',
    design: 'SchemaVerknuepfen.dc.html',
    route: 'verknuepfen',
    image: 'schema-verknuepfen-iphone',
  },
  {
    name: 'Schema bearbeiten: keine Treffer',
    design: 'SchemaVerknuepfenLeer.dc.html',
    route: 'verknuepfen-leer',
    image: 'schema-verknuepfen-leer-iphone',
  },
  {
    name: 'Schema bearbeiten: Neue Karte',
    design: 'SchemaNeueKarte.dc.html',
    route: 'neue-karte',
    image: 'schema-neue-karte-iphone',
  },
  {
    name: 'Schema bearbeiten: leer',
    design: 'SchemaEditorLeer.dc.html',
    route: 'editor-leer',
    image: 'schema-editor-leer-iphone',
  },
];

/** Spielraum für Kantenglättung je Engine, wie in lernen.spec.ts. */
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

test.describe('Schema: pixelnah zum Design', () => {
  for (const c of CASES) {
    test(`${c.name}: Bildschirmfoto entspricht dem Design`, async ({
      page,
      context,
      browserName,
    }) => {
      const size = page.viewportSize();
      test.skip(size?.width !== 390 || size.height !== 844, 'nur für den iPhone-14-Viewport');
      await showDesign(page, c.design);
      await c.prepare?.(page);
      const design = await page.screenshot({ animations: 'disabled' });
      const designRects = await textRects(page);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/Juri/styleguide/schema/${c.route}`);
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--sim-safe-top', '47px');
      });
      await expect(page.locator('main').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      // Ein Sheet setzt den Fokus auf sein erstes Element; das Design zeigt keinen Fokusring.
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
      // Die Suche im Verknüpfen-Feld nimmt den Fokus; den Cursor blendet der Test aus.
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.style.setProperty(
          'caret-color',
          'transparent',
        );
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
