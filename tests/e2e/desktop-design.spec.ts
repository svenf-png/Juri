import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';
import { onboard } from './helpers';

/*
 * Eigene Desktop-Gestaltung (M13, ADR-017): Die App ist pixelnah zu den Artboards aus
 * scripts/build-desktop-designs.mjs (Entscheidung 2, A12), bei 1440 × 900 und bei 1920 × 1080.
 * Design und App rendern im selben Browser, die App mit den Beispieldaten der Vorschauen
 * (/styleguide/…) und ohne Animationen. Mit JURI_BILDER=1 schreibt der Vergleich die App-Bilder
 * bei 1440 × 900 nach docs/bilder/.
 */

interface Case {
  name: string;
  /** Artboard ohne Endung (Datei `<design>.dc.html` bei 1440, `<design>1920.dc.html` bei 1920). */
  design: string;
  /** Route der Vorschau; Einstellungen und Willkommen sind echte Routen. */
  route: string;
  image: string;
  /** Erst ein Profil anlegen (Einstellungen). */
  profile?: boolean;
  /** Nur bei 1440 × 900 (das Board gibt es nicht in zwei Größen). */
  only1440?: boolean;
  /** Veränderliches Verdecken (Zahlen, Hash, Datum), vor dem Bildschirmfoto. */
  prepare?: (page: Page) => Promise<void>;
  /** Anteil abweichender Pixel, den die Seite verträgt (Standard je Engine). */
  allow?: number;
}

/** Spielraum für Kantenglättung je Engine; Firefox und WebKit zeichnen Text etwas anders. */
const MAX_DIFF_RATIO = { chromium: 0.001, webkit: 0.002, firefox: 0.003 };

/** Daten und Zahlen, die sich von Lauf zu Lauf unterscheiden, durch feste Werte ersetzen. */
async function settingsPrepare(page: Page) {
  await page.evaluate(() => {
    const usage = document.querySelector('[data-testid="usage"]');
    if (usage) usage.textContent = '3,1 MB von 947 MB';
    const footer = [...document.querySelectorAll('p')].at(-1);
    if (footer) footer.textContent = 'Juri · Version 1.1.0 (1afa43c)';
  });
}

const CASES: Case[] = [
  { name: 'Heute', design: 'DesktopHeute', route: '/styleguide/heute', image: 'desktop-heute' },
  {
    name: 'Stapel',
    design: 'DesktopStapel',
    route: '/styleguide/stapel/desktop',
    image: 'desktop-stapel',
  },
  {
    name: 'Lernen: Frage',
    design: 'DesktopLernenFrage',
    route: '/styleguide/lernen/frage',
    image: 'desktop-lernen-frage',
  },
  {
    name: 'Lernen: Antwort',
    design: 'DesktopLernenAntwort',
    route: '/styleguide/lernen/antwort',
    image: 'desktop-lernen-antwort',
  },
  {
    name: 'Lernen: Schema',
    design: 'DesktopLernenSchema',
    route: '/styleguide/lernen/schema',
    image: 'desktop-lernen-schema',
  },
  {
    name: 'Lernen: Abdeckung',
    design: 'DesktopLernenAbdeckung',
    route: '/styleguide/abdeckung/lernen',
    image: 'desktop-lernen-abdeckung',
  },
  {
    name: 'Lernen: geschafft',
    design: 'DesktopFertig',
    route: '/styleguide/lernen/geschafft',
    image: 'desktop-fertig',
  },
  {
    name: 'Erfolge',
    design: 'DesktopErfolge',
    route: '/styleguide/erfolge/liste',
    image: 'desktop-erfolge',
  },
  {
    name: 'Fristen',
    design: 'DesktopFristen',
    route: '/styleguide/fristen/liste',
    image: 'desktop-fristen',
  },
  {
    name: 'Teilen',
    design: 'DesktopTeilen',
    route: '/styleguide/teilen/bereit',
    image: 'desktop-teilen',
  },
  {
    name: 'High fives',
    design: 'DesktopHighFive',
    route: '/styleguide/high-fives/ipad',
    image: 'desktop-high-fives',
  },
  {
    name: 'Einstellungen',
    design: 'DesktopEinstellungen',
    route: '/Juri/einstellungen',
    image: 'desktop-einstellungen',
    profile: true,
    prepare: settingsPrepare,
  },
  {
    name: 'Lernrhythmus',
    design: 'DesktopLernrhythmus',
    route: '/styleguide/lernrhythmus',
    image: 'desktop-lernrhythmus',
    // Der Regler ist ein Bedienelement des Browsers und sieht je Engine anders aus.
    allow: 0.004,
  },
  {
    name: 'Neue Karte',
    design: 'DesktopErstellen',
    route: '/styleguide/erstellen',
    image: 'desktop-erstellen',
  },
  {
    name: 'Neue Karte mit PDF',
    design: 'DesktopErstellenPdf',
    route: '/styleguide/abdeckung/ipad',
    image: 'desktop-erstellen-pdf',
  },
  {
    name: 'Felder aufziehen',
    design: 'DesktopAbdeckungEditor',
    route: '/styleguide/abdeckung/editor',
    image: 'desktop-felder',
  },
  {
    name: 'Schema bearbeiten',
    design: 'DesktopSchemaEditor',
    route: '/styleguide/schema/editor',
    image: 'desktop-schema-editor',
  },
  {
    name: 'Dialog',
    design: 'DesktopDialog',
    route: '/styleguide/fristen/neu',
    image: 'desktop-dialog',
    // Das Fenster ist 441 px hoch und steht auf einer halben Pixelzeile (bei 900 und bei 1080 px
    // Höhe): Chromium rundet seinen Text anders als das Board, jede Textzeile sitzt dann 1 px
    // versetzt. Maße und Lage stimmen (siehe Texte), nur die Kanten weichen ab.
    allow: 0.015,
  },
  {
    name: 'Willkommen',
    design: 'DesktopWillkommen',
    route: '/Juri/willkommen',
    image: 'desktop-willkommen',
  },
];

