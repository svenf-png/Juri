import { expect, test, type Locator, type Page } from '@playwright/test';
import { asInstalledApp, onboard, openSettings, watchPage } from './helpers';

/*
 * Stapel, Karten und Lücken (M3) in der bedienten App: Anlegen, Bearbeiten, Löschen, Suche,
 * m:n und die Demo-Stapel der Testinstanz. Läuft auf iPhone und iPad; wo sich die Bedienung
 * unterscheidet (Tab-Bar oder Sidebar, Rechtsgebiete im Stapel), prüft der Test beide Wege.
 */

const wide = (page: Page) => page.viewportSize()!.width >= 1100;

/** Nur der sichtbare Treffer: Stapel-Detail steht für iPhone und iPad im DOM, eins ist ausgeblendet. */
const visible = (locator: Locator) => locator.locator('visible=true');

/** Erster Stapel „Deliktsrecht“ im Rechtsgebiet Zivilrecht über die Oberfläche. */
async function createDeck(page: Page, name = 'Deliktsrecht', area = 'Zivilrecht') {
  await page.goto('/Juri/stapel');
  await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill(name);
  await sheet.getByRole('button', { name: area }).click();
  await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
  await expect(page).toHaveURL(/\/stapel\/[^/]+$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

/** Karte „Frage“ über den Erstellen-Bildschirm des aktuellen Stapels. */
async function createQuestion(page: Page, front: string, back: string) {
  await page
    .getByRole('link', { name: /Erste Karte anlegen|\+ Karte/ })
    .first()
    .click();
  await page.getByLabel('Vorderseite').fill(front);
  await page.getByLabel('Rückseite').fill(back);
  await page.getByRole('button', { name: 'Speichern & nächste' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Karte gespeichert' })).toBeVisible();
}

test.describe('Stapel und Karten', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('Stapel, Frage und Heute: von der leeren App zur ersten Karte', async ({
    page,
    baseURL,
  }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await createDeck(page);
    await createQuestion(page, 'Was ist Gewahrsam?', 'Tatsächliche Sachherrschaft.');
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();
    await expect(page.getByRole('link', { name: /Was ist Gewahrsam\?/ })).toBeVisible();

    await page.goto('/Juri/');
    await expect(page.getByRole('heading', { name: /1 Karte/, level: 1 })).toContainText(
      'wartet heute',
    );
    await expect(page.getByText('+1 Karte angelegt')).toBeVisible();
    await expect(page.getByRole('link', { name: /Zivilrecht/ })).toBeVisible();
    expect(watch.errors).toEqual([]);
  });

  test('Lückentext mit drei Lücken ergibt drei Abfragen', async ({ page }) => {
    await onboard(page);
    await createDeck(page, 'Diebstahl und Betrug', 'Strafrecht');
    await page
      .getByRole('link', { name: /Erste Karte anlegen|\+ Karte/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Lücke', exact: true }).click();
    const text = page.getByLabel('Text', { exact: true });
    const sentence =
      'Wegnahme ist der Bruch fremden und die Begründung neuen, nicht notwendig tätereigenen Gewahrsams.';
    await text.fill(sentence);
    for (const word of ['Bruch fremden', 'Begründung neuen', 'tätereigenen']) {
      const start = sentence.indexOf(word);
      await text.evaluate(
        (el: HTMLTextAreaElement, [s, e]: number[]) => {
          el.focus();
          el.setSelectionRange(s!, e!);
        },
        [start, start + word.length],
      );
      await page.getByRole('button', { name: 'Markierung wird Lücke' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Lücken · 3 Abfragen' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Lücke 2 entfernen: Begründung neuen/ }),
    ).toBeVisible();
    // Eine Lücke lässt sich entfernen, der Text bleibt.
    await page.getByRole('button', { name: /Lücke 3 entfernen/ }).click();
    await expect(page.getByRole('heading', { name: 'Lücken · 2 Abfragen' })).toBeVisible();
    await expect(text).toHaveValue(sentence);
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Karte gespeichert' })).toBeVisible();
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', { name: /2 Karten/, level: 1 })).toContainText(
      'warten heute',
    );
  });

  test('Eingaben werden geprüft, Fehler stehen am Feld', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    await page
      .getByRole('link', { name: /Erste Karte anlegen|\+ Karte/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('Die Vorderseite fehlt.')).toBeVisible();
    await expect(page.getByText('Die Rückseite fehlt.')).toBeVisible();
    await expect(page.getByLabel('Vorderseite')).toBeFocused();
    await page.getByRole('button', { name: 'Lücke', exact: true }).click();
    await page.getByLabel('Text', { exact: true }).fill('Ein Text ohne Lücke');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('Markiere mindestens ein Wort als Lücke.')).toBeVisible();
    await page.getByRole('button', { name: 'Markierung wird Lücke' }).click();
    await expect(page.getByText('Markiere zuerst ein Wort im Text.')).toBeVisible();
  });

  test('Abdeckung ohne Bild bietet die Wahl von Foto oder PDF-Seite an', async ({ page }) => {
    await onboard(page);
    await page.goto('/Juri/neu');
    await page.getByRole('button', { name: 'Abdeckung', exact: true }).click();
    await expect(page.getByText('PDF-Seite oder Foto wählen')).toBeVisible();
    await expect(page.getByRole('button', { name: /^PDF/ }).first()).toBeEnabled();
    await page.getByRole('button', { name: /PDF-Seite oder Foto wählen/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Bild oder PDF-Seite wählen' });
    await expect(sheet.getByRole('button', { name: /Foto \/ Bild/ })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /PDF-Seite/ })).toBeVisible();
  });

  test('ohne Stapel öffnet Speichern die Stapelwahl und legt dort einen an', async ({ page }) => {
    await onboard(page);
    await page.goto('/Juri/neu');
    await page.getByLabel('Vorderseite').fill('Frage');
    await page.getByLabel('Rückseite').fill('Antwort');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    const pick = page.getByRole('dialog');
    await expect(pick.getByText('Noch kein Stapel. Lege den ersten an.')).toBeVisible();
    await pick.getByRole('button', { name: 'Neuer Stapel' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Name').fill('Sachenrecht');
    await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
    await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
    await expect(page.getByRole('button', { name: /Stapel: Sachenrecht · ZR/ })).toBeVisible();
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Karte gespeichert' })).toBeVisible();
    await expect(page.getByLabel('Vorderseite')).toHaveValue('');
  });

  test('die Kartenliste zeigt, wann eine Karte dran ist', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    await createQuestion(page, 'Was ist Gewahrsam?', 'Sachherrschaft.');
    await page.getByRole('button', { name: 'Schließen' }).click();
    // Neu und innerhalb des Tageslimits: heute dran.
    await expect(visible(page.getByText('Neu, heute dran'))).toBeVisible();
  });

  test('Karte bearbeiten und löschen', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    await createQuestion(page, 'Was ist Gewahrsam?', 'Sachherrschaft.');
    await page.getByRole('button', { name: 'Schließen' }).click();

    await page.getByRole('link', { name: /Was ist Gewahrsam\?/ }).click();
    await expect(page.getByRole('heading', { name: 'Karte bearbeiten', level: 1 })).toBeVisible();
    await expect(page.getByLabel('Vorderseite')).toHaveValue('Was ist Gewahrsam?');
    await page.getByLabel('Vorderseite').fill('Was ist Mitgewahrsam?');
    await page.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(page.getByRole('link', { name: /Was ist Mitgewahrsam\?/ })).toBeVisible();

    await page.getByRole('link', { name: /Was ist Mitgewahrsam\?/ }).click();
    await page.getByRole('button', { name: 'Karte löschen' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Was ist Mitgewahrsam?')).toBeVisible();
    await sheet.getByRole('button', { name: 'Karte löschen' }).click();
    await expect(visible(page.getByText('Hier erscheinen deine Karten'))).toBeVisible();
  });

  test('Stapel umbenennen und löschen, Rechtsgebiet bleibt', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    await createQuestion(page, 'Frage', 'Antwort');
    await page.getByRole('button', { name: 'Schließen' }).click();

    await page.getByRole('button', { name: 'Stapel-Menü' }).click();
    await page.getByRole('menuitem', { name: 'Stapel bearbeiten' }).click();
    const edit = page.getByRole('dialog');
    await edit.getByLabel('Name').fill('Deliktsrecht 2');
    await edit.getByLabel('Normen (optional)').fill('§§ 823 ff. BGB');
    await edit.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('heading', { name: 'Deliktsrecht 2' })).toBeVisible();
    await expect(visible(page.getByText('§§ 823 ff. BGB'))).toBeVisible();

    await page.getByRole('button', { name: 'Stapel-Menü' }).click();
    await page.getByRole('menuitem', { name: 'Stapel löschen' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Lernfortschritt')).toBeVisible();
    await sheet.getByRole('button', { name: 'Stapel löschen' }).click();
    await expect(page).toHaveURL(/\/Juri\/stapel$/);
    await expect(page.getByText('Noch keine Stapel')).toBeVisible();
  });

  test('Rechtsgebiete verwalten: anlegen, Löschen mit Sperre', async ({ page }) => {
    await onboard(page);
    await createDeck(page, 'Arbeitsvertrag', 'Zivilrecht');
    await page.goto('/Juri/stapel');
    await page.getByRole('button', { name: 'Rechtsgebiete verwalten' }).click();
    let sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Rechtsgebiet anlegen' }).click();
    sheet = page.getByRole('dialog');
    await sheet.getByLabel('Kürzel').fill('ar');
    await sheet.getByLabel('Name').fill('Arbeitsrecht');
    await sheet.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByRole('dialog').getByText('Arbeitsrecht')).toBeVisible();
    // Doppeltes Kürzel wird abgelehnt.
    await page.getByRole('dialog').getByRole('button', { name: 'Rechtsgebiet anlegen' }).click();
    await page.getByLabel('Kürzel').fill('AR');
    await page.getByLabel('Name').fill('Anderes');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByText('Dieses Kürzel gibt es schon.')).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    // Zivilrecht enthält einen Stapel, der nur dort liegt: gesperrt.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Zivilrecht bearbeiten/ })
      .click();
    await page.getByRole('button', { name: 'Rechtsgebiet löschen' }).click();
    await expect(
      page.getByText('Zivilrecht enthält Stapel, die sonst nirgends liegen'),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('link', { name: 'Arbeitsvertrag' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Verstanden' }).click();
    // Arbeitsrecht ist leer und lässt sich löschen.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Arbeitsrecht bearbeiten/ })
      .click();
    await page.getByRole('button', { name: 'Rechtsgebiet löschen' }).click();
    await expect(page.getByText('Arbeitsrecht löschen?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Rechtsgebiet löschen' }).click();
    await expect(page.getByRole('dialog').getByText('Arbeitsrecht')).toHaveCount(0);
  });

  test('ein Stapel in zwei Rechtsgebieten steht in beiden Gruppen, das letzte bleibt', async ({
    page,
  }) => {
    await onboard(page);
    await createDeck(page, 'Amtshaftung', 'Zivilrecht');
    if (wide(page)) {
      await page.getByRole('button', { name: '+ Rechtsgebiet' }).click();
      const sheet = page.getByRole('dialog');
      await expect(sheet.getByRole('button', { name: /Öffentliches Recht/ })).toHaveCount(0);
      await sheet.getByRole('button', { name: 'Fertig' }).click();
    }
    // Zweites Rechtsgebiet über die Verwaltung anlegen.
    await page.goto('/Juri/stapel');
    await page.getByRole('button', { name: 'Rechtsgebiete verwalten' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Rechtsgebiet anlegen' }).click();
    await page.getByRole('button', { name: /ÖR Öffentliches Recht/ }).click();
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Fertig' }).click();

    await page
      .getByRole('link', { name: /Amtshaftung/ })
      .first()
      .click();
    if (wide(page)) {
      await page.getByRole('button', { name: '+ Rechtsgebiet' }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Öffentliches Recht/ })
        .click();
      await page.getByRole('dialog').getByRole('button', { name: 'Fertig' }).click();
      // Erst weiter, wenn das Rechtsgebiet gespeichert ist (die Ansicht liest aus der Datenbank).
      await expect(
        visible(page.getByRole('button', { name: 'Öffentliches Recht entfernen' })),
      ).toBeVisible();
    } else {
      await page.getByRole('button', { name: 'Öffentliches Recht' }).click();
      // Das letzte Rechtsgebiet lässt sich nicht abwählen.
      await page.getByRole('button', { name: 'Zivilrecht' }).click();
      await page.getByRole('button', { name: 'Öffentliches Recht' }).click({ force: true });
      await expect(
        visible(page.getByText('Ein Stapel braucht mindestens ein Rechtsgebiet.')),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Zivilrecht' }).click();
      // Erst weiter, wenn beide Rechtsgebiete gespeichert sind: ein Seitenwechsel mitten im
      // Schreiben würde die Änderung verwerfen.
      await expect(page.getByRole('button', { name: 'Zivilrecht' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
    await page.goto('/Juri/stapel');
    await expect(page.getByRole('link', { name: /Amtshaftung/ })).toHaveCount(2);
    await expect(visible(page.getByText('auch ÖR')).first()).toBeVisible();
    // Filter zeigt nur ein Rechtsgebiet.
    await page.getByRole('button', { name: 'ÖR', exact: true }).click();
    await expect(page.getByRole('link', { name: /Amtshaftung/ })).toHaveCount(1);
  });

  test('Suche findet Karten nach Text, Norm und Tags und meldet Leeres', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    await page
      .getByRole('link', { name: /Erste Karte anlegen/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Mehr', exact: true }).click();
    await page.getByLabel('Vorderseite').fill('Was ist Gewahrsam?');
    await page.getByLabel('Rückseite').fill('Sachherrschaft.');
    await page.getByLabel('Norm').fill('§ 242 StGB');
    await page.getByLabel('Tags').fill('#Klausur');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Karte gespeichert' })).toBeVisible();
    await page.goto('/Juri/stapel');
    const search = page.getByRole('searchbox', { name: 'Suchen' });
    for (const query of ['gewahrsam', 'sachherrschaft', '242', '#klausur']) {
      await search.fill(query);
      const hits = page.getByRole('region', { name: 'Suchergebnisse' });
      await expect(hits.getByRole('status')).toHaveText('1 Treffer');
      await expect(hits.getByRole('link', { name: /Was ist Gewahrsam\?/ })).toBeVisible();
    }
    await search.fill('Verjährung');
    await expect(page.getByRole('heading', { name: 'Nichts gefunden' })).toBeVisible();
    await page.getByRole('button', { name: 'Suche zurücksetzen' }).click();
    await expect(search).toHaveValue('');
    await expect(page.getByRole('link', { name: /Deliktsrecht/ })).toBeVisible();
  });

  test('kein waagrechtes Scrollen auf Stapel und Erstellen', async ({ page }) => {
    await onboard(page);
    await createDeck(page);
    for (const path of ['/Juri/stapel', '/Juri/neu']) {
      await page.goto(path);
      const size = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: window.innerWidth,
      }));
      expect(size.scroll).toBeLessThanOrEqual(size.width);
    }
  });
});

test.describe('Master-Detail auf dem iPad', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('ab 1100 px stehen Liste und Stapel nebeneinander, darunter nacheinander', async ({
    page,
  }) => {
    await onboard(page);
    await createDeck(page);
    await createQuestion(page, 'Frage', 'Antwort');
    await page.getByRole('button', { name: 'Schließen' }).click();
    await page.goto('/Juri/stapel');
    if (wide(page)) {
      await expect(page.getByRole('heading', { name: 'Stapel', level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Deliktsrecht', level: 2 })).toBeVisible();
      await expect(page.getByRole('link', { name: /Frage/ }).first()).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Stapel', level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Deliktsrecht' })).toHaveCount(0);
      await page.getByRole('link', { name: /Deliktsrecht/ }).click();
      await expect(page.getByRole('heading', { name: 'Deliktsrecht', level: 1 })).toBeVisible();
      // Die Unterseite hat keine Tab-Bar; zurück geht es mit „Stapel“.
      if (page.viewportSize()!.width < 768) {
        await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeHidden();
      }
      await page.getByRole('main').getByRole('link', { name: 'Stapel', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Stapel', level: 1 })).toBeVisible();
    }
  });
});

test.describe('Demo-Stapel der Testinstanz', () => {
  test.beforeEach(async ({ page }) => {
    await asInstalledApp(page);
  });

  test('werden hinzugefügt, liegen in den Rechtsgebieten und sind wiederholbar', async ({
    page,
  }) => {
    await onboard(page, '/Juri/test/');
    await openSettings(page);
    await page.getByRole('button', { name: 'Demo-Stapel hinzufügen' }).click();
    await expect(page.getByText('6 Stapel mit 40 Karten hinzugefügt.')).toBeVisible();
    await page.goto('/Juri/test/stapel');
    await expect(page.getByRole('link', { name: /Amtshaftung \(Demo\)/ })).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Prüfungsschemata \(Demo\)/ })).toHaveCount(3);
    for (const name of [
      'Deliktsrecht (Demo)',
      'ZPO: Versäumnisurteil (Demo)',
      'Diebstahl und Betrug (Demo)',
      'VwGO: Anfechtungsklage (Demo)',
    ]) {
      await expect(
        page.getByRole('link', { name: new RegExp(name.replace(/[()]/g, '\\$&')) }),
      ).toHaveCount(1);
    }
    await page.getByRole('link', { name: /Diebstahl und Betrug \(Demo\)/ }).click();
    await expect(page.getByRole('link', { name: /Was ist Gewahrsam\?/ })).toBeVisible();
    await expect(visible(page.getByText('8 Karten')).first()).toBeVisible();
    // Zweites Laden legt nichts doppelt an.
    await page.goto('/Juri/test/einstellungen');
    await page.getByRole('button', { name: 'Demo-Stapel hinzufügen' }).click();
    await expect(page.getByText('Alle Demo-Stapel sind schon da.')).toBeVisible();
    await page.goto('/Juri/test/stapel');
    await expect(page.getByRole('link', { name: /Amtshaftung \(Demo\)/ })).toHaveCount(2);
  });
});
