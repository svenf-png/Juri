import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { HEUTE_LEER, watchPage } from './helpers';

/*
 * Update-Ablauf (M12, A92, Briefing B12): Eine neue Version meldet Juri mit einem Hinweis, statt
 * still neu zu laden. Der Test liefert eine Kopie von dist/ auf einem eigenen Port aus, ändert dort
 * die sw.js (ein neuer Service Worker, byte-verschieden) und prüft den ganzen Weg: Hinweis, kein
 * automatischer Reload, „Später“, erneuter Hinweis nach dem Neustart, „Neu laden“, Daten bleiben.
 */

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    `nur Chromium Desktop (dieses Projekt: ${browserName})`,
  );
});

/** Startet den Server mit einer Kopie von dist/; gibt Prozess und Ordner zurück. */
async function startServer(): Promise<{ server: ChildProcess; copy: string; origin: string }> {
  const copy = mkdtempSync(join(tmpdir(), 'juri-update-'));
  cpSync('dist', copy, { recursive: true });
  const server = spawn(
    process.execPath,
    ['scripts/serve-pages.mjs', '--port', '0', '--root', copy],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const origin = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Der Testserver ist nicht gestartet.'));
    }, 15_000);
    server.stdout.on('data', (chunk: Buffer) => {
      const match = /(http:\/\/127\.0\.0\.1:\d+)\/Juri\//.exec(chunk.toString());
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return { server, copy, origin };
}

test('Neue Version: Hinweis statt stillem Reload, „Später“, „Neu laden“, Daten bleiben', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { server, copy, origin: ORIGIN } = await startServer();
  try {
    const watch = watchPage(page, ORIGIN);
    await page.goto(`${ORIGIN}/Juri/test/`);
    await page.getByLabel('Wie heißt du?').fill('Sven');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await page.getByRole('heading', HEUTE_LEER).waitFor();

    // Erste Installation: Der Worker ist aktiv und steuert die Seite (nach einem Neustart).
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.getByRole('heading', HEUTE_LEER).waitFor();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true);
    const toast = page.getByRole('status').filter({ hasText: 'Neue Version verfügbar' });
    await expect(toast).toHaveCount(0);

    // Eine neue Version erscheint: byte-verschiedene sw.js am Server.
    await page.evaluate(() => {
      (window as unknown as { __alive: boolean }).__alive = true;
    });
    appendFileSync(join(copy, 'test', 'sw.js'), '\n// Update-Test: neue Version\n');
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/Juri/test/');
      await registration?.update();
    });
    await expect(toast).toBeVisible({ timeout: 30_000 });
    await expect(toast).toContainText('Deine Daten bleiben erhalten.');
    // Kein automatischer Reload: Die Seite lebt weiter, der Ablauf wird nicht unterbrochen.
    expect(await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive)).toBe(
      true,
    );

    // In der Lernrunde bleibt der Hinweis zurück (er läge über den Bewertungsknöpfen) und kommt danach.
    await page.evaluate(() => {
      history.pushState({}, '', '/Juri/test/lernen');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByRole('main', { name: 'Lernen' })).toBeVisible();
    await expect(toast).toHaveCount(0);
    await page.evaluate(() => {
      history.back();
    });
    await expect(page.getByRole('heading', HEUTE_LEER)).toBeVisible();
    await expect(toast).toBeVisible();

    // „Später“ blendet den Hinweis aus, die Seite bleibt unverändert.
    await toast.getByRole('button', { name: 'Später' }).click();
    await expect(toast).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive)).toBe(
      true,
    );

    // Nach dem Neustart wartet die neue Version noch: Der Hinweis kommt wieder.
    await page.reload();
    await expect(toast).toBeVisible({ timeout: 30_000 });

    // „Neu laden“ übernimmt die neue Version, die Daten bleiben.
    await page.evaluate(() => {
      (window as unknown as { __alive: boolean }).__alive = true;
    });
    // Ein Tipp auf „Neu laden“ übernimmt die neue Version und lädt die Seite neu.
    await Promise.all([
      page.waitForEvent('load', { timeout: 30_000 }),
      toast.getByRole('button', { name: 'Neu laden' }).click(),
    ]);
    expect(
      await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive),
    ).toBeUndefined();
    await page.getByRole('heading', HEUTE_LEER).waitFor();
    await expect(toast).toHaveCount(0);
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/Juri/test/');
      return {
        waiting: registration?.waiting != null,
        installing: registration?.installing != null,
      };
    });
    expect(state).toEqual({ waiting: false, installing: false });
    // Das Profil ist noch da (kein neues Onboarding).
    await page.goto(`${ORIGIN}/Juri/test/einstellungen`);
    await expect(page.getByLabel('Name')).toHaveValue('Sven');
    expect(watch.errors).toEqual([]);
  } finally {
    server.kill();
    rmSync(copy, { recursive: true, force: true });
  }
});
