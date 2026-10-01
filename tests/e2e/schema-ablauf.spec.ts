import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * Schema und Verknüpfungen (M5) in der bedienten App: Schema anlegen mit Inhalt und Verknüpfung,
 * Punkt für Punkt aufdecken, verknüpfte Karte ansehen und lernen, Löschen mit Verknüpfungen,
 * Bearbeiten (Ein- und Ausrücken, Verschieben, Verwerfen).
 */

/** Ab 1280 px (Desktop-Gestaltung, ADR-017) steht „Punkt bearbeiten“ als Spalte statt als Sheet. */
const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1280;
const pointEditor = (page: Page) =>
  isDesktop(page)
    ? page.getByRole('complementary', { name: 'Punkt bearbeiten' })
    : page.getByRole('dialog', { name: 'Punkt bearbeiten' });
/** Das Sheet schließt mit „Fertig“; in der Spalte gibt es das nicht. */
async function finishPoint(page: Page) {
  if (!isDesktop(page)) await pointEditor(page).getByRole('button', { name: 'Fertig' }).click();
}
/** Die Suche nach Karten: Popover am Handy, Liste in der Spalte am Rechner. */
const linkPicker = (page: Page) =>
  isDesktop(page)
    ? page.getByRole('group', { name: 'Mit Karte verknüpfen' })
    : page.getByRole('dialog', { name: 'Mit Karte verknüpfen' });

/** Stapel „Amtshaftung“ im Rechtsgebiet Zivilrecht mit einer Frage. */
async function seedDeck(page: Page) {
  await page.goto('/Juri/stapel');
  await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill('Amtshaftung');
  await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
  await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
  await expect(page.getByRole('heading', { name: 'Amtshaftung' })).toBeVisible();
  await page
    .getByRole('link', { name: /Erste Karte anlegen/ })
    .first()
    .click();
  await page.getByLabel('Vorderseite').fill('Wann ist eine Amtspflicht drittbezogen?');
  await page
    .getByLabel('Rückseite')
    .fill('Wenn sie zumindest auch dem Schutz des Geschädigten dient.');
  await page.getByRole('button', { name: 'Speichern & nächste' }).click();
  await expect(page.getByText('1 von 5 heute')).toBeVisible();
}

/** Legt im geöffneten Erstellen-Bildschirm das Schema „Amtshaftungsanspruch“ an (drei Punkte). */
async function createSchema(page: Page) {
  await page.getByRole('button', { name: 'Schema', exact: true }).click();
  await page.getByLabel('Titel des Schemas').fill('Amtshaftungsanspruch');
  await page
    .getByRole('link', { name: 'Gliederung bearbeiten' })
    .or(page.getByRole('button', { name: 'Gliederung bearbeiten' }))
    .click();
  await expect(page.getByText('Noch keine Punkte')).toBeVisible();

  // Erster Punkt mit Norm und Inhalt.
  await page.getByRole('button', { name: 'Ersten Punkt hinzufügen' }).click();
  const sheet = pointEditor(page);
  await sheet.getByLabel('Text').fill('Ausübung eines öffentlichen Amtes');
  await sheet.getByLabel('Norm').fill('Art. 34 S. 1 GG');
  await sheet.getByLabel('Inhalt').fill('Enger Zusammenhang mit der hoheitlichen Aufgabe.');
  await finishPoint(page);

  // Zweiter Punkt, dritter als Unterpunkt.
  await page.getByRole('button', { name: 'Punkt hinzufügen' }).click();
  await sheet.getByLabel('Text').fill('Drittbezogene Amtspflicht');
  await finishPoint(page);
  await page.getByRole('button', { name: 'Punkt hinzufügen' }).click();
  await sheet.getByLabel('Text').fill('Drittbezogenheit');
  await finishPoint(page);
  await page.getByRole('button', { name: 'Einrücken' }).click();
  await expect(page.getByRole('button', { name: /^a\) Drittbezogenheit/ })).toBeVisible();
}

