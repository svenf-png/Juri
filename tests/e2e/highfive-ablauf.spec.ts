import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * High fives (M11) in der bedienten App: Leerzustand, Bildkarte als PNG, Demo-Datei mit Absender-ID
 * und High five importieren (Kontakt, Feier, Heute und Erfolge), High five geben (einmal je Kontakt
 * und Lerntag), Gruß-Datei und Mitreise, Kontakt umbenennen und entfernen. Läuft auf iPhone, iPad und
 * Desktop. Beschriftungen, die der Umgebung folgen, werden mit beiden Texten geprüft (der Browser im
 * Test meldet auch bei iPhone-Emulation „Desktop“).
 */

const isDesktop = (name: string) => name.endsWith('-desktop');
const DEMO = 'testdaten/demo-amtshaftung.juri';
const SHARE = /^(Bild teilen|Bild speichern)$/;

/** Demo-Datei über „Teilen“ importieren; endet beim Sheet „Stapel importiert“. */
async function importDemo(page: Page) {
  await page.goto('/Juri/teilen');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Datei öffnen', exact: true }).click();
  await (await chooser).setFiles(DEMO);
  await expect(page.getByText('von Mara · 13 Karten')).toBeVisible();
  await page.getByRole('button', { name: 'Importieren' }).click();
  await expect(page.getByRole('dialog', { name: 'Stapel importiert' })).toBeVisible();
}

/** Ab 1280 px (Desktop-Gestaltung, ADR-017) steht „Deine Leute“ fest neben den Spalten, sonst als Sheet. */
const wide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;
const people = (page: Page) =>
  wide(page)
    ? page.getByRole('complementary', { name: 'Deine Leute' })
    : page.getByRole('dialog', { name: 'Deine Leute' });
async function openPeople(page: Page) {
  if (!wide(page)) await page.getByRole('button', { name: 'Alle anzeigen' }).click();
}

