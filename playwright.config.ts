import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-Tests gegen den fertigen Build, ausgeliefert wie auf GitHub Pages (scripts/serve-pages.mjs).
 *
 * Viewports der Testgeräte (Entscheidung 7): iPhone 14, iPhone 16 Pro Max, iPad Air 11 Zoll.
 * Desktop-Browser (M7, Entscheidung 12): Chromium, Firefox und WebKit bei 1440 × 900 ohne Touch.
 * WebKit ist die Engine von Safari und läuft in der CI. Lokal steht in der Entwicklungsumgebung
 * nur Chromium bereit: `PW_CHROMIUM_ONLY=1` beschränkt auf die Chromium-Projekte,
 * `PW_CHROMIUM_PATH` zeigt auf ein vorinstalliertes Chromium.
 */
const port = Number(process.env.PORT ?? 4173);
const chromiumOnly = process.env.PW_CHROMIUM_ONLY === '1';
const chromiumPath = process.env.PW_CHROMIUM_PATH;

const iphone14 = { width: 390, height: 844 };
const iphone16ProMax = { width: 440, height: 956 };
const ipadQuer = { width: 1180, height: 820 };
const ipadHoch = { width: 820, height: 1180 };
const desktop = { width: 1440, height: 900 };

/** Bildvergleiche mit den Design-Dateien gibt es nur für die Touch-Geräte. */
const designSpecs = /\/(heute|stapel|lernen|schema|abdeckung|fristen|erfolge)\.spec\.ts$/;

const webkitProjects = [
  {
    name: 'webkit-iphone14',
    use: { ...devices['iPhone 14'], viewport: iphone14 },
  },
  {
    name: 'webkit-iphone16promax',
    use: { ...devices['iPhone 14'], viewport: iphone16ProMax },
  },
  {
    name: 'webkit-ipad-quer',
    use: { ...devices['iPad Pro 11 landscape'], viewport: ipadQuer },
  },
  {
    name: 'webkit-ipad-hoch',
    use: { ...devices['iPad Pro 11'], viewport: ipadHoch },
  },
  {
    name: 'webkit-desktop',
    testIgnore: designSpecs,
    use: { ...devices['Desktop Safari'], viewport: desktop },
  },
  {
    name: 'firefox-desktop',
    testIgnore: designSpecs,
    use: { ...devices['Desktop Firefox'], viewport: desktop },
  },
];

const chromiumProjects = [
  {
    name: 'chromium-iphone14',
    use: {
      ...devices['Desktop Chrome'],
      viewport: iphone14,
      hasTouch: true,
      launchOptions: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        // Sheets sind <dialog> in eigener Ebene; Chromium zeichnet sie mit Graustufen-Glättung, die
        // Design-Seiten mit Farbsäumen (LCD). Ohne LCD-Text sind beide gleich (Bildvergleiche).
        args: ['--disable-lcd-text'],
      },
    },
  },
  {
    name: 'chromium-ipad-quer',
    use: {
      ...devices['Desktop Chrome'],
      viewport: ipadQuer,
      hasTouch: true,
      launchOptions: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        // Sheets sind <dialog> in eigener Ebene; Chromium zeichnet sie mit Graustufen-Glättung, die
        // Design-Seiten mit Farbsäumen (LCD). Ohne LCD-Text sind beide gleich (Bildvergleiche).
        args: ['--disable-lcd-text'],
      },
    },
  },
  {
    name: 'chromium-desktop',
    testIgnore: designSpecs,
    use: {
      ...devices['Desktop Chrome'],
      viewport: desktop,
      launchOptions: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        args: ['--disable-lcd-text'],
      },
    },
  },
];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
  },
  projects: chromiumOnly ? chromiumProjects : [...webkitProjects, ...chromiumProjects],
  webServer: {
    command: `node scripts/serve-pages.mjs --port ${port}`,
    url: `http://127.0.0.1:${port}/Juri/`,
    reuseExistingServer: !process.env.CI,
  },
});
