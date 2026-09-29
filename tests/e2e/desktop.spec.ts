import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { HEUTE_LEER, onboard, openSettings, watchPage } from './helpers';

/*
 * Browser-Version (M7, Entscheidung 12): Chrome, Safari (WebKit) und Firefox auf dem Desktop bei
 * 1440 × 900, ohne Touch. Keine Emulation der installierten App: Der Desktop braucht kein
 * Sperrbild (A13 gilt nur für iPhone und iPad).
 */

const DEMO_PDF = readFileSync('testdaten/demo-skript.pdf');

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    !testInfo.project.name.endsWith('-desktop'),
    `nur Desktop-Browser (dieses Projekt: ${browserName})`,
  );
});

/** Web Share wie in Chrome unter Windows oder Safari auf dem Mac: vorhanden, aber unerwünscht. */
async function withWebShare(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __shared: number }).__shared = 0;
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: () => {
        (window as unknown as { __shared: number }).__shared += 1;
        return Promise.resolve();
      },
      configurable: true,
    });
  });
}

test.describe('Kein Sperrbild auf dem Desktop', () => {
  test('Start, Onboarding und Daten laufen im Tab, ohne installiert zu sein', async ({ page }) => {
    await page.goto('/Juri/');
    await expect(page).toHaveURL(/\/Juri\/willkommen$/);
    expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(false);
    await page.getByLabel('Wie heißt du?').fill('Sven');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    const names = await page.evaluate(async () =>
      (await indexedDB.databases()).map((db) => db.name),
    );
    expect(names).toContain('juri');
  });

  test('die Install-Anleitung ist auf dem Desktop nicht erreichbar', async ({ page }) => {
    await page.goto('/Juri/installieren');
    await expect(page).not.toHaveURL(/installieren/);
    await expect(
      page.getByRole('heading', { name: 'Erst installieren, dann lernen.' }),
    ).toHaveCount(0);
  });
});

test.describe('Datei-Dialog und Download statt Web Share', () => {
  test('Backup wird heruntergeladen, auch wenn der Browser Web Share kennt', async ({
    page,
  }, testInfo) => {
    await withWebShare(page);
    await onboard(page);
    await openSettings(page);
    await expect(page.getByText(/Download-Ordner/)).toBeVisible();
    await expect(page.getByText(/iCloud/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Backup erstellen' }).click();
    const sheet = page.getByRole('dialog', { name: /\.juri-backup$/ });
    await expect(sheet.getByText(/iCloud/)).toHaveCount(0);
    const downloading = page.waitForEvent('download');
    await sheet.getByRole('button', { name: 'Herunterladen' }).click();
    const download = await downloading;
    const file = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(file);
    expect(readFileSync(file).subarray(0, 2).toString()).toBe('PK');
    await expect(page.getByText('Backup gesichert.')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __shared: number }).__shared)).toBe(0);

    // Einspielen über den Datei-Dialog des Browsers.
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Backup einspielen' }).click();
    await (await choosing).setFiles(file);
    await page
      .getByRole('dialog', { name: 'Alle Daten durch das Backup ersetzen?' })
      .getByRole('button', { name: 'Einspielen' })
      .click();
    await expect(page.getByText('Backup eingespielt.')).toBeVisible();
  });
});

