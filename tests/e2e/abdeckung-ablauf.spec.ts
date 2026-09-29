import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * Abdeckung, Foto und PDF (M6) in der bedienten App: Bild wählen und verkleinern, Felder aufziehen,
 * speichern, lernen (ein Feld je Abfrage), bearbeiten und löschen; PDF öffnen, blättern, Text
 * markieren und in die Karte übernehmen, Seite abdecken, Quelle öffnen; Fehlerfälle.
 */

const DEMO_PDF = readFileSync('testdaten/demo-skript.pdf');

/** Stapel „Sachenrecht“ im Rechtsgebiet Zivilrecht. */
async function seedDeck(page: Page) {
  await page.goto('/Juri/stapel');
  await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill('Sachenrecht');
  await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
  await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Sachenrecht' })).toBeVisible();
}

/** Ein PNG mit Zeilen und Text, in der Seite gezeichnet (Bytes als Buffer). */
async function makePng(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w as number;
      canvas.height = h as number;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333333';
      ctx.font = `${String(Math.round((h as number) / 12))}px sans-serif`;
      for (let i = 0; i < 8; i++)
        ctx.fillText(`Zeile ${String(i + 1)} des Testbildes`, 60, 120 + i * ((h as number) / 10));
      return canvas.toDataURL('image/png').split(',')[1]!;
    },
    [width, height],
  );
  return Buffer.from(base64, 'base64');
}

/** Zieht ein Feld auf der Bildfläche (Bruchteile der Fläche). */
async function drawField(page: Page, label: string, from: [number, number], to: [number, number]) {
  const box = await page.getByRole('group', { name: label }).boundingBox();
  if (!box) throw new Error('Bildfläche fehlt');
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * ((from[0] + to[0]) / 2),
    box.y + box.height * ((from[1] + to[1]) / 2),
  );
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1]);
  await page.mouse.up();
}

async function mediaCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('juri');
        open.onerror = () => {
          reject(new Error('IndexedDB'));
        };
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('media')) {
            resolve(0);
            return;
          }
          const count = db.transaction('media').objectStore('media').count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
        };
      }),
  );
}

