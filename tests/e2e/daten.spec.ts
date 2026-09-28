import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { asInstalledApp, HEUTE_LEER, onboard, openSettings, watchPage } from './helpers';

const WILLKOMMEN = { name: 'Willkommen bei Juri.', level: 1 } as const;

test.describe('Daten, Profil, Backup (M1)', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Onboarding legt das Profil an, es übersteht einen Neustart', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!);
    await page.goto('/Juri/');
    await expect(page).toHaveURL(/\/Juri\/willkommen$/);
    const submit = page.getByRole('button', { name: 'Los geht’s' });
    await expect(submit).toBeDisabled();
    await page.getByLabel('Wie heißt du?').fill('  Sven  ');
    await submit.click();
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    if (page.viewportSize()!.width < 768) {
      await expect(page.getByRole('link', { name: 'Profil und Einstellungen' })).toHaveText('S');
    }
    await openSettings(page);
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await openSettings(page);
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
    await page.goto('/Juri/willkommen');
    await expect(page).toHaveURL(/\/Juri\/$/);
    expect(watch.errors).toEqual([]);
  });

  // Titel ohne Umlaut: Er wird Teil des Ausgabepfads, und die Dateiauswahl verliert sonst die Datei.
  test('Backup-Roundtrip: erstellen, umbenennen, einspielen', async ({
    page,
    baseURL,
  }, testInfo) => {
    const watch = watchPage(page, baseURL!);
    await onboard(page);
    await openSettings(page);
    await expect(page.getByTestId('last-backup')).toHaveText('Noch keins');

    await page.getByRole('button', { name: 'Backup erstellen' }).click();
    const sheet = page.getByRole('dialog', { name: /^Juri-Backup-\d{4}-\d\d-\d\d\.juri-backup$/ });
    await expect(sheet).toBeVisible();
    const downloading = page.waitForEvent('download');
    await sheet.getByRole('button', { name: 'Sichern oder teilen' }).click();
    const download = await downloading;
    const file = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(file);
    await expect(page.getByText('Backup gesichert.')).toBeVisible();
    await expect(page.getByTestId('last-backup')).toHaveText('Heute');
    expect(readFileSync(file).subarray(0, 2).toString()).toBe('PK');

    await page.getByLabel('Name').fill('Max');
    await page.getByRole('button', { name: 'Sichern', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sichern', exact: true })).toHaveCount(0);

    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Backup einspielen' }).click();
    await (await choosing).setFiles(file);
    const confirm = page.getByRole('dialog', { name: 'Alle Daten durch das Backup ersetzen?' });
    await expect(confirm.getByText('Sven', { exact: true })).toBeVisible();
    await confirm.getByRole('button', { name: 'Einspielen' }).click();
    await expect(page.getByText('Backup eingespielt.')).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
    await page.reload();
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
    // Auch keine CSP-Meldungen: zod läuft ohne Code-Erzeugung (src/domain/zod.ts).
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('lehnt Dateien ab, die kein Backup sind', async ({ page }, testInfo) => {
    await onboard(page);
    await page.goto('/Juri/einstellungen');
    const file = testInfo.outputPath('notiz.txt');
    writeFileSync(file, 'Hallo');
    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Backup einspielen' }).click();
    await (await choosing).setFiles(file);
    await expect(page.getByRole('alert')).toHaveText('Diese Datei ist kein Juri-Backup.');
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
  });
});

test.describe('Safari-Tab auf dem iPhone (A13)', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  });

  test('zeigt die Install-Anleitung und legt keine Datenbank an', async ({ page }) => {
    await page.goto('/Juri/');
    await expect(page).toHaveURL(/\/Juri\/installieren$/);
    await expect(
      page.getByRole('heading', { name: 'Erst installieren, dann lernen.', level: 1 }),
    ).toBeVisible();
    await page.goto('/Juri/willkommen');
    await expect(page).toHaveURL(/\/Juri\/installieren$/);
    const names = await page.evaluate(async () =>
      (await indexedDB.databases()).map((db) => db.name),
    );
    expect(names).not.toContain('juri');
  });
});

test.describe('Testinstanz: Testdaten', () => {
  test('Demo-Profil laden und alles zurücksetzen', async ({ page }) => {
    await asInstalledApp(page);
    page.on('dialog', (dialog) => void dialog.accept());
    await page.goto('/Juri/test/');
    await page.getByRole('button', { name: 'Mit Demo-Profil starten' }).click();
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
    await page.goto('/Juri/test/einstellungen');
    await expect(page.getByText('Zeit für ein neues Backup')).toBeVisible();
    await page.getByRole('button', { name: 'Alles zurücksetzen' }).click();
    await expect(page.getByRole('heading', WILLKOMMEN)).toBeVisible();
  });
});
