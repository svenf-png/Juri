import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { pixelDiff, showDesign } from './design';
import { asInstalledApp, HEUTE_LEER, onboard, watchPage } from './helpers';

/*
 * Heute (M2): pixelnah zu Main.dc.html (iPhone 14) und iPadHeute.dc.html (iPad quer, A12).
 *
 * Design und App werden zur Testzeit im selben Browser gerendert, auch in WebKit:
 * 1. Pixelvergleich der beiden Bildschirmfotos.
 * 2. Lagevergleich wichtiger Elemente (±1 px), damit Abweichungen einen Namen bekommen.
 * Beides mit den Beispieldaten der Designs (/styleguide/heute) und ohne Animationen.
 * Mit JURI_BILDER=1 schreibt der Pixelvergleich die App-Bilder nach docs/bilder/ (npm run docs:bilder).
 */

type Layout = 'iphone' | 'ipad';

const DESIGN: Record<Layout, { file: string; name: string; width: number; height: number }> = {
  iphone: { file: 'Main.dc.html', name: 'heute-iphone', width: 390, height: 844 },
  ipad: { file: 'iPadHeute.dc.html', name: 'heute-ipad', width: 1180, height: 820 },
};

/** Spielraum für Kantenglättung je Engine; gemessen in Chromium: 0 Pixel auf iPhone und iPad. */
const MAX_DIFF_RATIO = 0.001;

/** Layout des Projekts, wenn sein Viewport genau dem Design-Rahmen entspricht. */
function layoutOf(page: Page): Layout | null {
  const size = page.viewportSize();
  for (const [layout, d] of Object.entries(DESIGN) as [Layout, (typeof DESIGN)[Layout]][]) {
    if (size?.width === d.width && size.height === d.height) return layout;
  }
  return null;
}

/** Vorschau mit Beispieldaten; auf dem iPhone mit simulierter Statusleiste (47 px). */
async function openPreview(page: Page, layout: Layout | null) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/Juri/styleguide/heute');
  if (layout === 'iphone') {
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--sim-safe-top', '47px');
    });
  }
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Paare aus Design-Element und App-Element, die an derselben Stelle liegen müssen. */
function pairs(page: Page, layout: Layout): [string, string, Locator][] {
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const common: [string, string, Locator][] = [
    ['Überschrift', 'h1', page.getByRole('heading', { level: 1 })],
    [
      'Frist-Chip',
      'a:has-text("Klausur Zivilrecht")',
      page
        .getByRole('link', { name: /Klausur Zivilrecht/ })
        .locator('span')
        .first(),
    ],
    ['Tagesziel', 'span:text-is("Tagesziel")', page.getByText('Tagesziel', { exact: true })],
    [
      'Lernen starten',
      'a:has-text("Lernen starten")',
      page.getByRole('link', { name: 'Lernen starten' }),
    ],
    [
      'Karten angelegt',
      'span:text-is("+3 Karten angelegt")',
      page.getByText('+3 Karten angelegt', { exact: true }),
    ],
    [
      'Rekordtag',
      'xpath=//div[text()="Mi"]/preceding-sibling::div',
      page.locator('ol > li').nth(1).locator('span').first(),
    ],
    [
      'Öffentliches Recht',
      'a:has-text("Öffentliches Recht")',
      page.getByRole('link', { name: /Öffentliches Recht/ }),
    ],
  ];
  if (layout === 'iphone') {
    return [
      ...common,
      [
        'Avatar',
        'a[aria-label="Profil und Einstellungen"]',
        page.getByRole('link', { name: 'Profil und Einstellungen' }).locator('span'),
      ],
      [
        'Tab Stapel',
        'nav a:has-text("Stapel") svg',
        nav.getByRole('link', { name: 'Stapel' }).locator('svg'),
      ],
      ['Neue Karte', 'a[aria-label="Neue Karte"]', nav.getByRole('link', { name: 'Neue Karte' })],
    ];
  }
  return [
    ...common,
    ['Wortmarke', 'aside > div.d', page.getByRole('img', { name: 'Juri' })],
    [
      'Lernrhythmus',
      'aside a:has-text("Lernrhythmus")',
      nav.getByRole('link', { name: 'Lernrhythmus' }),
    ],
    [
      'Neue Karte',
      'aside a:has-text("Neue Karte")',
      page.getByRole('link', { name: 'Neue Karte', exact: true }),
    ],
    [
      'Frist LL.M.',
      'span:text-is("LL.M. Modul Vertragsrecht")',
      page.getByText('LL.M. Modul Vertragsrecht', { exact: true }),
    ],
    ['Countdown', 'span:text-is("109 T")', page.getByText('109 T', { exact: true })],
    ['High five', 'a:has-text("Mara")', page.getByRole('link', { name: /Mara/ })],
  ];
}

