import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * Erfolge (M9) in der bedienten App: Leerzustand, Meilenstein-Feier genau einmal, Tagesziele
 * einstellen, Heute mit echtem Ziel, Session bis zur Feier „Tagesziel erreicht“, Serie in Erfolge,
 * Undo. Läuft auf iPhone, iPad und Desktop. Nach Aktionen, die schreiben, wird erst auf die
 * sichtbare Wirkung gewartet, dann navigiert.
 */

const flipButton = (page: Page) =>
  page.getByRole('button', { name: 'Antwort zeigen', exact: true });

/** Stapel „Deliktsrecht“ mit den Fragen `cards`. */
async function seedDeck(page: Page, cards: [string, string][]) {
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
  for (const [i, [front, back]] of cards.entries()) {
    await page.getByLabel('Vorderseite').fill(front);
    await page.getByLabel('Rückseite').fill(back);
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText(`${i + 1} von 5 heute`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Schließen' }).click();
}

/** Ziel „Lernen“ im Sheet auf `target` stellen (Ausgang: 24) und speichern. */
async function setLearnGoal(page: Page, target: number) {
  await page.goto('/Juri/erfolge');
  // Ein frischer Meilenstein (Erste Karte) wird zuerst gefeiert.
  const feier = page.getByRole('dialog', { name: 'Erste Karte' });
  await expect(feier).toBeVisible();
  await feier.getByRole('button', { name: 'Super' }).click();
  await expect(feier).toBeHidden();
  await page.getByRole('button', { name: 'Tagesziele' }).click();
  const sheet = page.getByRole('dialog', { name: 'Tagesziele' });
  await expect(sheet).toBeVisible();
  for (let n = 24; n > target; n--)
    await sheet.getByRole('button', { name: 'Ziel Lernen senken' }).click();
  await sheet.getByRole('button', { name: 'Ziele speichern' }).click();
  await expect(sheet).toBeHidden();
}

test.describe('Erfolge', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Auf dem Desktop läuft die App im Tab (kein Sperrbild), sonst als installierte App (A13).
    if (!testInfo.project.name.endsWith('-desktop')) await asInstalledApp(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Leerzustand, erste Karte, Feier für den Meilenstein genau einmal', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/erfolge');
    await expect(page.getByRole('heading', { name: 'Noch kein Verlauf' })).toBeVisible();
    await expect(page.getByText('Tage in Folge')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await seedDeck(page, [['Frage eins?', 'Antwort eins.']]);
    await page.goto('/Juri/erfolge');
    const feier = page.getByRole('dialog', { name: 'Erste Karte' });
    await expect(feier).toBeVisible();
    await expect(feier).toContainText('Neuer Meilenstein');
    await feier.getByRole('button', { name: 'Super' }).click();
    await expect(feier).toBeHidden();
    await expect(page.getByRole('listitem').filter({ hasText: 'Erste Karte' })).toContainText(
      'geschafft',
    );
    // Der Verlauf hat jetzt einen Tag; „Karten angelegt“ zählt mit.
    await expect(page.getByText('Noch kein Verlauf')).toHaveCount(0);
    await expect(page.locator('main').getByText('Karte angelegt', { exact: true })).toBeVisible();

    // Nach dem Neuladen wird nicht noch einmal gefeiert.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Erfolge', level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });

  test('Tagesziel einstellen, lernen bis zur Feier, Serie in Erfolge', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
    ]);
    await setLearnGoal(page, 2);

    await page.goto('/Juri/');
    await expect(page.getByLabel('Tagesziel')).toContainText('0 von 2');
    await page.getByRole('link', { name: 'Lernen starten' }).click();
    for (const front of ['Frage eins?', 'Frage zwei?']) {
      await expect(page.getByText(front).first()).toBeVisible();
      await flipButton(page).click();
      await page.getByRole('button', { name: /^Gut/ }).click();
    }
    await expect(page.getByRole('heading', { name: 'Geschafft.' })).toBeVisible();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tagesziel erreicht.' })).toBeVisible();
    await expect(page.getByText('2 von 2 Karten · 1 Tag in Folge')).toBeVisible();
    await page.getByRole('link', { name: 'Erfolge ansehen' }).click();

    await expect(page.getByRole('heading', { name: 'Erfolge', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Serie')).toContainText('1');
    await expect(page.getByLabel('Serie')).toContainText('Tag in Folge');
    await expect(page.locator('main').getByText('Wiederholungen', { exact: true })).toBeVisible();
    // Heute zeigt das erreichte Ziel.
    await page.goto('/Juri/');
    await expect(page.getByLabel('Tagesziel')).toContainText('2 von 2');
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });

  test('Undo nimmt die Bewertung aus dem Tagesziel', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
    ]);
    await page.goto('/Juri/');
    await page.getByRole('link', { name: 'Lernen starten' }).click();
    await flipButton(page).click();
    await page.getByRole('button', { name: /^Gut/ }).click();
    await expect(page.getByText('Frage zwei?').first()).toBeVisible();
    await page.getByRole('button', { name: /zurücknehmen/ }).click();
    await expect(page.getByText('Frage eins?').first()).toBeVisible();
    await page.getByRole('button', { name: 'Lernen beenden' }).click();
    await page.goto('/Juri/');
    await expect(page.getByLabel('Tagesziel')).toContainText('0 von 24');
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });

  test('Ziele: Pausentag und Anlegen-Ziel bleiben gespeichert', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await page.goto('/Juri/erfolge');
    await page.getByRole('button', { name: 'Tagesziele' }).click();
    const sheet = page.getByRole('dialog', { name: 'Tagesziele' });
    await sheet.getByRole('button', { name: 'Ziel Anlegen erhöhen' }).click();
    await sheet.getByRole('switch', { name: /Pausentag/ }).click();
    await expect(sheet.getByRole('switch', { name: /Pausentag/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await sheet.getByRole('button', { name: 'Ziele speichern' }).click();
    await expect(sheet).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Tagesziele' }).click();
    await expect(page.getByRole('dialog', { name: 'Tagesziele' })).toContainText('6');
    await expect(page.getByRole('switch', { name: /Pausentag/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });
});
