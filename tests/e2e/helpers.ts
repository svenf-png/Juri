import type { Page } from '@playwright/test';

/**
 * Sammelt Konsolenfehler, Seitenfehler und Anfragen an fremde Origins.
 * Deep Links laufen wie auf GitHub Pages über 404.html; die zugehörige Konsolenmeldung
 * zum Status 404 ist erwartet und wird mit `allow404` ignoriert.
 */
export function watchPage(page: Page, origin: string, { allow404 = false } = {}) {
  const errors: string[] = [];
  const foreign: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (allow404 && msg.text().includes('status of 404')) return;
    errors.push(msg.text());
  });
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
      foreign.push(url);
    }
  });
  return { errors, foreign };
}

/**
 * Wie die installierte Home-Bildschirm-App: `navigator.standalone` wie auf iOS, damit die
 * Install-Anleitung (A13) nicht greift. Web Share ist aus, Backups kommen als Download an.
 */
export async function asInstalledApp(page: Page) {
  await page.addInitScript(() => {
    // Am Objekt selbst, damit keine Eigenschaft des Browsers die Werte überdeckt.
    Object.defineProperty(navigator, 'standalone', { get: () => true, configurable: true });
    for (const name of ['share', 'canShare']) {
      Object.defineProperty(navigator, name, { value: undefined, configurable: true });
    }
  });
}

/** Onboarding bis zur Startseite. */
export async function onboard(page: Page, base = '/Juri/', name = 'Sven') {
  await page.goto(base);
  await page.getByLabel('Wie heißt du?').fill(name);
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await page.getByText(`Hallo, ${name}`).waitFor();
}
