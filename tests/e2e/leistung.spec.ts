import { statSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

/*
 * Leistung mit 5.000 Karten (M12, A90): echte IndexedDB und echte Darstellung in Chromium bei
 * 1440 × 900, Testinstanz mit dem großen Datensatz (`src/demo/demoLarge.ts`). Gemessen wird bis
 * zum sichtbaren Ergebnis. Die zweite Runde drosselt die CPU auf ein Viertel (Chrome DevTools
 * `Emulation.setCPUThrottlingRate`) als grobe Annäherung an ein älteres Gerät; sie ersetzt keine
 * Messung auf einem iPhone oder iPad. Die Grenzen stehen in `BUDGET_MS` und in A90.
 */

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    `nur Chromium Desktop (dieses Projekt: ${browserName})`,
  );
});

/**
 * Grenzen in Millisekunden (A90). Öffnen eines Bildschirms bis zum sichtbaren Inhalt: höchstens
 * 1,5 s; Eingabe (Suche) bis zum Ergebnis: höchstens 500 ms (die Schwelle „schlecht“ für die
 * Reaktion auf Eingaben nach web.dev/articles/inp); Backup bis zur fertigen Datei: höchstens 5 s.
 * Mit vierfach gedrosselter CPU gelten 4 s, 1,5 s und 8 s. „laden“ ist nur Testdaten-Einspielen
 * und hat eine grobe Obergrenze. „bewerten“ besteht fast nur aus dem Kartenwechsel der Oberfläche
 * (rund 0,9 s, auch mit 40 Karten); dort gilt, höchstens `BEWERTEN_MEHR_MS` mehr als im kleinen
 * Demo-Profil, gedrosselt wie das Öffnen.
 */
export const BUDGET_MS = {
  laden: 30_000,
  start: 1_500,
  stapel: 1_500,
  stapelDetail: 1_500,
  suche: 500,
  lernenStart: 1_500,
  bewerten: 1_500,
  erfolge: 1_500,
  backup: 5_000,
} as const;

export const BUDGET_GEDROSSELT_MS = {
  start: 4_000,
  stapel: 4_000,
  stapelDetail: 4_000,
  suche: 1_500,
  lernenStart: 4_000,
  bewerten: 4_000,
  erfolge: 4_000,
  backup: 8_000,
} as const;

/** Mehraufwand durch 5.000 statt 40 Karten beim Bewerten (Millisekunden). */
export const BEWERTEN_MEHR_MS = 300;

type Messung = Record<keyof typeof BUDGET_MS, number>;

