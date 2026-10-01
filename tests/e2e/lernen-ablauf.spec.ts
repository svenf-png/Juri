import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, openSettings, watchPage } from './helpers';

/*
 * Lernen (M4) in der bedienten App: Session mit Flip, Bewertung, Nochmal, Undo, Wischen, Tastatur,
 * Abbruch, gebündelte Lücken, Notiz, Fälligkeit in Heute und Stapel sowie der Lernrhythmus.
 * Wichtig für die Tests: Nach Aktionen, die in die Datenbank schreiben, wird erst auf die sichtbare
 * Wirkung gewartet und dann navigiert, sonst verwirft ein Seitenwechsel die Änderung.
 */

const flipButton = (page: Page) =>
  page.getByRole('button', { name: 'Antwort zeigen', exact: true });
const rating = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) });
const counter = (page: Page) => page.locator('[aria-label^="Karte "]');

/** Stapel „Deliktsrecht“ im Rechtsgebiet Zivilrecht mit den Fragen `cards` (Vorderseite, Rückseite). */
async function seedDeck(page: Page, cards: [string, string][], note = '') {
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
    if (note && i === 0) {
      await page.getByRole('button', { name: 'Mehr' }).click();
      await page.getByLabel('Notiz').fill(note);
    }
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText(`${i + 1} von 5 heute`)).toBeVisible();
  }
  await page.getByRole('button', { name: 'Schließen' }).click();
}

/** Heute, wenn `n` Karten fällig sind. */
async function expectDue(page: Page, n: number) {
  await page.goto('/Juri/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    n === 0 ? 'Alles erledigt' : `${n} ${n === 1 ? 'Karte' : 'Karten'}`,
  );
}

