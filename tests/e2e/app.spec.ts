import { expect, test } from '@playwright/test';
import { asInstalledApp, HEUTE_LEER, onboard, watchPage } from './helpers';

const WILLKOMMEN = { name: 'Willkommen bei Juri.', level: 1 } as const;

test.describe('Echte App (/Juri/)', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Heute lädt ohne Fehler und ohne fremde Anfragen', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!);
    await onboard(page);
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    await expect(page.getByText('Testinstanz · keine echten Lerndaten')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('liefert eine Content-Security-Policy ohne fremde Quellen', async ({ page }) => {
    await page.goto('/Juri/');
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/https?:|unsafe-/);
  });

  test('Styleguide zeigt die Tokens und lädt die eigenen Schriften', async ({ page }) => {
    await page.goto('/Juri/styleguide');
    await expect(page.getByRole('heading', { name: 'Styleguide', level: 1 })).toBeVisible();
    await expect(page.getByTestId('tile-violet')).toHaveCSS(
      'background-color',
      'rgb(106, 63, 224)',
    );
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        display: document.fonts.check('750 46px "Bricolage Grotesque Variable"'),
        text: document.fonts.check('500 17px "Figtree Variable"'),
      };
    });
    expect(fonts).toEqual({ display: true, text: true });
  });

  test('Karte dreht sich auf Tippen um', async ({ page }) => {
    await page.goto('/Juri/styleguide');
    const demo = page.getByRole('region', { name: 'Karte umdrehen' });
    await demo.getByRole('button', { name: 'Antwort zeigen' }).click();
    await expect(demo.getByRole('button', { name: 'Zurückdrehen' })).toBeEnabled();
    await expect(demo.getByText('Antwort', { exact: true })).toBeVisible();
    await demo.getByRole('button', { name: 'Zurückdrehen' }).click();
    await expect(demo.getByRole('button', { name: 'Zurückdrehen' })).toBeDisabled();
  });

  test('Deep Link über 404.html landet auf der richtigen Seite', async ({ page, browserName }) => {
    const response = await page.goto('/Juri/styleguide?x=1#oben');
    // Firefox liefert für diese Navigation kein Antwortobjekt (in der CI beobachtet).
    if (browserName !== 'firefox') expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Styleguide', level: 1 })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/Juri/styleguide');
    expect(new URL(page.url()).search).toBe('?x=1');
  });

  test('unbekannte Pfade führen zur Startseite, ohne Profil zum Onboarding', async ({ page }) => {
    await page.goto('/Juri/gibt-es-nicht');
    await expect(page.getByRole('heading', WILLKOMMEN)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/Juri/willkommen');
  });

  test('der Geräte-Check ist in der echten App nicht erreichbar', async ({ page }) => {
    await page.goto('/Juri/geraetecheck');
    await expect(page.getByRole('heading', WILLKOMMEN)).toBeVisible();
  });

  test('Manifest und Icons sind vollständig', async ({ request }) => {
    const res = await request.get('/Juri/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as {
      name: string;
      display: string;
      start_url: string;
      scope: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({
      name: 'Juri',
      display: 'standalone',
      start_url: '/Juri/',
      scope: '/Juri/',
      theme_color: '#FFFFFF',
      background_color: '#FFFFFF',
    });
    expect(manifest.icons.map((i) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of [...manifest.icons.map((i) => i.src), 'icons/app-180.png']) {
      const r = await request.get(`/Juri/${icon}`);
      expect(r.ok(), icon).toBe(true);
      expect(r.headers()['content-type']).toBe('image/png');
    }
  });

  test('Touch-Ziele sind überall mindestens 44 px hoch', async ({ page }) => {
    await page.goto('/Juri/willkommen');
    await page.getByLabel('Wie heißt du?').fill('Sven');
    const button = page.getByRole('button', { name: 'Los geht’s' });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    await page.getByRole('heading', HEUTE_LEER).waitFor();
    await page.goto('/Juri/einstellungen');
    await page.getByLabel('Name').fill('Sven F.');
    for (const path of [
      '/Juri/einstellungen',
      '/Juri/',
      '/Juri/stapel',
      '/Juri/styleguide',
      '/Juri/styleguide/heute',
    ]) {
      if (path !== '/Juri/einstellungen') await page.goto(path);
      await page.waitForLoadState('networkidle');
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a, button'))
          .map((el) => ({
            text: el.textContent.trim().slice(0, 30),
            h: el.getBoundingClientRect().height,
          }))
          // Toleranz: getBoundingClientRect rechnet mit Fließkomma, unter einer laufenden Transform-
          // Animation (Einblenden) liefert WebKit 43,99997 statt 44.
          .filter((b) => b.h > 0 && b.h < 43.9),
      );
      expect(small, path).toEqual([]);
    }
  });

  test('läuft nicht in fremden Frames', async ({ page, baseURL }) => {
    await page.setContent(`<iframe src="${baseURL!}/Juri/" width="390" height="600"></iframe>`);
    const frame = page.frameLocator('iframe');
    await expect(
      frame.getByText('Juri kann nicht in andere Seiten eingebettet werden.'),
    ).toBeVisible();
  });

  test('schaltet Animationen bei reduzierter Bewegung ab', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/Juri/');
    const name = await page
      .getByRole('heading', WILLKOMMEN)
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe('none');
  });
});

test.describe('Offline', () => {
  test('startet nach dem ersten Besuch ohne Netz', async ({ page, context, browserName }) => {
    await asInstalledApp(page);
    test.skip(browserName !== 'chromium', 'Service-Worker-Steuerung wird mit Chromium geprüft.');
    await page.goto('/Juri/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', WILLKOMMEN)).toBeVisible();
    await page.goto('/Juri/styleguide');
    await expect(page.getByRole('heading', { name: 'Styleguide', level: 1 })).toBeVisible();
    await context.setOffline(false);
  });
});
