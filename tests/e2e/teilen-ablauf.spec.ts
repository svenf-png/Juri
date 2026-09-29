import { strToU8, zipSync } from 'fflate';
import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * Teilen und Import (M10) in der bedienten App: Stapel als .juri herunterladen (in der Cloud ohne
 * Web Share, siehe asInstalledApp), dieselbe Datei wieder öffnen (doppelter Import ändert nichts,
 * Kopie legt einen zweiten Stapel an), die Demo-Datei aus testdaten/, ungültige und leere Dateien,
 * die Import-Anleitung. Läuft auf iPhone, iPad und Desktop.
 */

const isDesktop = (name: string) => name.endsWith('-desktop');

async function seedDeck(page: Page) {
  await page.goto('/Juri/stapel');
  await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill('Deliktsrecht');
  await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
  await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Deliktsrecht' })).toBeVisible();
  await page
    .getByRole('link', { name: /Erste Karte anlegen/ })
    .first()
    .click();
  for (const [i, [front, back]] of [
    ['Was regelt § 823 I BGB?', 'Den Schadensersatz bei Verletzung absoluter Rechte.'],
    ['Was ist ein Rechtsgut?', 'Ein geschütztes Interesse.'],
  ].entries()) {
    await page.getByLabel('Vorderseite').fill(front!);
    await page.getByLabel('Rückseite').fill(back!);
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText(`${i + 1} von 5 heute`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Schließen' }).click();
}

/** „Datei öffnen“ tippen und die Datei im Dialog des Browsers wählen. */
async function chooseFile(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Datei öffnen', exact: true }).click();
  await (await chooser).setFiles(file);
}

test.describe('Teilen und Import', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!isDesktop(testInfo.project.name)) await asInstalledApp(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Leerzustand ohne Stapel, Anleitung und Kürzel', async ({ page, baseURL }, testInfo) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/teilen');
    await expect(page.getByRole('heading', { name: 'Teilen', level: 1 })).toBeVisible();
    await expect(page.getByText('Noch nichts zu teilen')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zu den Stapeln' })).toBeVisible();

    await page.getByRole('button', { name: 'So geht’s' }).click();
    const guide = page.getByRole('dialog', { name: 'So kommt die Datei in Juri' });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole('listitem')).toHaveCount(3);
    await guide.getByRole('button', { name: 'Schließen' }).click();
    await expect(guide).toBeHidden();

    if (isDesktop(testInfo.project.name)) {
      // „i“ öffnet den Datei-Dialog, Esc bricht ab.
      const chooser = page.waitForEvent('filechooser');
      await page.keyboard.press('i');
      await chooser;
    }
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Stapel herunterladen, wieder öffnen: doppelter Import ändert nichts, Kopie legt einen zweiten an', async ({
    page,
    baseURL,
  }, testInfo) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page);
    await page.goto('/Juri/teilen');
    await expect(page.getByText('Deliktsrecht.juri')).toBeVisible();
    await expect(page.getByText(/^2 Karten · [\d.,]+ (B|KB)$/)).toBeVisible();
    // Der Browser im Test meldet auch bei iPhone-Emulation „Desktop“; die Beschriftung folgt der Umgebung.
    const send = page.getByRole('button', {
      name: /^(AirDrop, Nachrichten, Mail …|Herunterladen)$/,
    });
    await expect(send).toBeEnabled();

    const downloading = page.waitForEvent('download');
    await send.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('Deliktsrecht.juri');
    const path = testInfo.outputPath('Deliktsrecht.juri');
    await download.saveAs(path);
    await expect(page.getByRole('status')).toContainText('Datei geladen');

    // Dieselbe Datei zurück: nichts Neues.
    await chooseFile(page, path);
    await expect(page.getByText('von Sven · 2 Karten')).toBeVisible();
    await expect(page.getByText('Alles schon auf dem neuesten Stand')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importieren' })).toBeDisabled();

    // Als Kopie: zweiter Stapel mit neuen Karten.
    await page.getByRole('radio', { name: /Als Kopie anlegen/ }).click();
    await expect(page.getByRole('button', { name: 'Importieren' })).toBeEnabled();
    await page.getByRole('button', { name: 'Importieren' }).click();
    const done = page.getByRole('dialog', { name: 'Stapel importiert' });
    await expect(done).toBeVisible();
    await expect(done).toContainText('Neue Karten');
    await expect(done).toContainText('2');
    await done.getByRole('button', { name: 'Zum Stapel' }).click();
    await expect(page.getByRole('heading', { name: 'Deliktsrecht (Kopie)' })).toBeVisible();
    await page.goto('/Juri/stapel');
    await expect(page.getByRole('link', { name: /Deliktsrecht \(Kopie\)/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Deliktsrecht 2 Karten/ })).toBeVisible();
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Demo-Datei aus testdaten/ importieren: zwei Stapel mit Bild, PDF und Verknüpfungen', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/teilen');
    await chooseFile(page, 'testdaten/demo-amtshaftung.juri');
    await expect(page.getByText('2 Stapel', { exact: true })).toBeVisible();
    await expect(page.getByText('von Mara · 13 Karten')).toBeVisible();
    await expect(page.getByText('Der Stapel kommt neu dazu.')).toBeVisible();
    await page.getByRole('button', { name: 'Importieren' }).click();
    const done = page.getByRole('dialog', { name: 'Stapel importiert' });
    await expect(done).toBeVisible();
    await expect(done).toContainText('13');
    await done.getByRole('button', { name: 'Schließen' }).click();

    await page.goto('/Juri/stapel');
    await expect(page.getByRole('link', { name: /Amtshaftung \(Demo\)/ }).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Prüfungsschemata \(Demo\)/ }).first(),
    ).toBeVisible();
    // Zweiter Import derselben Datei: nichts zu tun.
    await page.goto('/Juri/teilen');
    await chooseFile(page, 'testdaten/demo-amtshaftung.juri');
    await expect(page.getByText('Alles schon auf dem neuesten Stand')).toBeVisible();
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });

  test('ungültige und leere Dateien werden abgelehnt, nichts ändert sich', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/teilen');
    await chooseFile(page, {
      name: 'notiz.juri',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('Das ist kein ZIP.'),
    });
    await expect(page.getByText('Datei nicht importiert')).toBeVisible();
    await expect(page.getByText('Diese Datei ist kein Juri-Stapel.')).toBeVisible();

    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Andere Datei wählen' }).click();
    await (
      await chooser
    ).setFiles({
      name: 'leer.juri',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(0),
    });
    await expect(page.getByText('Die Datei ist leer.')).toBeVisible();

    // Ein Backup ist kein Stapel; die Meldung sagt, wohin es gehört.
    const backup = Buffer.from(
      zipSync({ 'manifest.json': strToU8(JSON.stringify({ format: 'juri-backup' })) }),
    );
    const again = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Andere Datei wählen' }).click();
    await (
      await again
    ).setFiles({
      name: 'Juri-Backup.juri-backup',
      mimeType: 'application/octet-stream',
      buffer: backup,
    });
    await expect(page.getByText('Backups spielst du in den Einstellungen ein.')).toBeVisible();
    await page.goto('/Juri/stapel');
    await expect(page.getByRole('button', { name: 'Ersten Stapel anlegen' })).toBeVisible();
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });
});