test.describe('High fives', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!isDesktop(testInfo.project.name)) await asInstalledApp(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Leerzustand, „einfach so“ und die Bildkarte als PNG', async ({
    page,
    baseURL,
  }, testInfo) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/high-fives');
    await expect(page.getByRole('heading', { name: 'High fives', level: 1 })).toBeVisible();
    await expect(page.getByText('Noch keine Kontakte')).toBeVisible();
    await expect(page.getByText('Neu von deinen Leuten')).toHaveCount(0);

    await page.getByRole('button', { name: 'Einfach so ein High five' }).click();
    const overlay = page.getByRole('dialog', { name: 'High five!' });
    await expect(overlay).toContainText('Einfach so. Such dir aus, an wen.');
    await overlay.getByRole('button', { name: 'Per Nachricht senden …' }).click();

    const sheet = page.getByRole('dialog', { name: 'Bildkarte' });
    const image = sheet.getByRole('img', { name: 'Sven schickt dir ein High five. Einfach so.' });
    await expect(image).toBeVisible();
    // Das PNG ist 1080 × 1350 und echt (nicht leer).
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080);
    await expect(sheet.getByRole('button', { name: 'Als Gruß-Datei für Juri' })).toHaveCount(0);

    const downloading = page.waitForEvent('download');
    await sheet.getByRole('button', { name: SHARE }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('High five.png');
    const path = testInfo.outputPath('High five.png');
    await download.saveAs(path);
    const bytes = readFileSync(path);
    expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(bytes.length).toBeGreaterThan(5_000);
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Demo-Datei: Kontakt, Feier, Heute und Erfolge, geben, Gruß-Datei und Mitreise', async ({
    page,
    baseURL,
  }, testInfo) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await importDemo(page);
    const done = page.getByRole('dialog', { name: 'Stapel importiert' });
    await expect(done).toContainText('Dazu ein High five ansehen');

    // Zeile in Erfolge und Chip in Heute vor dem Ansehen: das High five ist noch ungesehen.
    await done.getByRole('button', { name: 'Schließen' }).click();
    await page.goto('/Juri/erfolge');
    // iPhone: Zeile, iPad und Desktop: Kachel (Erfolge.dc.html, iPadErfolge.dc.html).
    await expect(
      page
        .getByRole('link', { name: /1\s*High five bekommen/ })
        .locator('visible=true')
        .first(),
    ).toBeVisible();
    await page.goto('/Juri/');
    // Der Chip steht nur im iPad-Design (A17).
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      await expect(
        page.getByRole('link', { name: /Mara.*1\.000 Wiederholungen.*High five/ }),
      ).toBeVisible();
    }

    // Die Feier kommt einmal; „Schön“ schließt sie, danach steht das High five unter „Bekommen“.
    await page.goto('/Juri/high-fives');
    const feier = page.getByRole('dialog', { name: 'High five!' });
    await expect(feier).toContainText('Mara schickt dir ein High five für 12 Tage in Folge.');
    await feier.getByRole('button', { name: 'Schön' }).click();
    await expect(feier).toBeHidden();
    await expect(page.getByText('Bekommen', { exact: true })).toBeVisible();
    await expect(page.getByText('für 12 Tage in Folge')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'High fives', level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'High five!' })).toHaveCount(0);

    // Geben: ein High five je Kontakt und Lerntag; der Knopf bleibt lila, ein zweites Tippen zeigt dasselbe.
    const give = page.getByRole('button', { name: 'High five an Mara' });
    await expect(page.getByText('1.000 Wiederholungen', { exact: true })).toBeVisible();
    await give.click();
    const overlay = page.getByRole('dialog', { name: 'High five!' });
    await expect(overlay).toContainText('An Mara für „1.000 Wiederholungen“');
    await overlay.getByRole('button', { name: 'Schließen' }).click();
    await expect(give).toHaveAttribute('aria-pressed', 'true');
    await give.click();
    await expect(overlay).toContainText('An Mara für „1.000 Wiederholungen“');

    // Bildkarte und Gruß-Datei.
    await overlay.getByRole('button', { name: 'Per Nachricht senden …' }).click();
    const sheet = page.getByRole('dialog', { name: 'Bildkarte' });
    await expect(
      sheet.getByRole('img', {
        name: 'Sven schickt Mara ein High five für 1.000 Wiederholungen.',
      }),
    ).toBeVisible();
    const greeting = sheet.getByRole('button', { name: 'Als Gruß-Datei für Juri' });
    await expect(greeting).toBeEnabled();
    const downloading = page.waitForEvent('download');
    await greeting.click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('High five von Sven.juri-gruss');
    const greetingPath = testInfo.outputPath('High five von Sven.juri-gruss');
    await download.saveAs(greetingPath);
    const manifest = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(greetingPath)))['manifest.json']!),
    ) as { format: string; sender: { name: string; id: string }; highFives: { to: string }[] };
    expect(manifest.format).toBe('juri-gruss');
    expect(manifest.sender.name).toBe('Sven');
    expect(manifest.highFives).toHaveLength(1);
    expect(manifest.highFives[0]?.to).toBe('demo-mara');
    await sheet.getByRole('button', { name: 'Zurück' }).click();
    await expect(sheet).toBeHidden();

    // Die eigene Gruß-Datei öffnen: kommt von dir selbst, nichts ändert sich.
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Gruß-Datei öffnen' }).click();
    // Als Puffer: Pfade mit Leerzeichen und „ß“ (Testname) nimmt der Dateidialog im Test nicht an.
    await (
      await chooser
    ).setFiles({
      name: 'gruss.juri-gruss',
      mimeType: 'application/octet-stream',
      buffer: readFileSync(greetingPath),
    });
    const error = page.getByRole('dialog', { name: 'Datei nicht angenommen' });
    await expect(error).toContainText('Dieses High five hast du selbst geschickt.');
    await error.getByRole('button', { name: 'Schließen' }).click();

    // Ein Stapel ist keine Gruß-Datei.
    const chooser2 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Gruß-Datei öffnen' }).click();
    await (await chooser2).setFiles(DEMO);
    await expect(page.getByRole('dialog', { name: 'Datei nicht angenommen' })).toContainText(
      'Das ist ein Stapel und keine Gruß-Datei.',
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

    // Mitreise: Der Export trägt Absender-ID und das gegebene High five.
    await page.goto('/Juri/teilen');
    const send = page.getByRole('button', {
      name: /^(AirDrop, Nachrichten, Mail …|Herunterladen)$/,
    });
    await expect(send).toBeEnabled();
    const exporting = page.waitForEvent('download');
    await send.click();
    const file = await exporting;
    const filePath = testInfo.outputPath('export.juri');
    await file.saveAs(filePath);
    const exported = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(filePath)))['manifest.json']!),
    ) as { sender: { id: string }; highFives?: { to: string; win: string }[] };
    expect(exported.sender.id).toBe(manifest.sender.id);
    expect(exported.highFives).toMatchObject([{ to: 'demo-mara', win: '1.000 Wiederholungen' }]);

    // Mitreise abgeschaltet: kein High five und kein Snapshot in der Datei.
    await page.getByRole('switch', { name: 'Erfolge mitschicken' }).click();
    await expect(send).toBeEnabled();
    const exportingOff = page.waitForEvent('download');
    await send.click();
    const off = await exportingOff;
    const offPath = testInfo.outputPath('export-ohne.juri');
    await off.saveAs(offPath);
    const without = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(offPath)))['manifest.json']!),
    ) as { sender: { id: string }; highFives?: unknown; achievements?: unknown };
    expect(without.sender.id).toBe(manifest.sender.id);
    expect(without.highFives).toBeUndefined();
    expect(without.achievements).toBeUndefined();
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Kontaktliste: umbenennen, ein doppelter Import ändert nichts, entfernen', async ({
    page,
  }) => {
    await onboard(page);
    await importDemo(page);
    await page
      .getByRole('dialog', { name: 'Stapel importiert' })
      .getByRole('button', { name: 'Schließen' })
      .click();
    await page.goto('/Juri/high-fives');
    await page
      .getByRole('dialog', { name: 'High five!' })
      .getByRole('button', { name: 'Schön' })
      .click();

    await openPeople(page);
    const list = people(page);
    await expect(list).toContainText('Mara');
    await list.getByRole('button', { name: /Mara/ }).click();
    const edit = page.getByRole('dialog', { name: 'Kontakt' });
    await edit.getByLabel('Name').fill('  Mara   aus der AG ');
    await edit.getByRole('button', { name: 'Speichern' }).click();
    await expect(people(page)).toContainText('Mara aus der AG');
    if (!wide(page)) {
      await people(page).getByRole('button', { name: 'Schließen' }).click();
    }
    await expect(page.getByText('Mara aus der AG').first()).toBeVisible();

    // Dieselbe Datei noch einmal: Der Name bleibt, es kommt kein zweites High five.
    await page.goto('/Juri/teilen');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Datei öffnen', exact: true }).click();
    await (await chooser).setFiles(DEMO);
    await expect(page.getByText('Alles schon auf dem neuesten Stand')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importieren' })).toBeDisabled();
    await page.goto('/Juri/high-fives');
    await expect(page.getByText('Mara aus der AG').first()).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'High five!' })).toHaveCount(0);

    // Entfernen räumt Kontakt und High five weg.
    await openPeople(page);
    await people(page).getByRole('button', { name: /Mara/ }).click();
    await page
      .getByRole('dialog', { name: 'Kontakt' })
      .getByRole('button', { name: 'Kontakt entfernen' })
      .click();
    const confirm = page.getByRole('dialog', { name: /entfernen/ });
    await confirm.getByRole('button', { name: 'Entfernen' }).click();
    await expect(page.getByText('Noch keine Kontakte')).toBeVisible();
    await expect(page.getByText('Bekommen', { exact: true })).toHaveCount(0);
  });

  test('nichts wird abgeschnitten: kein Querlauf, Fußzeilen erreichbar, Kürzel am Rechner', async ({
    page,
  }, testInfo) => {
    await onboard(page);
    await importDemo(page);
    await page
      .getByRole('dialog', { name: 'Stapel importiert' })
      .getByRole('button', { name: 'Schließen' })
      .click();
    await page.goto('/Juri/high-fives');
    await page
      .getByRole('dialog', { name: 'High five!' })
      .getByRole('button', { name: 'Schön' })
      .click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Gruß-Datei öffnen' })).toBeVisible();
    if (isDesktop(testInfo.project.name)) {
      // „h“ gibt „einfach so“ ein High five, Esc schließt; „k“ öffnet die Kontaktliste.
      await page.keyboard.press('h');
      const overlay = page.getByRole('dialog', { name: 'High five!' });
      await expect(overlay).toContainText('Einfach so. Such dir aus, an wen.');
      await page.keyboard.press('Escape');
      await expect(overlay).toBeHidden();
      await page.keyboard.press('k');
      await expect(page.getByRole('dialog', { name: 'Deine Leute' })).toBeVisible();
    }
  });
});