const SIZES = [
  { width: 1440, height: 900, suffix: '' },
  { width: 1920, height: 1080, suffix: '1920' },
] as const;

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

/**
 * Das Board nennt die Taste „Strg“. WebKit meldet sich als Mac, dort zeigt die App „⌘“ (Beschriftung
 * wie `modifierLabel`); das Board bekommt dieselbe Beschriftung, damit nur die Gestaltung verglichen wird.
 */
async function showBoard(page: Page, file: string) {
  await showDesign(page, file);
  await page.evaluate(() => {
    if (!/Macintosh/.test(navigator.userAgent)) return;
    for (const key of document.querySelectorAll('kbd')) {
      if (key.textContent.startsWith('Strg'))
        key.textContent = key.textContent.replace('Strg', '⌘');
    }
  });
}

test.describe('Desktop: pixelnah zum Design', () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      !testInfo.project.name.endsWith('-desktop'),
      `nur Desktop-Browser (dieses Projekt: ${browserName})`,
    );
  });

  for (const size of SIZES) {
    for (const c of CASES) {
      // Die Vergleiche bei 1920 × 1080 laufen in Chromium und WebKit; Firefox prüft 1440 × 900.
      test(`${c.name} (${String(size.width)} × ${String(size.height)}): Bildschirmfoto entspricht dem Design`, async ({
        page,
        context,
        browserName,
      }) => {
        test.skip(
          size.suffix !== '' && browserName === 'firefox',
          'Firefox vergleicht nur 1440 × 900',
        );
        await page.setViewportSize({ width: size.width, height: size.height });
        await showBoard(page, `${c.design}${size.suffix}.dc.html`);
        if (c.name === 'Dialog')
          await page.addStyleTag({ content: '[data-mask] { visibility: hidden }' });
        const design = await page.screenshot({ animations: 'disabled' });
        const designRects = await textRects(page);

        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (c.profile) {
          await onboard(page);
          await page.goto(c.route);
        } else {
          await page.goto(c.route.startsWith('/Juri/') ? c.route : `/Juri${c.route}`);
        }
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached();
        await page.evaluate(() => document.fonts.ready);
        if (c.name === 'Dialog') {
          // Das Datumsfeld ist ein Bedienelement des Browsers (Platzhalter, Symbol), das Board
          // zeigt Text: Beide bleiben leer, die Maße der Felder gelten weiter.
          await page.evaluate(() => {
            for (const input of document.querySelectorAll<HTMLElement>('input[type="date"]')) {
              input.style.setProperty('visibility', 'hidden');
            }
            const active = document.activeElement;
            if (active instanceof HTMLElement) active.blur();
          });
        }
        await c.prepare?.(page);
        const app = await page.screenshot({ animations: 'disabled' });

        if (process.env.JURI_BILDER === '1' && browserName === 'chromium' && size.suffix === '') {
          mkdirSync('docs/bilder', { recursive: true });
          writeFileSync(`docs/bilder/${c.image}.png`, app);
        }
        const diff = await pixelDiff(context, design, app);
        const ratio = diff.differing / diff.total;
        const allowed = c.allow ?? MAX_DIFF_RATIO[browserName];
        if (ratio > allowed) {
          const appRects = await textRects(page);
          for (const [text, rect] of Object.entries(designRects)) {
            if (appRects[text] !== rect) {
              console.log(
                `Lage ${c.image} "${text}": Design ${rect}, App ${appRects[text] ?? '-'}`,
              );
            }
          }
          mkdirSync('test-results/diff', { recursive: true });
          const tag = `${c.image}-${browserName}-${String(size.width)}`;
          writeFileSync(`test-results/diff/${tag}-design.png`, design);
          writeFileSync(`test-results/diff/${tag}-app.png`, app);
          await test.info().attach('design.png', { body: design, contentType: 'image/png' });
          await test.info().attach('app.png', { body: app, contentType: 'image/png' });
        }
        expect(diff.sameSize).toBe(true);
        expect(
          ratio,
          `${String(diff.differing)} von ${String(diff.total)} Pixeln weichen ab, Bereich: ${diff.area}`,
        ).toBeLessThanOrEqual(allowed);
      });
    }
  }
});