test.describe('Zeiger und Tastatur', () => {
  test('„n“ öffnet die neue Karte, in Feldern bleibt „n“ Text', async ({ page }) => {
    await onboard(page);
    await page.goto('/Juri/stapel');
    // Erst wenn die Seite steht, hört sie auf Tasten.
    await expect(page.getByRole('heading', { name: 'Stapel', level: 1 })).toBeVisible();
    await page.keyboard.press('n');
    await expect(page).toHaveURL(/\/Juri\/neu$/);
    const front = page.getByLabel('Vorderseite');
    await front.click();
    await page.keyboard.type('nein/n');
    await expect(front).toHaveValue('nein/n');
    await expect(page).toHaveURL(/\/Juri\/neu$/);
  });

  test('„/“ führt zur Suche der Stapel', async ({ page }) => {
    await onboard(page);
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await page.keyboard.press('/');
    await expect(page).toHaveURL(/\/Juri\/stapel$/);
  });

  test('Strg+Enter speichert die Karte aus dem Textfeld heraus', async ({ page }) => {
    await onboard(page);
    await page.goto('/Juri/stapel');
    await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Name').fill('Sachenrecht');
    await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
    await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
    await expect(page.getByRole('heading', { name: 'Sachenrecht' })).toBeVisible();

    await page.goto('/Juri/neu');
    await page.getByLabel('Vorderseite').fill('Was ist Besitz?');
    const back = page.getByLabel('Rückseite');
    await back.fill('Tatsächliche Sachherrschaft.');
    await back.press('Control+Enter');
    await expect(page.getByRole('status').filter({ hasText: '+1' })).toBeVisible();
    await expect(page.getByLabel('Vorderseite')).toHaveValue('');
  });

  test('Lernen: Leertaste dreht, Zahl bewertet, Hinweis nennt „Klicken“', async ({ page }) => {
    page.on('dialog', (dialog) => void dialog.accept());
    await page.goto('/Juri/test/');
    await page.getByLabel('Wie heißt du?').fill('Sven');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    // Erst wenn das Profil geschrieben ist, sonst verwirft der Seitenwechsel es.
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await page.goto('/Juri/test/einstellungen');
    await page.getByRole('button', { name: 'Demo-Profil laden' }).click();
    // Erst wenn die Karten geschrieben sind, ist das Demo-Profil da.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const open = indexedDB.open('juri-test');
              open.onerror = () => {
                resolve(0);
              };
              open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains('cards')) {
                  db.close();
                  resolve(0);
                  return;
                }
                const count = db.transaction('cards').objectStore('cards').count();
                count.onsuccess = () => {
                  db.close();
                  resolve(count.result);
                };
              };
            }),
        ),
      )
      .toBeGreaterThan(5);
    await page.goto('/Juri/test/lernen');
    await expect(page.getByText('Klicken zum Umdrehen').first()).toBeVisible();
    await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
    await page.keyboard.press(' ');
    await page.keyboard.press('3');
    await expect(page.getByText(/^2\/\d+$/)).toBeVisible();
  });

  test('Bild-Abdeckung im PDF: Strg+Rad und Tasten zoomen, Bild auf/ab blättert', async ({
    page,
  }) => {
    const watch = watchPage(page, 'http://127.0.0.1:4173', { allow404: true });
    await onboard(page);
    await page.goto('/Juri/neu');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ]);
    await chooser.setFiles({
      name: 'Demo-Skript Sachenrecht.pdf',
      mimeType: 'application/pdf',
      buffer: DEMO_PDF,
    });
    const pane = page.getByRole('region', { name: 'PDF' });
    await expect(pane).toBeVisible();
    await expect(page.getByRole('button', { name: /S\. 1 \/ 50/ })).toBeVisible();

    const zoomed = pane.locator('[style*="scale("]').first();
    const scale = async () =>
      Number(/scale\(([\d.]+)\)/.exec((await zoomed.getAttribute('style')) ?? '')?.[1] ?? '1');
    await expect.poll(scale).toBe(1);

    // Strg+Rad (Trackpad-Zwicken meldet sich ebenso) zoomt um den Mauszeiger.
    const box = (await zoomed.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await expect.poll(scale).toBeGreaterThan(1.5);

    await page.keyboard.press('0');
    await expect.poll(scale).toBe(1);
    await page.keyboard.press('+');
    await expect.poll(scale).toBeCloseTo(1.5);

    await page.keyboard.press('PageDown');
    await expect(page.getByRole('button', { name: /S\. 2 \/ 50/ })).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('button', { name: /S\. 50 \/ 50/ })).toBeVisible();
    await page.keyboard.press('Home');
    await expect(page.getByRole('button', { name: /S\. 1 \/ 50/ })).toBeVisible();
    expect(watch.errors).toEqual([]);
  });

  test('Hover lässt das Design unverändert, Knöpfe zeigen den Zeiger, Fokus ist sichtbar', async ({
    page,
  }) => {
    await onboard(page);
    const look = (el: Element) => {
      const style = getComputedStyle(el);
      return `${style.color}|${style.backgroundColor}|${style.boxShadow}`;
    };
    for (const control of [
      page.getByRole('link', { name: 'Stapel', exact: true }),
      page.getByRole('link', { name: 'Neue Karte' }).first(),
    ]) {
      const before = await control.evaluate(look);
      await control.hover();
      expect(await control.evaluate(look)).toBe(before);
    }
    await page.goto('/Juri/stapel');
    const button = page.getByRole('button', { name: 'Ersten Stapel anlegen' });
    expect(await button.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement!);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).not.toBe('0px');
  });
});

