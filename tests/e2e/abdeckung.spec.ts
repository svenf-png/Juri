import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign, simulateStatusBar } from './design';

/*
 * Abdeckung, PDF und Foto (M6): pixelnah zu Abdeckung.dc.html, Erstellen.dc.html (Reiter
 * Abdeckung), iPadErstellen.dc.html und den in M6 ergänzten Artboards (Entscheidung 2) auf dem
 * iPhone 14 und dem iPad quer (A12). Design und App rendern im selben Browser, die App mit den
 * Beispieldaten der Designs (/styleguide/abdeckung/…) und ohne Animationen. Mit JURI_BILDER=1
 * schreibt der Vergleich die App-Bilder nach docs/bilder/.
 *
 * Zusätze der App, die das Design nicht zeigt (Blättern auf dem iPad, Feld löschen im PDF), tragen
 * `data-addition` und werden im Bild ausgeblendet; sie verschieben nichts.
 */

interface Case {
  name: string;
  design: string;
  route: string;
  image: string;
  width: number;
  height: number;
}

const PHONE = { width: 390, height: 844 };
const PAD = { width: 1180, height: 820 };

const CASES: Case[] = [
  {
    name: 'Abdeckung lernen: Feld gefragt',
    design: 'Abdeckung.dc.html',
    route: 'lernen',
    image: 'abdeckung-lernen-iphone',
    ...PHONE,
  },
  {
    name: 'Abdeckung lernen: Antwort und Bewertung',
    design: 'AbdeckungAntwort.dc.html',
    route: 'antwort',
    image: 'abdeckung-antwort-iphone',
    ...PHONE,
  },
  {
    name: 'Erstellen: Reiter Abdeckung',
    design: 'ErstellenAbdeckung.dc.html',
    route: 'leer',
    image: 'abdeckung-leer-iphone',
    ...PHONE,
  },
  {
    name: 'Erstellen: Bild oder PDF-Seite wählen',
    design: 'AbdeckungQuelle.dc.html',
    route: 'quelle',
    image: 'abdeckung-quelle-iphone',
    ...PHONE,
  },
  {
    name: 'Erstellen: Datei zu groß',
    design: 'MedienFehler.dc.html',
    route: 'fehler',
    image: 'abdeckung-fehler-iphone',
    ...PHONE,
  },
  {
    name: 'Erstellen: Bild wird verkleinert',
    design: 'AbdeckungVerkleinern.dc.html',
    route: 'verkleinern',
    image: 'abdeckung-verkleinern-iphone',
    ...PHONE,
  },
  {
    name: 'Erstellen: Bild gewählt',
    design: 'ErstellenAbdeckungBild.dc.html',
    route: 'bild',
    image: 'abdeckung-bild-iphone',
    ...PHONE,
  },
  {
    name: 'Felder aufziehen',
    design: 'AbdeckungEditor.dc.html',
    route: 'editor',
    image: 'abdeckung-editor-iphone',
    ...PHONE,
  },
  {
    name: 'Felder aufziehen: noch keine Felder',
    design: 'AbdeckungEditorLeer.dc.html',
    route: 'editor-leer',
    image: 'abdeckung-editor-leer-iphone',
    ...PHONE,
  },
  {
    name: 'PDF-Seite: Markierung zur Karte',
    design: 'PdfSeite.dc.html',
    route: 'pdf',
    image: 'pdf-seite-iphone',
    ...PHONE,
  },
  {
    name: 'iPad: Karte aus PDF erstellen',
    design: 'iPadErstellen.dc.html',
    route: 'ipad',
    image: 'pdf-erstellen-ipad',
    ...PAD,
  },
  {
    name: 'iPad: Abdeckung aus PDF-Seite',
    design: 'iPadErstellenAbdecken.dc.html',
    route: 'ipad-abdecken',
    image: 'pdf-abdecken-ipad',
    ...PAD,
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

test.describe('Abdeckung, PDF und Foto: pixelnah zum Design', () => {
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
      const designRects = await textRects(page);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/Juri/styleguide/abdeckung/${c.route}`);
      await expect(page.locator('main, section').first()).toBeVisible();
      if (c.width === 390) await simulateStatusBar(page);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
        for (const el of document.querySelectorAll<HTMLElement>('[data-addition]')) {
          el.style.visibility = 'hidden';
        }
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