test.describe('Lernen', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Session: umdrehen, bewerten, Geschafft, danach ist heute alles erledigt', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
      ['Frage drei?', 'Antwort drei.'],
    ]);
    await expectDue(page, 3);
    await page.getByRole('link', { name: 'Lernen starten' }).click();

    await expect(counter(page)).toHaveText('1/3');
    await expect(page.getByText('Frage eins?').first()).toBeVisible();
    await flipButton(page).click();
    await expect(page.getByText('Antwort eins.')).toBeVisible();
    // Vorschau auf den Knöpfen: neue Karte, Lernschritte 1 min, 6 min, 10 min.
    await expect(rating(page, 'Nochmal')).toContainText('1 min');
    await expect(rating(page, 'Gut')).toContainText('10 min');
    await rating(page, 'Leicht').click();
    await expect(counter(page)).toHaveText('2/3');
    await expect(page.getByText('Frage zwei?').first()).toBeVisible();

    // Tastatur: Leertaste dreht, 4 bewertet „Leicht“.
    await page.keyboard.press('Space');
    await expect(page.getByText('Antwort zwei.')).toBeVisible();
    await page.keyboard.press('4');
    await expect(counter(page)).toHaveText('3/3');
    await page.keyboard.press('Space');
    await page.keyboard.press('4');

    await expect(page.getByRole('heading', { name: 'Geschafft.' })).toBeVisible();
    await expect(page.getByText(/3 Wiederholungen, davon 0 nochmal gelernt/)).toBeVisible();
    await page.getByRole('button', { name: 'Zurück zu Heute' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alles erledigt');
    await expect(page.getByText('3 von 24')).toBeVisible();

    // Wieder aufrufen: nichts mehr fällig.
    await page.goto('/Juri/lernen');
    await expect(page.getByRole('heading', { name: 'Nichts fällig.' })).toBeVisible();
    // WebKit meldet gelegentlich die Update-Suche des Service Workers („sw.js due to access control checks“).
    expect(watch.errors.filter((e) => !e.includes('/sw.js'))).toEqual([]);
  });

  test('Nochmal: die Karte kommt wieder, bis sie mindestens „Schwer“ bekommt; Undo nimmt zurück', async ({
    page,
  }) => {
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
    ]);
    await page.goto('/Juri/lernen');
    await flipButton(page).click();
    await rating(page, 'Nochmal').click();
    await expect(page.getByText('Frage zwei?').first()).toBeVisible();
    await expect(counter(page)).toHaveText('1/2');

    // Undo: die erste Karte steht mit aufgedeckter Antwort wieder da.
    await page.getByRole('button', { name: 'Letzte Bewertung zurücknehmen' }).click();
    await expect(page.getByText('Antwort eins.')).toBeVisible();
    await expect(rating(page, 'Nochmal')).toContainText('1 min');

    await rating(page, 'Nochmal').click();
    await flipButton(page).click();
    await rating(page, 'Gut').click();
    // „Frage eins?“ ist noch nicht fertig und kommt als Nächstes.
    await expect(page.getByText('Frage eins?').first()).toBeVisible();
    await expect(counter(page)).toHaveText('2/2');
    await flipButton(page).click();
    await rating(page, 'Schwer').click();
    await expect(page.getByRole('heading', { name: 'Geschafft.' })).toBeVisible();
    await expect(page.getByText(/3 Wiederholungen, davon 1 nochmal gelernt/)).toBeVisible();
  });

  test('Wischen: nach links „Nochmal“, nach rechts „Gut“', async ({ page }) => {
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
    ]);
    await page.goto('/Juri/lernen');
    await flipButton(page).click();
    const card = page.getByText('Antwort eins.');
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    const y = box.y + 40;
    await page.mouse.move(box.x + 60, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, y, { steps: 4 });
    await page.mouse.move(box.x - 60, y, { steps: 8 });
    await page.mouse.up();
    // „Nochmal“ heißt: nächste Karte, die erste kommt später wieder.
    await expect(page.getByText('Frage zwei?').first()).toBeVisible();
    await expect(counter(page)).toHaveText('1/2');
    await flipButton(page).click();
    const card2 = page.getByText('Antwort zwei.');
    const box2 = (await card2.boundingBox())!;
    await page.mouse.move(box2.x + 20, box2.y + 40);
    await page.mouse.down();
    await page.mouse.move(box2.x + 90, box2.y + 40, { steps: 6 });
    await page.mouse.move(box2.x + 200, box2.y + 40, { steps: 8 });
    await page.mouse.up();
    await expect(counter(page)).toHaveText('2/2');
    await expect(page.getByText('Frage eins?').first()).toBeVisible();
  });

  test('Abbrechen: Bewertungen bleiben gespeichert, der Rest bleibt fällig', async ({ page }) => {
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
      ['Frage drei?', 'Antwort drei.'],
    ]);
    await page.goto('/Juri/lernen');
    // Ohne Bewertung geht es sofort zurück.
    await page.getByRole('button', { name: 'Lernen beenden' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 Karten');

    await page.goto('/Juri/lernen');
    await flipButton(page).click();
    await rating(page, 'Leicht').click();
    await expect(counter(page)).toHaveText('2/3');
    await page.getByRole('button', { name: 'Lernen beenden' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('1 Bewertung ist gespeichert')).toBeVisible();
    await sheet.getByRole('button', { name: 'Weiterlernen' }).click();
    await expect(counter(page)).toHaveText('2/3');
    await page.getByRole('button', { name: 'Lernen beenden' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Beenden' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('2 Karten');
  });

  test('Lücken einer Karte werden gebündelt: Lücke für Lücke, eine Bewertung für alle', async ({
    page,
  }) => {
    await onboard(page);
    await page.goto('/Juri/stapel');
    await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Name').fill('Betrug');
    await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
    await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
    await page
      .getByRole('link', { name: /Erste Karte anlegen/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Lücke', exact: true }).click();
    const text = page.getByLabel('Text', { exact: true });
    const sentence = 'Betrug verlangt Täuschung, Irrtum und Verfügung.';
    await text.fill(sentence);
    for (const word of ['Täuschung', 'Irrtum', 'Verfügung']) {
      const start = sentence.indexOf(word);
      await text.evaluate(
        (el: HTMLTextAreaElement, [s, e]: number[]) => {
          el.focus();
          el.setSelectionRange(s!, e!);
          el.dispatchEvent(new Event('select', { bubbles: true }));
        },
        [start, start + word.length],
      );
      await page.getByRole('button', { name: 'Markierung wird Lücke' }).click();
    }
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();

    await expectDue(page, 3);
    await page.goto('/Juri/lernen');
    await expect(page.getByText('Lücke 1 von 3')).toBeVisible();
    await expect(counter(page)).toHaveText('1/1');
    await page.getByRole('button', { name: 'Nächste Lücke' }).click();
    await page.getByRole('button', { name: 'Nächste Lücke' }).click();
    await expect(page.getByText('Lücke 2 von 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nächste Lücke' })).toBeVisible();
    await page.getByRole('button', { name: 'Alle zeigen' }).click();
    await expect(rating(page, 'Gut')).toBeVisible();
    await rating(page, 'Gut').click();
    await expect(page.getByText(/3 Wiederholungen, davon 0 nochmal gelernt/)).toBeVisible();
  });

  test('Notiz erscheint unter der Antwort', async ({ page }) => {
    await onboard(page);
    await seedDeck(page, [['Frage eins?', 'Antwort eins.']], 'Merke: Ladungsfrist prüfen.');
    await page.goto('/Juri/lernen');
    await flipButton(page).click();
    await expect(page.getByText('Notiz', { exact: true })).toBeVisible();
    await expect(page.getByText('Merke: Ladungsfrist prüfen.')).toBeVisible();
  });

  test('Stapel-Detail: „fällige lernen“ lernt nur diesen Stapel', async ({ page }) => {
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
    ]);
    await page.goto('/Juri/stapel');
    await page
      .getByRole('link', { name: /Deliktsrecht/ })
      .first()
      .click();
    await page
      .getByRole('link', { name: /2 fällige/ })
      .locator('visible=true')
      .click();
    await expect(page).toHaveURL(/\/lernen\?stapel=/);
    await expect(counter(page)).toHaveText('1/2');
  });
});

