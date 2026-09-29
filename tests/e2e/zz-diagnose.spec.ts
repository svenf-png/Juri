import { expect, test } from '@playwright/test';

// TEMPORAER: Firefox zeigt „Neue Version verfügbar“ auf frischem Profil. Zeitlinie des Service Workers.
test('diagnose service worker timeline', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox', 'nur Firefox');
  const lines: string[] = [];
  const t0 = Date.now();
  const snap = async (label: string) => {
    const s = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return JSON.stringify({
        inst: reg?.installing?.state ?? null,
        wait: reg?.waiting?.state ?? null,
        act: reg?.active?.state ?? null,
        ctrl: navigator.serviceWorker.controller?.state ?? null,
        toast: document.body.innerText.includes('Neue Version'),
      });
    });
    lines.push(`${String(Date.now() - t0)}ms ${label} ${s}`);
  };
  await page.goto('/Juri/');
  await snap('nach goto /Juri/');
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(500);
    await snap(`+${String((i + 1) * 500)}`);
  }
  await page.goto('/Juri/stapel');
  await snap('nach goto /Juri/stapel');
  await page.waitForTimeout(1500);
  await snap('+1500 danach');
  expect(lines.join('\n')).toBe('DIAGNOSE');
});