test.describe('Abdeckung aus einem Foto', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
    const size = page.viewportSize();
    test.skip((size?.width ?? 0) >= 768, 'Ablauf des iPhone-Layouts');
  });

  test('Bild wählen, Felder aufziehen, speichern, lernen, bearbeiten, löschen', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page);
    await page.goto('/Juri/neu');
    await page.getByRole('button', { name: 'Abdeckung', exact: true }).click();
    await page.getByRole('button', { name: /PDF-Seite oder Foto wählen/ }).click();

    // Ein großes Foto (4000 × 3000) wird auf 2000 px Kante verkleinert.
    const png = await makePng(page, 4000, 3000);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page
        .getByRole('dialog')
        .getByRole('button', { name: /Foto \/ Bild/ })
        .click(),
    ]);
    await chooser.setFiles({ name: 'IMG_0042.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('heading', { name: 'Felder', level: 1 })).toBeVisible();

    // Felder aufziehen: das erste wird gewählt und lässt sich verschieben.
    await expect(page.getByText('Noch keine Felder')).toBeVisible();
    await drawField(page, 'Bild, Felder aufziehen', [0.1, 0.2], [0.5, 0.3]);
    await expect(page.getByText('Feld 1 von 1')).toBeVisible();
    await drawField(page, 'Bild, Felder aufziehen', [0.2, 0.6], [0.7, 0.7]);
    await expect(page.getByText('Feld 2 von 2')).toBeVisible();
    // Ein Tippen ohne Ziehen legt kein Feld an.
    const box = await page.getByRole('group', { name: 'Bild, Felder aufziehen' }).boundingBox();
    await page.mouse.click(box!.x + box!.width * 0.9, box!.y + box!.height * 0.9);
    await expect(page.getByText('2 Felder')).toBeVisible();
    // Feld 2 löschen, danach wieder eines aufziehen: Die Nummer 2 kehrt nicht wieder (das Feld ist Nr. 3),
    // die angezeigte Zählung bleibt 1, 2.
    await page.locator('[data-mask="2"]').click();
    await page.getByRole('button', { name: 'Feld löschen' }).click();
    await expect(page.getByText('1 Feld')).toBeVisible();
    await drawField(page, 'Bild, Felder aufziehen', [0.2, 0.6], [0.7, 0.7]);
    await expect(page.getByText('Feld 2 von 2')).toBeVisible();
    await page.getByRole('button', { name: 'Fertig' }).click();

    // Zurück im Formular: zwei Felder, verkleinert.
    await expect(page.getByText('2 Felder')).toBeVisible();
    await expect(page.getByText(/Verkleinert von 4000 × 3000/)).toBeVisible();
    await expect(page.getByText(/2000 × 1500/)).toBeVisible();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    // Nächste Karte: leer.
    await expect(page.getByRole('button', { name: /PDF-Seite oder Foto wählen/ })).toBeVisible();
    expect(await mediaCount(page)).toBe(1);

    // Lernen: zwei Abfragen, je Feld eine Station.
    await page.goto('/Juri/lernen');
    await expect(page.getByText('Was steht unter Feld 1?')).toBeVisible();
    await expect(page.getByText('Abdeckung 1 von 2')).toBeVisible();
    await page.getByRole('button', { name: 'Feld 1 aufdecken', exact: true }).click();
    await page.getByRole('button', { name: /Gut/ }).click();
    await expect(page.getByText('Was steht unter Feld 2?')).toBeVisible();
    await page.getByRole('button', { name: 'Feld 2 aufdecken', exact: true }).click();
    await page.getByRole('button', { name: /Gut/ }).click();
    await expect(page.getByRole('heading', { name: 'Geschafft.' })).toBeVisible();

    // Bearbeiten: ein Feld weniger, das Bild bleibt.
    await page.goto('/Juri/stapel');
    await page
      .getByRole('link', { name: /Sachenrecht/ })
      .first()
      .click();
    await page.getByRole('link', { name: /Bild mit 2 Feldern/ }).click();
    await expect(page.getByRole('heading', { name: 'Karte bearbeiten' })).toBeVisible();
    await expect(page.getByText('2 Felder')).toBeVisible();
    await page.getByRole('button', { name: 'Felder bearbeiten' }).click();
    await page.locator('[data-mask="3"]').click();
    await page.getByRole('button', { name: 'Feld löschen' }).click();
    await page.getByRole('button', { name: 'Fertig' }).click();
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('link', { name: /Bild mit 1 Feld/ })).toBeVisible();

    // Löschen: das Bild geht mit.
    await page.getByRole('link', { name: /Bild mit 1 Feld/ }).click();
    await page.getByRole('button', { name: 'Karte löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Karte löschen' }).click();
    await expect(page.getByRole('heading', { name: 'Sachenrecht' })).toBeVisible();
    expect(await mediaCount(page)).toBe(0);
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Fehlerfälle: kein Bild, zu große PDF-Datei, verworfene Auswahl', async ({ page }) => {
    await onboard(page);
    await seedDeck(page);
    await page.goto('/Juri/neu');
    await page.getByRole('button', { name: 'Abdeckung', exact: true }).click();

    // Eine Textdatei als Bild: nicht lesbar.
    await page.getByRole('button', { name: 'Foto / Bild' }).click();
    // (Der untere Knopf öffnet den Datei-Dialog sofort.)
    const [first] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Foto / Bild' }).click(),
    ]);
    await first.setFiles({
      name: 'notiz.png',
      mimeType: 'image/png',
      buffer: Buffer.from('kein Bild'),
    });
    const dialog = page.getByRole('dialog', { name: 'Bild nicht lesbar' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();

    // Ein PDF über 50 MB.
    const big = Buffer.alloc(51_000_000);
    big.write('%PDF-1.7\n');
    const [second] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ]);
    await second.setFiles({ name: 'gross.pdf', mimeType: 'application/pdf', buffer: big });
    await expect(page.getByRole('dialog', { name: 'PDF ist zu groß' })).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('erlaubt sind 50,0 MB');
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    // Kein PDF: Text mit falscher Endung.
    const [third] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ]);
    await third.setFiles({
      name: 'x.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('nur Text'),
    });
    await expect(page.getByRole('dialog', { name: 'PDF nicht lesbar' })).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    // Speichern ohne Bild: Hinweis an der Fläche.
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('Wähle ein Bild oder eine PDF-Seite.')).toBeVisible();
    expect(await mediaCount(page)).toBe(0);
  });
});