test.describe('Lernrhythmus', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Algorithmus wechseln, Behaltensquote und neue Karten pro Tag einstellen', async ({
    page,
  }) => {
    await onboard(page);
    await seedDeck(page, [
      ['Frage eins?', 'Antwort eins.'],
      ['Frage zwei?', 'Antwort zwei.'],
      ['Frage drei?', 'Antwort drei.'],
    ]);
    await page.goto('/Juri/');
    await openSettings(page);
    await expect(page.getByText('FSRS, 90 % Behaltensquote')).toBeVisible();
    await page
      .getByRole('main')
      .getByRole('link', { name: /^Lernrhythmus/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Lernrhythmus', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'FSRS (empfohlen)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('button', { name: /Examen/ }).click();
    await expect(page.getByText('95 %').first()).toBeVisible();
    // Das Limit für neue Karten liegt nie unter dem Tagesziel (24): erst das Ziel senken.
    const fewer = page.getByRole('button', { name: 'Weniger', exact: true });
    await expect(fewer).toBeDisabled();
    for (let i = 0; i < 21; i += 1)
      await page.getByRole('button', { name: 'Tagesziel senken' }).click();
    await expect(fewer).toBeEnabled();
    // Neue Karten pro Tag: 24 → 4 (viermal weniger); es sind nur 3 Karten da.
    for (let i = 0; i < 4; i += 1) await fewer.click();
    await expect(page.getByText('4', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Leitner-Kasten' }).click();
    await expect(page.getByRole('button', { name: 'Leitner-Kasten' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: /Fach 3, 7 Tage/ }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Einen Tag mehr' }).click();
    await expect(sheet.getByText('8', { exact: true })).toBeVisible();
    await sheet.getByRole('button', { name: 'Fertig' }).click();
    await expect(page.getByRole('button', { name: /Fach 3, 8 Tage/ })).toBeVisible();

    // Leitner lernen: Nochmal 1 T, Leicht 3 T.
    await page.goto('/Juri/lernen');
    await flipButton(page).click();
    await expect(rating(page, 'Nochmal')).toContainText('1 T');
    await expect(rating(page, 'Leicht')).toContainText('3 T');
    await rating(page, 'Leicht').click();
    await expect(counter(page)).toHaveText('2/3');
    await page.getByRole('button', { name: 'Lernen beenden' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Beenden' }).click();

    // Zurück zu FSRS: nichts geht verloren, die Karte bleibt bewertet (Heute: 2 statt 3 fällig).
    await page.goto('/Juri/einstellungen/lernrhythmus');
    await page.getByRole('button', { name: 'FSRS (empfohlen)' }).click();
    await expect(page.getByRole('button', { name: 'FSRS (empfohlen)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: /Examen/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expectDue(page, 2);
  });

  test('Tageslimit und Tagesziel: das Ziel hebt das Limit an, das Limit bleibt über dem Ziel', async ({
    page,
  }) => {
    await onboard(page);
    await page.goto('/Juri/einstellungen/lernrhythmus');
    const limit = page.getByRole('button', { name: 'Weniger', exact: true });
    await expect(page.getByText('Tagesziel Lernen')).toBeVisible();
    await expect(limit).toBeDisabled();
    // Ziel 24 → 28: das Limit steigt mit.
    await page.getByRole('button', { name: 'Tagesziel erhöhen' }).click();
    await expect(page.getByText('28', { exact: true })).toHaveCount(2);
    await expect(limit).toBeDisabled();
    // Ziel senken lässt das Limit stehen und gibt Spielraum nach unten frei.
    await page.getByRole('button', { name: 'Tagesziel senken' }).click();
    await expect(page.getByText('24', { exact: true })).toHaveCount(1);
    await expect(limit).toBeEnabled();
  });

  test('Entwicklungsstand: die Meilensteine samt Version', async ({ page }) => {
    await onboard(page);
    await openSettings(page);
    const stand = page.getByRole('region', { name: 'Entwicklungsstand' });
    await expect(stand.getByText('13 von 14 Schritten fertig')).toBeVisible();
    await stand.locator('summary').click();
    await expect(stand.getByRole('listitem').filter({ hasText: 'M11' })).toContainText('0.12.0');
    await expect(stand.getByRole('listitem').filter({ hasText: 'M12' })).toContainText('1.0.0');
    await expect(stand.getByRole('listitem').filter({ hasText: 'M13' })).toContainText('in Arbeit');
  });
});
