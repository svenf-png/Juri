import { expect, test } from '@playwright/test';
import { asInstalledApp, onboard } from './helpers';

// TEMPORAER: Firefox zeigt „Neue Version verfügbar“ in den Kartentests. Zeitlinie des Service Workers.
test('diagnose service worker timeline', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox', 'nur Firefox');
  await asInstalledApp(page);
  const lines: string[] = [];
  const t0 = Date.now();
  const log = (s: string) => lines.push(`${String(Date.now() - t0)}ms ${s}`);
  page.on('response', (r) => {
    if (/sw\.js|workbox|manifest/.test(r.url()))
      log(
        `RESP ${r.url().replace(/^.*\/Juri/, '')} ${String(r.status())} len=${r.headers()['content-length'] ?? '?'} etag=${r.headers().etag ?? '-'} cc=${r.headers()['cache-control'] ?? '-'}`,
      );
  });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) log(`NAV ${f.url().replace(/^.*\/Juri/, '')}`);
  });
  const snap = async (label: string) => {
    const s = await page
      .evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return JSON.stringify({
          inst: reg?.installing?.state ?? null,
          wait: reg?.waiting?.state ?? null,
          act: reg?.active?.state ?? null,
          ctrl: navigator.serviceWorker.controller?.state ?? null,
          toast: document.body.innerText.includes('Neue Version'),
        });
      })
      .catch((e: unknown) => `ERR ${String(e)}`);
    log(`${label} ${s}`);
  };
  await onboard(page);
  await snap('nach onboard');
  await page.goto('/Juri/stapel');
  await snap('nach goto stapel');
  await page.getByRole('button', { name: 'Ersten Stapel anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Name').fill('Sachenrecht');
  await sheet.getByRole('button', { name: 'Zivilrecht' }).click();
  await sheet.getByRole('button', { name: 'Stapel anlegen' }).click();
  await snap('nach Stapel anlegen');
  await page.goto('/Juri/neu');
  await snap('nach goto neu');
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(500);
    await snap(`+${String((i + 1) * 500)}`);
  }
  expect(lines.join('\n')).toBe('DIAGNOSE');
});
