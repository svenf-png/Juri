import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { asInstalledApp, onboard, watchPage } from './helpers';

/*
 * Fristen (M8) in der bedienten App: anlegen mit Prüfung, bearbeiten, löschen, Zählung unter
 * Lernrhythmus, Chip in Heute, Deckelung (Fälligkeit wird zur Laufzeit vorgezogen und wieder
 * freigegeben), .ics-Export als Download, Tastatur. Läuft auf iPhone, iPad und Desktop.
 * Nach Aktionen, die schreiben, wird erst auf die sichtbare Wirkung gewartet, dann navigiert.
 */

/**
 * Datum in `days` Lerntagen als „JJJJ-MM-TT“ nach der Uhr des Geräts. Der Lerntag wechselt um
 * 04:00 (Entscheidung 6): Zwischen 0 und 4 Uhr ist „heute“ noch der Vortag, sonst wäre „morgen“
 * zu spät und die Deckelung griffe nicht (in der CI kurz nach Mitternacht beobachtet).
 */
async function inDays(page: Page, days: number): Promise<string> {
  return page.evaluate((n) => {
    const d = new Date(Date.now() - 4 * 3_600_000);
    d.setDate(d.getDate() + n);
    const two = (v: number) => String(v).padStart(2, '0');
    return `${String(d.getFullYear())}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  }, days);
}

/** Frist über das Sheet anlegen; Umfang bleibt „Alle Karten“. */
async function addDeadline(page: Page, name: string, days: number) {
  await page.getByRole('button', { name: '+ Frist hinzufügen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill(name);
  await sheet.getByLabel('Datum').fill(await inDays(page, days));
  await sheet.getByRole('button', { name: 'Frist speichern' }).click();
  await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
}

async function openFristen(page: Page) {
  await page.goto('/Juri/fristen');
  await expect(page.getByRole('heading', { name: 'Fristen', level: 1 })).toBeVisible();
}

test.describe('Fristen', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Auf dem Desktop läuft die App im Tab (kein Sperrbild), sonst als installierte App (A13).
    if (!testInfo.project.name.endsWith('-desktop')) await asInstalledApp(page);
  });

  test('anlegen mit Prüfung, bearbeiten, löschen', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await onboard(page);
    await openFristen(page);
    await expect(page.getByRole('heading', { name: 'Noch keine Fristen' })).toBeVisible();

    await page.getByRole('button', { name: '+ Frist hinzufügen' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Neue Frist' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Frist speichern' }).click();
    await expect(sheet.getByRole('alert')).toContainText('Gib der Frist einen Namen.');
    await sheet.getByLabel('Name').fill('Klausur ÖR');
    await sheet.getByLabel('Datum').fill('2020-01-01');
    await sheet.getByRole('button', { name: 'Frist speichern' }).click();
    await expect(sheet.getByRole('alert')).toContainText('Das Datum liegt in der Vergangenheit.');
    await sheet.getByLabel('Datum').fill(await inDays(page, 30));
    await sheet.getByRole('button', { name: 'Klausur', exact: true }).click();
    await sheet.getByRole('button', { name: 'Frist speichern' }).click();

    const card = page.getByRole('button', { name: /Klausur ÖR/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Alle Rechtsgebiete');
    await expect(card).toContainText(/\b(29|30) Tage|\b(29|30)\b/);
    await expect(page.getByRole('heading', { name: 'Noch keine Fristen' })).toHaveCount(0);

    // Heute zeigt die nächste Frist als Chip, Lernrhythmus die Zahl.
    await page.goto('/Juri/');
    await expect(page.getByRole('link', { name: /Klausur ÖR/ })).toBeVisible();
    await page.goto('/Juri/einstellungen/lernrhythmus');
    const row = page.getByRole('link', { name: /Fristen.*Abstände enden/ });
    await expect(row).toContainText('1');
    await row.click();
    await expect(page.getByRole('heading', { name: 'Fristen', level: 1 })).toBeVisible();

    // Bearbeiten: Name und Endspurt ändern, Umfang eingrenzen.
    await page.getByRole('button', { name: /Klausur ÖR/ }).click();
    await expect(sheet.getByRole('heading', { name: 'Frist bearbeiten' })).toBeVisible();
    await sheet.getByLabel('Name').fill('Klausur ÖR 2');
    await sheet.getByRole('switch', { name: /Endspurt/ }).click();
    await sheet.getByRole('button', { name: '+ Eingrenzen' }).click();
    await expect(sheet.getByRole('heading', { name: 'Umfang wählen' })).toBeVisible();
    await sheet.getByLabel('Tag hinzufügen').fill('#Klausur');
    await sheet.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(sheet.getByRole('button', { name: '#Klausur', pressed: true })).toBeVisible();
    await sheet.getByRole('button', { name: 'Fertig' }).click();
    await expect(sheet.getByRole('button', { name: '#Klausur entfernen' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(page.getByRole('button', { name: /Klausur ÖR 2/ })).toContainText('Tag #Klausur');

    // Löschen mit Bestätigung; Abbrechen ändert nichts.
    await page.getByRole('button', { name: /Klausur ÖR 2/ }).click();
    await sheet.getByRole('button', { name: 'Löschen' }).click();
    await expect(sheet.getByRole('heading', { name: 'Klausur ÖR 2 löschen?' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByRole('button', { name: /Klausur ÖR 2/ })).toBeVisible();
    await page.getByRole('button', { name: /Klausur ÖR 2/ }).click();
    await sheet.getByRole('button', { name: 'Löschen' }).click();
    await sheet.getByRole('button', { name: 'Frist löschen' }).click();
    await expect(page.getByRole('heading', { name: 'Noch keine Fristen' })).toBeVisible();
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Frist ohne Datum ändert nichts und lässt sich mit Datum ergänzen', async ({ page }) => {
    await onboard(page);
    await openFristen(page);
    await page.getByRole('button', { name: '+ Frist hinzufügen' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Examen' }).click();
    await sheet.getByLabel('Name').fill('2. Staatsexamen');
    await sheet.getByRole('button', { name: 'Frist speichern' }).click();
    const card = page.getByRole('button', { name: /2\. Staatsexamen/ });
    await expect(card).toContainText('Datum setzen');
    await card.click();
    await sheet.getByLabel('Datum').fill(await inDays(page, 100));
    await sheet.getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(page.getByRole('button', { name: /2\. Staatsexamen/ })).not.toContainText(
      'Datum setzen',
    );
  });

  test('Deckelung: die Frist zieht Karten vor, gespeichert wird nichts, nach Löschen gilt wieder der Rhythmus', async ({
    page,
  }) => {
    await onboard(page);
    await page.goto('/Juri/stapel');
    await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
    const create = page.getByRole('dialog');
    await create.getByLabel('Name').fill('Deliktsrecht');
    await create.getByRole('button', { name: 'Zivilrecht' }).click();
    await create.getByRole('button', { name: 'Stapel anlegen' }).click();
    await expect(page.getByRole('heading', { name: 'Deliktsrecht' })).toBeVisible();
    await page
      .getByRole('link', { name: /Erste Karte anlegen/ })
      .first()
      .click();
    await page.getByLabel('Vorderseite').fill('Was ist Gewahrsam?');
    await page.getByLabel('Rückseite').fill('Sachherrschaft.');
    await page.getByRole('button', { name: 'Speichern & nächste' }).click();
    await expect(page.getByText('1 von 5 heute')).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).click();

    // Einmal mit „Leicht“ gelernt, dann gilt sie als vor 20 Tagen gelernt und erst in 90 Tagen fällig.
    await page.goto('/Juri/');
    await page.getByRole('link', { name: 'Lernen starten' }).click();
    await page.getByRole('button', { name: 'Antwort zeigen', exact: true }).click();
    await page.getByRole('button', { name: /^Leicht/ }).click();
    await expect(page.getByRole('heading', { name: 'Geschafft.' })).toBeVisible();
    await page.getByRole('button', { name: 'Zurück zu Heute' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alles erledigt');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('juri');
          open.onerror = () => {
            reject(new Error('Datenbank nicht zu öffnen'));
          };
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('reviewItems', 'readwrite');
            const store = tx.objectStore('reviewItems');
            const all = store.getAll();
            all.onsuccess = () => {
              const day = 86_400_000;
              for (const item of all.result as Record<string, unknown>[]) {
                store.put({
                  ...item,
                  due: Date.now() + 90 * day,
                  lastReviewedAt: Date.now() - 20 * day,
                });
              }
            };
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              reject(new Error('Schreiben fehlgeschlagen'));
            };
          };
        }),
    );
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alles erledigt');

    // Frist morgen: Der letzte Lerntag davor ist heute, die Karte kommt heute dran.
    await openFristen(page);
    await addDeadline(page, 'Klausur ZR', 1);
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('1 Karte');

    // Ohne Frist gilt wieder der gespeicherte Termin.
    await openFristen(page);
    await page.getByRole('button', { name: /Klausur ZR/ }).click();
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('button', { name: 'Frist löschen' }).click();
    await expect(page.getByRole('heading', { name: 'Noch keine Fristen' })).toBeVisible();
    await page.goto('/Juri/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Alles erledigt');
  });

  test('Kalenderdatei (.ics) kommt als Download', async ({ page }) => {
    await onboard(page);
    await openFristen(page);
    await addDeadline(page, 'Klausur ÖR', 20);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Fristen als Kalenderdatei sichern' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^juri-fristen-\d{4}-\d{2}-\d{2}\.ics$/);
    const text = readFileSync(await file.path(), 'utf8');
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('SUMMARY:Klausur ÖR');
    expect(text).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
    expect(text).toContain('SUMMARY:Endspurt: Klausur ÖR');
    await expect(page.getByRole('status')).toContainText('Kalenderdatei');
  });

  test('Tastatur: „f“ öffnet das Sheet, Strg oder Cmd plus Eingabe speichert', async ({ page }) => {
    await onboard(page);
    await openFristen(page);
    // Erst tippen, wenn die Seite steht: Der Handler hängt nach dem ersten Rendern am Fenster.
    await expect(page.getByRole('button', { name: '+ Frist hinzufügen' })).toBeVisible();
    await page.keyboard.press('f');
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Neue Frist' })).toBeVisible();
    await sheet.getByLabel('Name').fill('Per Tastatur');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.getByRole('button', { name: /Per Tastatur/ })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('nichts wird abgeschnitten: kein Querlauf, Sheet passt in den Bildschirm', async ({
    page,
  }) => {
    await onboard(page);
    await openFristen(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await addDeadline(page, 'Klausur ÖR', 20);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: /Klausur ÖR/ }).click();
    const box = await page.getByRole('dialog').boundingBox();
    const height = page.viewportSize()!.height;
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
  });
});