async function timed<T>(fn: () => Promise<T>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function startDemo(page: Page) {
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto('/Juri/test/');
  await page.getByRole('button', { name: 'Mit Demo-Profil starten' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
}

async function loadLarge(page: Page): Promise<number> {
  await page.goto('/Juri/test/einstellungen');
  return timed(async () => {
    await page.getByRole('button', { name: 'Großen Datensatz laden (5.000 Karten)' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: '5000 Karten in 50 Stapeln' }),
    ).toBeVisible({ timeout: 60_000 });
  });
}

/** Median aus `n` Läufen (Millisekunden); `before` bereitet jeden Lauf vor und zählt nicht mit. */
async function median(n: number, run: () => Promise<number>): Promise<number> {
  const values: number[] = [];
  for (let i = 0; i < n; i++) values.push(await run());
  values.sort((x, y) => x - y);
  return values[Math.floor(values.length / 2)] ?? 0;
}

interface Szenario {
  /** Stapel, der in der Liste vorkommt, und seine Überschrift. */
  deck: RegExp;
  heading: string;
  /** Suchbegriff mit genau einem Treffer. */
  query: string;
}

const GROSS: Szenario = {
  deck: /Großer Stapel 1(\D|$)/,
  heading: 'Großer Stapel 1',
  query: '4711',
};
const KLEIN: Szenario = {
  deck: /Deliktsrecht/,
  heading: 'Deliktsrecht (Demo)',
  query: 'Verrichtungsgehilfen',
};

async function measureAll(
  page: Page,
  testInfo: { outputPath: (n: string) => string },
  laden: number,
  szenario: Szenario,
) {
  const result: Partial<Messung> = { laden };
  const decks = page.getByRole('link', { name: szenario.deck }).first();
  // Kaltstart: Seite neu laden, bis Heute die fälligen Karten zeigt.
  result.start = await median(3, () =>
    timed(async () => {
      await page.goto('/Juri/test/');
      await expect(
        page.getByRole('heading', { name: /Karten\s+warten heute/, level: 1 }),
      ).toBeVisible();
    }),
  );
  result.stapel = await median(3, () =>
    timed(async () => {
      await page.goto('/Juri/test/stapel');
      await expect(decks).toBeVisible();
    }),
  );
  result.stapelDetail = await median(3, async () => {
    await page.goto('/Juri/test/stapel');
    await expect(decks).toBeVisible();
    return timed(async () => {
      await decks.click();
      await expect(page.getByRole('heading', { name: szenario.heading })).toBeVisible();
    });
  });
  // Suche: Seitenwechsel zählt nicht, gemessen wird vom Eingeben bis zur Trefferzeile.
  await page.goto('/Juri/test/stapel');
  const search = page.getByRole('searchbox', { name: 'Suchen' });
  await expect(search).toBeVisible();
  const hits = page.getByRole('region', { name: 'Suchergebnisse' });
  result.suche = await median(3, async () => {
    await search.fill('');
    await expect(decks).toBeVisible();
    return timed(async () => {
      await search.fill(szenario.query);
      await expect(hits.getByRole('status')).toHaveText('1 Treffer');
    });
  });
  await page.goto('/Juri/test/lernen');
  result.lernenStart = await median(3, () =>
    timed(async () => {
      await page.goto('/Juri/test/lernen');
      await expect(page.locator('[aria-label^="Karte "]')).toHaveText(/^1\//);
    }),
  );
  // Bewerten: je Karte aufdecken (Leertaste) und „Gut“, bis die nächste Karte steht; Median aus fünf.
  const good = page.getByRole('button', { name: /^Gut/ });
  const counts: number[] = [];
  let n = 1;
  result.bewerten = await median(5, async () => {
    const next = ++n;
    const ms = await timed(async () => {
      for (let step = 0; step < 6 && !(await good.isVisible()); step++) {
        await page.keyboard.press(' ');
      }
      await good.click();
      await expect(page.locator('[aria-label^="Karte "]')).toHaveText(
        new RegExp(`^${String(next)}/`),
      );
    });
    counts.push(ms);
    return ms;
  });
  result.erfolge = await median(3, () =>
    timed(async () => {
      await page.goto('/Juri/test/erfolge');
      await expect(page.getByRole('heading', { name: 'Erfolge', level: 1 })).toBeVisible();
    }),
  );
  let size = 0;
  result.backup = await median(2, async () => {
    await page.goto('/Juri/test/einstellungen');
    const button = page.getByRole('button', { name: 'Backup erstellen' });
    await expect(button).toBeVisible();
    return timed(async () => {
      await button.click();
      const sheet = page.getByRole('dialog', { name: /^Juri-(Test-)?Backup-/ });
      await expect(sheet).toBeVisible({ timeout: 60_000 });
      const downloading = page.waitForEvent('download');
      await sheet.getByRole('button', { name: /^(Sichern oder teilen|Herunterladen)$/ }).click();
      const download = await downloading;
      const file = testInfo.outputPath(download.suggestedFilename());
      await download.saveAs(file);
      size = statSync(file).size;
    });
  });
  return { result: result as Messung, backupBytes: size, bewertenEinzeln: counts };
}

test.describe.configure({ mode: 'serial' });

test.describe('5.000 Karten', () => {
  test('Messung ohne Drosselung und mit vierfach gedrosselter CPU', async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    const watch = watchPage(page, 'http://127.0.0.1:4173');
    await startDemo(page);
    const klein = await measureAll(page, testInfo, 0, KLEIN);

    const laden = await loadLarge(page);
    const plain = await measureAll(page, testInfo, laden, GROSS);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const slow = await measureAll(page, testInfo, laden, GROSS);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const report = {
      kleinesProfil: klein.result,
      ohneDrosselung: plain.result,
      cpuViertel: slow.result,
      backupBytes: plain.backupBytes,
      bewertenEinzeln: [klein.bewertenEinzeln, plain.bewertenEinzeln, slow.bewertenEinzeln],
    };
    await testInfo.attach('leistung.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    console.log(`LEISTUNG ${JSON.stringify(report)}`);

    for (const key of Object.keys(BUDGET_MS) as (keyof typeof BUDGET_MS)[]) {
      expect(plain.result[key], `${key} ohne Drosselung`).toBeLessThanOrEqual(BUDGET_MS[key]);
    }
    for (const key of Object.keys(BUDGET_GEDROSSELT_MS) as (keyof typeof BUDGET_GEDROSSELT_MS)[]) {
      expect(slow.result[key], `${key} mit vierfach gedrosselter CPU`).toBeLessThanOrEqual(
        BUDGET_GEDROSSELT_MS[key],
      );
    }
    expect(
      plain.result.bewerten - klein.result.bewerten,
      'Mehraufwand beim Bewerten',
    ).toBeLessThanOrEqual(BEWERTEN_MEHR_MS);
    expect(watch.errors).toEqual([]);
  });
});