test.describe('Heute: pixelnah zum Design', () => {
  test('Bildschirmfoto entspricht dem Design', async ({ page, context, browserName }) => {
    const layout = layoutOf(page);
    test.skip(!layout, 'nur für die Viewports der Designs');
    const { file, name } = DESIGN[layout!];
    await showDesign(page, file);
    const design = await page.screenshot({ animations: 'disabled' });
    await openPreview(page, layout);
    // Die fest stehende Tab-Bar liegt in Chromium auf einer eigenen Ebene, dort wird Text auf
    // dem halbtransparenten Grund anders geglättet (624 Pixel). Bei Scrollposition 0 ist
    // `absolute` wie im Design gleichwertig; dass sie unten stehen bleibt, prüft ein eigener Test.
    await page.evaluate(() => {
      const tabBar = Array.from(document.querySelectorAll('nav')).at(-1);
      if (tabBar) tabBar.style.position = 'absolute';
    });
    const app = await page.screenshot({ animations: 'disabled' });

    if (process.env.JURI_BILDER === '1' && browserName === 'chromium') {
      mkdirSync('docs/bilder', { recursive: true });
      writeFileSync(`docs/bilder/${name}.png`, app);
    }
    const diff = await pixelDiff(context, design, app);
    if (diff.differing > 0) {
      await test.info().attach('design.png', { body: design, contentType: 'image/png' });
      await test.info().attach('app.png', { body: app, contentType: 'image/png' });
    }
    expect(diff.sameSize).toBe(true);
    expect(
      diff.differing / diff.total,
      `${diff.differing} von ${diff.total} Pixeln weichen ab, Bereich: ${diff.area}`,
    ).toBeLessThanOrEqual(MAX_DIFF_RATIO);
  });

  test('Elemente liegen an denselben Stellen wie im Design', async ({ page }) => {
    const layout = layoutOf(page);
    test.skip(!layout, 'nur für die Viewports der Designs');
    await showDesign(page, DESIGN[layout!].file);
    const list = pairs(page, layout!);
    const expected = [];
    for (const [, selector] of list)
      expected.push(await page.locator(selector).first().boundingBox());

    await openPreview(page, layout);
    for (const [i, [name, , locator]] of list.entries()) {
      const actual = await locator.boundingBox();
      const want = expected[i]!;
      expect(actual, name).not.toBeNull();
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(
          Math.abs(actual![key] - want[key]),
          `${name}.${key}: ${actual![key]} statt ${want[key]}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe('Shell und Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Heute zeigt nach dem Onboarding den Leerzustand', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!);
    await onboard(page);
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await expect(page.getByText('Tagesziel', { exact: true })).toBeVisible();
    await expect(page.locator('ol > li')).toHaveCount(7);
    await page.getByRole('link', { name: 'Neue Karte anlegen' }).click();
    await expect(page.getByRole('heading', { name: 'Neue Karte', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Heute' }).click();
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    expect(watch.errors).toEqual([]);
  });

  test('Tab-Bar auf dem iPhone, Sidebar auf dem iPad', async ({ page }) => {
    await onboard(page);
    const wide = page.viewportSize()!.width >= 768;
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Heute' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Lernrhythmus' })).toHaveCount(wide ? 1 : 0);
    await expect(page.getByRole('link', { name: 'Profil und Einstellungen' })).toHaveCount(
      wide ? 0 : 1,
    );

    for (const [label, heading] of [
      ['Stapel', 'Stapel'],
      ['Erfolge', 'Erfolge'],
      ['Teilen', 'Teilen'],
    ] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    }
    await page.getByRole('link', { name: 'Neue Karte', exact: true }).click();
    await expect(page).toHaveURL(/\/Juri\/neu$/);
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
  });

  test('kein waagrechtes Scrollen, Tab-Bar bleibt unten', async ({ page }) => {
    await openPreview(page, null);
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.width);
    if (page.viewportSize()!.width < 768) {
      const bar = await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox();
      expect(bar!.y + bar!.height).toBe(page.viewportSize()!.height);
      expect(bar!.height).toBe(86);
    }
  });

  test('übernimmt Schrift und Farben der Tokens', async ({ page }) => {
    await openPreview(page, null);
    const h1 = page.getByRole('heading', { level: 1 });
    const wide = page.viewportSize()!.width >= 1100;
    await expect(h1).toHaveCSS('font-size', wide ? '72px' : '46px');
    await expect(h1).toHaveCSS('font-weight', wide ? '780' : '750');
    await expect(h1.locator('span')).toHaveCSS('color', 'rgb(106, 63, 224)');
    await expect(page.getByRole('link', { name: 'Lernen starten' })).toHaveCSS(
      'background-color',
      'rgb(106, 63, 224)',
    );
  });
});