/** Nichts ragt über den Rand: kein waagrechtes Scrollen, alle Bedienelemente im Fenster. */
async function expectNothingCut(page: Page, where: string) {
  const report = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const cut: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('h1, h2, button, a, input, textarea')) {
      if (el.closest('.visually-hidden, [aria-hidden="true"], [inert]')) continue;
      if (el.classList.contains('visually-hidden')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.left < -1 || rect.right > width + 1) {
        cut.push(
          `${el.tagName} ${el.textContent.trim().slice(0, 30)} ${String(Math.round(rect.left))}..${String(Math.round(rect.right))}`,
        );
      }
    }
    return { scroll: document.documentElement.scrollWidth - width, cut };
  });
  expect(report.scroll, `${where}: waagrechtes Scrollen`).toBeLessThanOrEqual(0);
  expect(report.cut, `${where}: abgeschnitten`).toEqual([]);
}

test.describe('Abnahme 1440 × 900: nichts abgeschnitten', () => {
  test('alle Bereiche der Testinstanz mit Demo-Daten', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/Juri/test/');
    await page.getByLabel('Wie heißt du?').fill('Sven');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    // Erst wenn das Profil geschrieben ist, sonst verwirft der Seitenwechsel es.
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await page.goto('/Juri/test/einstellungen');
    await page.getByRole('button', { name: 'Demo-Profil laden' }).click();
    await page.getByRole('button', { name: 'Demo-Stapel hinzufügen' }).click();
    await expect(page.getByText(/Stapel mit \d+ Karten hinzugefügt|schon da/)).toBeVisible();

    const routes = [
      ['', 'Letzte 7 Tage'],
      ['stapel', 'Stapel'],
      ['neu', 'Neue Karte'],
      ['lernen', 'Antwort zeigen'],
      ['einstellungen', 'Einstellungen'],
      ['einstellungen/lernrhythmus', 'Lernrhythmus'],
      ['erfolge', 'Erfolge'],
      ['fristen', 'Fristen'],
      ['teilen', 'Teilen'],
      ['high-fives', 'High fives'],
    ] as const;
    for (const [route, text] of routes) {
      await page.goto(`/Juri/test/${route}`);
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
      await page.waitForTimeout(400);
      await expectNothingCut(page, `/${route}`);
    }

    // Ein Stapel im Master-Detail und das Sheet „Neuer Stapel“.
    await page.goto('/Juri/test/stapel');
    await page.locator('a[href*="/stapel/"]').first().click();
    await expectNothingCut(page, 'Stapel-Detail');
    await page.getByRole('button', { name: '+ Stapel' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    // Das Sheet fährt 550 ms hinein; erst danach sitzt es.
    await expect
      .poll(async () => {
        const box = (await sheet.boundingBox())!;
        return box.y + box.height;
      })
      .toBeLessThanOrEqual(900);
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1440);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Installierbarkeit als Desktop-PWA', () => {
  for (const [base, name] of [
    ['/Juri/', 'Juri'],
    ['/Juri/test/', 'Juri Test'],
  ] as const) {
    test(`${name}: Manifest, Symbole und Service Worker sind vollständig`, async ({
      page,
      request,
    }) => {
      await page.goto(base);
      const href = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(href).toBe(`${base}manifest.webmanifest`);
      const manifest = (await (await request.get(href!)).json()) as {
        id: string;
        name: string;
        display: string;
        scope: string;
        start_url: string;
        icons: { src: string; sizes: string; purpose?: string }[];
      };
      expect(manifest).toMatchObject({ id: base, name, display: 'standalone', scope: base });
      expect(manifest.start_url).toBe(base);
      const sizes = manifest.icons.map((i) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
      for (const icon of manifest.icons) {
        const response = await request.get(`${base}${icon.src}`);
        expect(response.status(), icon.src).toBe(200);
        expect(response.headers()['content-type']).toContain('image/png');
      }
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const registration = await navigator.serviceWorker.ready;
            return registration.active?.state ?? null;
          }),
        )
        .toBe('activated');
    });
  }

  test('Chromium meldet keine Installations-Hindernisse', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Die Prüfung gibt es nur in Chromium (CDP).');
    await page.goto('/Juri/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    const client = await page.context().newCDPSession(page);
    const result = (await client.send('Page.getInstallabilityErrors')) as {
      installabilityErrors: { errorId: string }[];
    };
    // „in-incognito“ meldet Chromium für jeden Testkontext; es sagt nichts über die App.
    const errors = result.installabilityErrors
      .map((e) => e.errorId)
      .filter((id) => id !== 'in-incognito');
    expect(errors).toEqual([]);
  });
});