test.describe('PDF', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
    const size = page.viewportSize();
    test.skip((size?.width ?? 0) >= 768, 'Ablauf des iPhone-Layouts');
  });

  test('öffnen, blättern, Text markieren und übernehmen, Quelle öffnen', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page);
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

    // Seite 1 ist gezeichnet und hat eine Textebene.
    await expect(page.getByRole('region', { name: 'PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: /S\. 1 \/ 50/ })).toBeVisible();
    await expect(
      page.locator('[data-page="1"] span', { hasText: 'Besitz und Besitzschutz' }),
    ).toBeVisible({ timeout: 15_000 });
    const painted = await page
      .locator('[data-page="1"] canvas')
      .evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext('2d')!;
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4) if ((data[i] ?? 255) < 128) dark++;
        return dark;
      });
    expect(painted).toBeGreaterThan(500);

    // Blättern: Seitenzahl eingeben.
    await page.getByRole('button', { name: /Seite wählen/ }).click();
    await page.getByRole('textbox', { name: /Seite, 1 bis 50/ }).fill('14');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /S\. 14 \/ 50/ })).toBeVisible();
    const norm = page
      .locator('[data-page="14"] span', { hasText: /Der Erwerber ist nicht in gutem Glauben/ })
      .first();
    await expect(norm).toBeVisible({ timeout: 15_000 });

    // Markieren: der Satz wird ausgewählt, die Leiste erscheint.
    await page.evaluate(() => {
      const layer = document.querySelector('[data-page="14"]')!;
      const spans = [...layer.querySelectorAll('span')].filter((s) => s.textContent.trim() !== '');
      const start = spans.find((s) => s.textContent.includes('Der Erwerber ist nicht'))!;
      const end = spans.find((s) => s.textContent.includes('§ 932 II BGB'))!;
      const range = document.createRange();
      range.setStart(start.firstChild!, 0);
      range.setEnd(end.firstChild!, end.textContent.length);
      const sel = document.getSelection();
      if (!sel) throw new Error('Keine Auswahl');
      sel.removeAllRanges();
      sel.addRange(range);
    });
    const toolbar = page.getByRole('toolbar', { name: 'Markierung übernehmen' });
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole('button', { name: 'Als Antwort' }).click();
    await expect(toolbar).toBeHidden();

    // Zur Karte: Rückseite gefüllt, Quelle steht.
    await page.getByRole('button', { name: 'Zur Karte' }).click();
    await expect(page.getByLabel('Rückseite')).toHaveValue(
      /^Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört\. \(§ 932 II BGB\)$/,
    );
    await expect(page.getByText('Quelle: Demo-Skript Sachenrecht.pdf, S. 14')).toBeVisible();
    await page.getByLabel('Vorderseite').fill('Wann ist der Erwerber bösgläubig?');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    expect(await mediaCount(page)).toBe(1);

    // Die zweite Karte aus demselben PDF speichert es nicht noch einmal.
    await page.getByRole('button', { name: 'Öffnen' }).click();
    await expect(page.getByRole('button', { name: /S\. 14 \/ 50/ })).toBeVisible();
    await page.getByRole('button', { name: 'Zur Karte' }).click();
    await page.getByLabel('Vorderseite').fill('Zweite Karte');
    await page.getByLabel('Rückseite').fill('Antwort');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('2 von 5 heute')).toBeVisible();
    expect(await mediaCount(page)).toBe(1);

    // Lernen: Anhang mit „Öffnen“ zeigt das gespeicherte PDF an der Seite.
    await page.goto('/Juri/lernen');
    await page.getByRole('button', { name: 'Antwort zeigen', exact: true }).click();
    await page.getByRole('button', { name: /Demo-Skript Sachenrecht.pdf, S. 14 öffnen/ }).click();
    const viewer = page.getByRole('dialog', { name: 'PDF' });
    await expect(viewer.getByRole('button', { name: /S\. 14 \/ 50/ })).toBeVisible();
    await expect(
      viewer.locator('[data-page="14"] span', { hasText: /Der Erwerber ist nicht/ }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await viewer.getByRole('button', { name: 'Schließen' }).click();
    await expect(viewer).toBeHidden();

    // Beide Karten löschen: das PDF geht mit der letzten.
    await page.goto('/Juri/stapel');
    await page
      .getByRole('link', { name: /Sachenrecht/ })
      .first()
      .click();
    for (const title of ['Wann ist der Erwerber bösgläubig?', 'Zweite Karte']) {
      await page.getByRole('link', { name: new RegExp(title) }).click();
      await page.getByRole('button', { name: 'Karte löschen' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Karte löschen' }).click();
      await expect(page.getByRole('heading', { name: 'Sachenrecht' })).toBeVisible();
      if (title === 'Wann ist der Erwerber bösgläubig?') expect(await mediaCount(page)).toBe(1);
    }
    expect(await mediaCount(page)).toBe(0);
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('PDF-Seite abdecken: Seite wählen, Felder aufziehen, lernen mit Quelle', async ({
    page,
  }) => {
    await onboard(page);
    await seedDeck(page);
    await page.goto('/Juri/neu');
    await page.getByRole('button', { name: 'Abdeckung', exact: true }).click();
    await page.getByRole('button', { name: /PDF-Seite oder Foto wählen/ }).click();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page
        .getByRole('dialog')
        .getByRole('button', { name: /PDF-Seite/ })
        .click(),
    ]);
    await chooser.setFiles({
      name: 'Demo-Skript Sachenrecht.pdf',
      mimeType: 'application/pdf',
      buffer: DEMO_PDF,
    });
    await expect(page.getByRole('group', { name: 'Modus' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abdecken' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: /Seite wählen/ }).click();
    await page.getByRole('textbox', { name: /Seite, 1 bis 50/ }).fill('14');
    await page.keyboard.press('Enter');
    const surface = page.getByRole('group', { name: 'PDF-Seite, Felder aufziehen' });
    await expect(surface).toBeVisible({ timeout: 15_000 });
    await drawField(page, 'PDF-Seite, Felder aufziehen', [0.1, 0.3], [0.7, 0.4]);
    await page.getByRole('button', { name: 'Zur Karte' }).click();
    await expect(page.getByText('1 Feld', { exact: true })).toBeVisible();
    await expect(page.getByText(/Seite 14 aus Demo-Skript Sachenrecht.pdf/)).toBeVisible();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    // Nach dem Speichern steht die Seite wieder zum Abdecken bereit, die Felder sind leer.
    await expect(
      page
        .getByRole('button', { name: /PDF-Seite oder Foto wählen/ })
        .or(page.getByText('Noch keine Felder')),
    ).toBeVisible();

    await page.goto('/Juri/lernen');
    await expect(page.getByText('Abdeckung 1 von 1')).toBeVisible();
    await expect(page.getByText('PDF · Demo-Skript Sachenrecht S. 14')).toBeVisible();
    await page.getByRole('button', { name: 'Feld 1 aufdecken', exact: true }).click();
    await expect(page.getByRole('button', { name: /Gut/ })).toBeVisible();
    await page.getByRole('button', { name: 'PDF · Demo-Skript Sachenrecht S. 14 öffnen' }).click();
    await expect(
      page.getByRole('dialog', { name: 'PDF' }).getByRole('button', { name: /S\. 14 \/ 50/ }),
    ).toBeVisible();
  });
});

test.describe('PDF neben dem Formular (iPad quer)', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
    const size = page.viewportSize();
    test.skip((size?.width ?? 0) < 1100, 'geteilte Ansicht ab 1100 px');
  });

  test('Markierung übernehmen, Speichern & nächste aus PDF, Seite abdecken', async ({ page }) => {
    await onboard(page);
    await seedDeck(page);
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

    // PDF links, Formular rechts.
    await expect(page.getByRole('heading', { name: 'Neue Karte', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'PDF' })).toBeVisible();
    await expect(page.getByText('0 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: /Seite wählen/ }).click();
    await page.getByRole('textbox', { name: /Seite, 1 bis 50/ }).fill('14');
    await page.keyboard.press('Enter');
    await expect(
      page.locator('[data-page="14"] span', { hasText: /Der Erwerber ist nicht/ }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => {
      const layer = document.querySelector('[data-page="14"]')!;
      const spans = [...layer.querySelectorAll('span')].filter((s) => s.textContent.trim() !== '');
      const start = spans.find((s) => s.textContent.includes('Der Erwerber ist nicht'))!;
      const end = spans.find((s) => s.textContent.includes('§ 932 II BGB'))!;
      const range = document.createRange();
      range.setStart(start.firstChild!, 0);
      range.setEnd(end.firstChild!, end.textContent.length);
      const sel = document.getSelection();
      if (!sel) throw new Error('Keine Auswahl');
      sel.removeAllRanges();
      sel.addRange(range);
    });
    await page
      .getByRole('toolbar', { name: 'Markierung übernehmen' })
      .getByRole('button', { name: 'Als Antwort' })
      .click();
    await expect(page.getByText('aus PDF übernommen')).toBeVisible();
    await expect(page.getByLabel('Rückseite')).toHaveValue(
      /^Der Erwerber ist nicht in gutem Glauben/,
    );
    await expect(page.getByText('PDF S. 14')).toBeVisible();
    await page.getByLabel('Vorderseite').fill('Wann ist der Erwerber bösgläubig?');
    await page.getByRole('button', { name: 'Speichern & nächste aus PDF' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    // Das PDF bleibt offen, das Formular ist leer.
    await expect(page.getByRole('region', { name: 'PDF' })).toBeVisible();
    await expect(page.getByLabel('Vorderseite')).toHaveValue('');

    // Abdecken: die Seite als Bild, ein Feld aufziehen, speichern.
    await page.getByRole('button', { name: 'Abdecken' }).click();
    await expect(page.getByText('Noch keine Felder')).toBeVisible({ timeout: 15_000 });
    await drawField(page, 'PDF-Seite, Felder aufziehen', [0.1, 0.3], [0.6, 0.4]);
    await expect(page.getByText('1 Feld auf S. 14')).toBeVisible();
    await page.getByRole('button', { name: 'Speichern & nächste aus PDF' }).click();
    await expect(page.getByText('2 von 5 heute')).toBeVisible();
    expect(await mediaCount(page)).toBe(2);

    // „Speichern“ legt die Karte an und verlässt den Bildschirm.
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await page.getByLabel('Vorderseite').fill('Dritte Karte');
    await page.getByLabel('Rückseite').fill('Antwort');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Neue Karte', level: 1 })).toBeHidden();
  });
});

test.describe('PDF-Ansicht: Blättern durch 50 Seiten', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
    const size = page.viewportSize();
    test.skip((size?.width ?? 0) >= 768, 'Ablauf des iPhone-Layouts');
  });

  test('jede Seite wird gezeichnet, es steht nur eine Zeichenfläche im Speicher', async ({
    page,
  }) => {
    await onboard(page);
    await seedDeck(page);
    await page.goto('/Juri/neu');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'PDF', exact: true }).click(),
    ]);
    await chooser.setFiles({
      name: 'Demo-Skript.pdf',
      mimeType: 'application/pdf',
      buffer: DEMO_PDF,
    });
    const started = Date.now();
    for (let n = 1; n <= 50; n++) {
      await expect(
        page.locator(`[data-page="${String(n)}"] span`, { hasText: `Seite ${String(n)} von 50` }),
      ).toBeVisible({
        timeout: 15_000,
      });
      // Nur die angezeigte Seite hat eine Zeichenfläche, sie bleibt unter der Pixelgrenze (12 Mio.).
      const canvases = await page
        .locator('[data-page] canvas')
        .evaluateAll((all) =>
          all.map((c) => (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height),
        );
      expect(canvases).toHaveLength(1);
      expect(canvases[0]).toBeGreaterThan(0);
      expect(canvases[0]).toBeLessThanOrEqual(12_000_000);
      if (n < 50) await page.getByRole('button', { name: 'Nächste Seite' }).click();
    }
    const seconds = (Date.now() - started) / 1000;
    console.log(
      `50 Seiten in ${seconds.toFixed(1)} s (Chromium ohne GPU, ${String(page.viewportSize()?.width)} px)`,
    );
    // Grobe Obergrenze, damit ein Rückschritt auffällt (gemessen wird auf dem Gerät, siehe Testliste).
    expect(seconds).toBeLessThan(90);
  });
});