test.describe('Schema', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('anlegen, verknüpfen, Punkt für Punkt lernen, verknüpfte Karte ansehen', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page);
    await createSchema(page);

    // Verknüpfen: „Drittbezogenheit“ ist ausgewählt; die Suche startet mit dem Punkttext.
    await page.getByRole('button', { name: 'Mit Karte verknüpfen' }).last().click();
    const picker = linkPicker(page);
    await picker.getByLabel('Karte suchen').fill('drittbezogen');
    await picker.getByRole('button', { name: /Wann ist eine Amtspflicht drittbezogen/ }).click();
    await expect(page.getByRole('button', { name: 'Verknüpfte Karte ändern' })).toBeVisible();

    await page.getByRole('button', { name: 'Sichern' }).click();
    await expect(page.getByText('3 Punkte')).toBeVisible();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('2 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();

    // Lernen: zwei neue Karten, das Schema ist eine Abfrage mit drei Schritten.
    await page.goto('/Juri/lernen');
    const next = page.getByRole('button', { name: 'Nächster Punkt' });
    const flip = page.getByRole('button', { name: 'Antwort zeigen', exact: true });
    // Welche Karte zuerst kommt, ist nicht festgelegt: die Frage einmal bewerten, dann das Schema.
    for (let guard = 0; guard < 3; guard++) {
      await expect(next.or(flip)).toBeVisible();
      if (await next.isVisible()) break;
      await flip.click();
      await page.getByRole('button', { name: /^Gut/ }).click();
    }
    await expect(page.getByText('Amtshaftungsanspruch')).toBeVisible();
    await expect(page.getByLabel('Punkt noch verdeckt')).toHaveCount(3);
    await next.click();
    await expect(page.getByText('Ausübung eines öffentlichen Amtes')).toBeVisible();
    await expect(page.getByText('Enger Zusammenhang mit der hoheitlichen Aufgabe.')).toBeVisible();
    await expect(page.getByText('Art. 34 S. 1 GG')).toBeVisible();
    await expect(page.getByLabel('Punkt noch verdeckt')).toHaveCount(2);
    // Solange etwas verdeckt ist, lässt sich nicht bewerten.
    await expect(page.getByRole('button', { name: /^Gut/ })).toHaveCount(0);
    await next.click();
    await next.click();
    await expect(page.getByLabel('Punkt noch verdeckt')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Gut/ })).toBeVisible();

    // Verknüpfte Karte: ansehen, zurück zum Schema.
    await page.getByRole('button', { name: /Verknüpfte Karte zu „Drittbezogenheit“/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Wann ist eine Amtspflicht drittbezogen?')).toBeVisible();
    await expect(sheet.getByText(/dem Schutz des Geschädigten/)).toBeVisible();
    await sheet.getByRole('button', { name: 'Zurück zum Schema' }).click();
    await expect(sheet).toBeHidden();

    // Karte lernen: die Frage steht einzeln, auch wenn sie nicht fällig wäre.
    await page.getByRole('button', { name: /Verknüpfte Karte zu „Drittbezogenheit“/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Karte lernen' }).click();
    await expect(page).toHaveURL(/\/lernen\?karte=/);
    await expect(page.getByText('Wann ist eine Amtspflicht drittbezogen?').first()).toBeVisible();
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Löschen: Verknüpfungen werden genannt und entfallen, die Punkte bleiben', async ({
    page,
  }) => {
    await onboard(page);
    await seedDeck(page);
    await createSchema(page);
    await page.getByRole('button', { name: 'Mit Karte verknüpfen' }).last().click();
    const picker = linkPicker(page);
    await picker.getByLabel('Karte suchen').fill('drittbezogen');
    await picker.getByRole('button', { name: /Wann ist eine Amtspflicht drittbezogen/ }).click();
    await page.getByRole('button', { name: 'Sichern' }).click();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('2 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();

    // Die Frage öffnen und löschen.
    await page.goto('/Juri/stapel');
    await page
      .getByRole('link', { name: /Amtshaftung/ })
      .first()
      .click();
    await page.getByRole('link', { name: /Wann ist eine Amtspflicht drittbezogen/ }).click();
    await page.getByRole('button', { name: 'Karte löschen' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Verknüpft in 1 Schema')).toBeVisible();
    await expect(sheet.getByText('Amtshaftungsanspruch')).toBeVisible();
    await expect(sheet.getByText('1 Punkt')).toBeVisible();
    await sheet.getByRole('button', { name: 'Karte löschen' }).click();
    await expect(page).toHaveURL(/\/stapel\//);

    // Das Schema hat alle Punkte, aber keine Verknüpfung mehr.
    await page.getByRole('link', { name: /Amtshaftungsanspruch/ }).click();
    await page.getByRole('button', { name: 'Gliederung bearbeiten' }).click();
    await expect(page.getByRole('button', { name: /^a\) Drittbezogenheit/ })).toBeVisible();
    await page.getByRole('button', { name: /^a\) Drittbezogenheit/ }).click();
    await expect(page.getByRole('button', { name: 'Mit Karte verknüpfen' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verknüpfte Karte ändern' })).toHaveCount(0);
  });

  test('Bearbeiten: Ausrücken, Verschieben, Verwerfen und Pflichtangaben', async ({ page }) => {
    await onboard(page);
    await seedDeck(page);
    await createSchema(page);

    // Ausrücken bringt „Drittbezogenheit“ wieder auf Ebene 1.
    await page.getByRole('button', { name: 'Ausrücken' }).click();
    const point = page.getByRole('button', { name: /^3\. Drittbezogenheit/ });
    await expect(point).toBeVisible();
    // Der Rahmen der gewählten Zeile (2 px) schneidet die Nummer nicht an.
    const row = await point.locator('xpath=..').boundingBox();
    const number = await point.locator('span').first().boundingBox();
    expect(number!.x).toBeGreaterThanOrEqual(row!.x + 2);
    // Nach oben verschieben (Handy: Punkt-Sheet beim zweiten Antippen, Rechner: die Spalte).
    if (!isDesktop(page)) {
      await page.getByRole('button', { name: /^3\. Drittbezogenheit, bearbeiten/ }).click();
    }
    await pointEditor(page).getByRole('button', { name: 'Nach oben' }).click();
    await expect(page.getByRole('button', { name: /^2\. Drittbezogenheit/ })).toBeVisible();
    await pointEditor(page).getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByRole('button', { name: /Drittbezogenheit/ })).toHaveCount(0);

    // Zurück mit Änderungen fragt nach; Verwerfen verlässt den Editor ohne Punkte zu sichern.
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page.getByRole('dialog').getByText('Änderungen verwerfen?')).toBeVisible();
    await page.getByRole('button', { name: 'Verwerfen' }).click();
    await expect(page.getByText('Noch keine Punkte')).toBeVisible();

    // Speichern ohne Punkte und ohne Titel meldet beides.
    await page.getByLabel('Titel des Schemas').fill('');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('Der Titel fehlt.')).toBeVisible();
    await page.getByLabel('Titel des Schemas').fill('Leeres Schema');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('Ein Schema braucht mindestens einen Punkt.')).toBeVisible();
  });

  test('Neue Karte aus dem Schema anlegen und gleich verknüpfen', async ({ page }) => {
    await onboard(page);
    await seedDeck(page);
    await createSchema(page);
    await page.getByRole('button', { name: 'Mit Karte verknüpfen' }).last().click();
    const picker = linkPicker(page);
    await picker.getByLabel('Karte suchen').fill('Verjährung');
    await expect(picker.getByText('Keine Karte gefunden.')).toBeVisible();
    await picker.getByRole('button', { name: '+ Neue Karte „Verjährung“ anlegen' }).click();
    const sheet = page.getByRole('dialog', { name: 'Karte anlegen und verknüpfen' });
    await expect(sheet.getByLabel('Vorderseite')).toHaveValue('Verjährung');
    // Ohne Rückseite wird nichts angelegt.
    await sheet.getByRole('button', { name: 'Anlegen und verknüpfen' }).click();
    await expect(sheet.getByText('Die Rückseite fehlt.')).toBeVisible();
    await sheet.getByLabel('Rückseite').fill('Regelmäßig drei Jahre.');
    await sheet.getByRole('button', { name: 'Anlegen und verknüpfen' }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: 'Verknüpfte Karte ändern' })).toBeVisible();
    await page.getByRole('button', { name: 'Sichern' }).click();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('3 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();
    await page.goto('/Juri/stapel');
    await page
      .getByRole('link', { name: /Amtshaftung/ })
      .first()
      .click();
    await expect(page.getByRole('link', { name: /Verjährung/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Amtshaftungsanspruch/ })).toBeVisible();
  });
});
