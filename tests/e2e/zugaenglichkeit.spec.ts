import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { watchPage } from './helpers';

/*
 * Zugänglichkeit (M12, A91): axe-core (WCAG 2.2 AA und Best Practices) auf allen Hauptbildschirmen
 * und Sheets der Testinstanz mit dem Demo-Profil, dazu Fokus (Sheets) und Touch-Ziele (44 px).
 * Gemessen wird mit reduzierter Bewegung: Die App blendet Inhalte sonst ein, und axe rechnet
 * mit dem halb durchsichtigen Text. Das echte VoiceOver ersetzt das nicht (Geräte-Testliste, M12).
 */

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    !/(iphone14|ipad-quer)$|^chromium-desktop$/.test(testInfo.project.name),
    `nur iPhone, iPad quer und Chromium Desktop (dieses Projekt: ${browserName})`,
  );
});

// Unter Last (parallele Tests, WebKit in der CI) braucht der Aufbau eines Bildschirms länger als 5 s.
expect.configure({ timeout: 15_000 });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TOUCH_MIN = 44;

async function startDemo(page: Page) {
  page.on('dialog', (dialog) => void dialog.accept());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/Juri/test/');
  await page.getByRole('button', { name: 'Mit Demo-Profil starten' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
}

/** Schließt Feier-Dialoge, die beim Öffnen eines Bildschirms aufgehen (Meilenstein, High five). */
async function closeCelebrations(page: Page) {
  const open = page.locator('dialog[open]');
  for (let i = 0; i < 4 && (await open.count()) > 0; i++) {
    await open
      .first()
      .getByRole('button', { name: /^(Super|Schön|Weiter|Schließen)$/ })
      .first()
      .click();
    await page.waitForTimeout(150);
  }
  await expect(open).toHaveCount(0);
}

async function violations(
  page: Page,
  label: string,
  include?: string,
  partial = false,
): Promise<string[]> {
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  // Vorschauen zeigen Teile eines Bildschirms ohne eigene Landmarke und Überschrift der Seite.
  if (partial) builder.disableRules(['landmark-one-main', 'page-has-heading-one', 'region']);
  // Beispiel-Text auf der gezeichneten PDF-Seite der Vorschau, keine Oberfläche.
  if (partial) builder.exclude('[class*="pageHeading"]');
  const results = await (include ? builder.include(include) : builder).analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((node) => {
      const data = (node.any[0]?.data ?? {}) as Record<string, unknown>;
      const contrast =
        v.id === 'color-contrast'
          ? ` | ${String(data.fgColor)} auf ${String(data.bgColor)} = ${String(data.contrastRatio)} (soll ${String(data.expectedContrastRatio)})`
          : '';
      return `${label} | ${v.id} (${v.impact ?? '?'}) | ${node.target.join(' ')}${contrast}`;
    }),
  );
}

/**
 * Bedienbare Elemente, deren Trefferfläche kleiner als 44 × 44 px ist. Die Fläche darf größer sein
 * als das sichtbare Element (CLAUDE.md, erweiterte Trefferfläche über `::after`): Gemessen wird mit
 * `elementFromPoint` an den Ecken eines 44-px-Quadrats um die Mitte; trifft jede Ecke das Element
 * oder etwas darin, zählt die Fläche. Ein Feld mit Beschriftung wird über sein Label getroffen
 * (Tippen aufs Label fokussiert es). Links im Fließtext sind ausgenommen (WCAG 2.5.8).
 */
async function smallTargets(page: Page, scope = 'body'): Promise<string[]> {
  return page.evaluate(
    ({ min, root }) => {
      const selector =
        'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], summary';
      const out: string[] = [];
      const container = document.querySelector(root);
      // Hinter einem offenen modalen Sheet ist nichts bedienbar.
      // Das oberste modale Element zählt (ein Sheet kann über einem Popover liegen).
      const modal = [
        ...document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]'),
      ].at(-1);
      for (const el of container?.querySelectorAll<HTMLElement>(selector) ?? []) {
        if (el.closest('[inert], [aria-hidden="true"], dialog:not([open])')) continue;
        if (modal && !modal.contains(el)) continue;
        // Rechtecke auf dem Bild (Abdeckung): Größe und Lage folgen dem Bild, „Feld n aufdecken“ ersetzt sie.
        if (el.closest('[data-mask]')) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const isField =
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement;
        const area = isField ? (el.labels?.[0] ?? el) : el;
        const rect = area.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (el instanceof HTMLAnchorElement && el.closest('p, li') && style.display === 'inline') {
          continue;
        }
        if (rect.width >= min && rect.height >= min) continue;
        // In die Mitte holen: Tab-Bar und Banner liegen sonst über Elementen am Rand der Seite.
        area.scrollIntoView({ block: 'center', inline: 'center' });
        const now = area.getBoundingClientRect();
        const cx = now.left + now.width / 2;
        const cy = now.top + now.height / 2;
        const half = min / 2 - 1;
        const reaches = [
          [cx - half, cy - half],
          [cx + half, cy - half],
          [cx - half, cy + half],
          [cx + half, cy + half],
        ].every(([x, y]) => {
          if (x === undefined || y === undefined) return true;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
          const hit = document.elementFromPoint(x, y);
          if (hit === null) return false;
          if (area === hit || area.contains(hit)) return true;
          // In dichten Reihen teilen sich Nachbarn die Lücke: Ein anderes Bedienelement ist kein toter Bereich.
          const other = hit.closest(`${selector}, label`);
          return other !== null && other !== area;
        });
        if (reaches) continue;
        const labelled = el instanceof HTMLInputElement ? el.labels?.[0]?.textContent : null;
        const label = (
          el.getAttribute('aria-label') ??
          labelled ??
          (el.textContent || el.getAttribute('placeholder') || el.getAttribute('type') || '')
        )
          .trim()
          .slice(0, 30);
        out.push(
          `${el.tagName.toLowerCase()} "${label}" ${String(Math.round(rect.width))}x${String(Math.round(rect.height))}`,
        );
      }
      return out;
    },
    { min: TOUCH_MIN, root: scope },
  );
}

interface Screen {
  name: string;
  open: (page: Page) => Promise<void>;
}

const SCREENS: Screen[] = [
  {
    name: 'Heute',
    open: async (page) => {
      await page.goto('/Juri/test/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Stapel',
    open: async (page) => {
      await page.goto('/Juri/test/stapel');
      await expect(page.getByRole('link', { name: /Deliktsrecht/ }).first()).toBeVisible();
    },
  },
  {
    name: 'Stapel-Detail',
    open: async (page) => {
      await page.goto('/Juri/test/stapel/demo-deliktsrecht');
      await expect(page.getByRole('heading', { name: /Deliktsrecht/ }).first()).toBeVisible();
    },
  },
  {
    name: 'Neue Karte',
    open: async (page) => {
      await page.goto('/Juri/test/neu');
      await expect(page.getByLabel('Vorderseite')).toBeVisible();
    },
  },
  {
    name: 'Karte bearbeiten',
    open: async (page) => {
      await page.goto('/Juri/test/karte/demo-deliktsrecht-01');
      await expect(page.getByRole('heading', { name: 'Karte bearbeiten', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Lernen (Vorderseite)',
    open: async (page) => {
      await page.goto('/Juri/test/lernen');
      await expect(page.locator('[aria-label^="Karte "]')).toBeVisible();
    },
  },
  {
    name: 'Lernen (Rückseite)',
    open: async (page) => {
      await page.goto('/Juri/test/lernen');
      const good = page.getByRole('button', { name: /^Gut/ });
      for (let step = 0; step < 6 && !(await good.isVisible()); step++) {
        await page.keyboard.press(' ');
      }
      await expect(good).toBeVisible();
    },
  },
  {
    name: 'Erfolge',
    open: async (page) => {
      await page.goto('/Juri/test/erfolge');
      await closeCelebrations(page);
      await expect(page.getByRole('button', { name: 'Tagesziele' })).toBeVisible();
    },
  },
  {
    name: 'Fristen',
    open: async (page) => {
      await page.goto('/Juri/test/fristen');
      await expect(page.getByRole('button', { name: '+ Frist hinzufügen' })).toBeVisible();
    },
  },
  {
    name: 'Teilen',
    open: async (page) => {
      await page.goto('/Juri/test/teilen');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  {
    name: 'High fives',
    open: async (page) => {
      await page.goto('/Juri/test/high-fives');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Einstellungen',
    open: async (page) => {
      await page.goto('/Juri/test/einstellungen');
      await expect(page.getByRole('heading', { name: 'Einstellungen', level: 1 })).toBeVisible();
    },
  },
  {
    name: 'Lernrhythmus',
    open: async (page) => {
      await page.goto('/Juri/test/einstellungen/lernrhythmus');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  },
];

/** Sheets: der Bildschirm, in dem sie aufgehen, und der Knopf, der sie öffnet. */
const SHEETS: {
  name: string;
  screen: string;
  opener: (page: Page) => ReturnType<Page['getByRole']>;
}[] = [
  {
    name: 'Neuer Stapel',
    screen: 'Stapel',
    opener: (p) => p.getByRole('button', { name: '+ Stapel' }),
  },
  {
    name: 'Rechtsgebiete verwalten',
    screen: 'Stapel',
    opener: (p) => p.getByRole('button', { name: 'Rechtsgebiete verwalten' }),
  },
  {
    name: 'Karte löschen',
    screen: 'Karte bearbeiten',
    opener: (p) => p.getByRole('button', { name: 'Karte löschen' }),
  },
  {
    name: 'Neue Frist',
    screen: 'Fristen',
    opener: (p) => p.getByRole('button', { name: '+ Frist hinzufügen' }),
  },
  {
    name: 'Frist bearbeiten',
    screen: 'Fristen',
    opener: (p) => p.getByRole('button', { name: /^Klausur/ }),
  },
  {
    name: 'Tagesziele',
    screen: 'Erfolge',
    opener: (p) => p.getByRole('button', { name: 'Tagesziele' }),
  },
  {
    name: 'So geht’s',
    screen: 'Teilen',
    opener: (p) => p.getByRole('button', { name: 'So geht’s' }),
  },
  {
    name: 'Deine Leute',
    screen: 'High fives',
    opener: (p) => p.getByRole('button', { name: 'Alle anzeigen' }),
  },
  {
    name: 'Backup erstellen',
    screen: 'Einstellungen',
    opener: (p) => p.getByRole('button', { name: 'Backup erstellen' }),
  },
];

test.describe.configure({ mode: 'serial' });

test('axe: alle Bildschirme ohne Verstöße (WCAG 2.2 AA)', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const watch = watchPage(page, 'http://127.0.0.1:4173', { allow404: true });
  await startDemo(page);
  const found: string[] = [];
  for (const screen of SCREENS) {
    await screen.open(page);
    await closeCelebrations(page);
    found.push(...(await violations(page, `${testInfo.project.name} · ${screen.name}`)));
  }
  expect(found).toEqual([]);
  expect(watch.errors).toEqual([]);
});

test('Touch-Ziele: mindestens 44 px auf allen Bildschirmen', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await startDemo(page);
  const found: string[] = [];
  for (const screen of SCREENS) {
    await screen.open(page);
    await closeCelebrations(page);
    for (const item of await smallTargets(page)) {
      found.push(`${testInfo.project.name} · ${screen.name} | ${item}`);
    }
  }
  expect(found).toEqual([]);
});

test('Sheets: axe, Fokus hinein, Fokus bleibt im Sheet, Escape gibt den Fokus zurück, Touch-Ziele', async ({
  page,
}, testInfo) => {
  test.setTimeout(420_000);
  await startDemo(page);
  const found: string[] = [];
  for (const sheet of SHEETS) {
    const label = `${testInfo.project.name} · Sheet ${sheet.name}`;
    const screen = SCREENS.find((s) => s.name === sheet.screen);
    if (!screen) throw new Error(`Unbekannter Bildschirm ${sheet.screen}`);
    await screen.open(page);
    await closeCelebrations(page);
    const opener = sheet.opener(page);
    await opener.focus();
    await opener.click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog, label).toHaveCount(1);
    await page.waitForTimeout(200);

    found.push(...(await violations(page, label)));
    for (const item of await smallTargets(page, 'dialog[open]')) found.push(`${label} | ${item}`);

    // Der Fokus liegt im Sheet. Beim Durchtabben erreicht er nie etwas hinter dem Sheet: Ein nativer
    // modaler <dialog> lässt Tab am Ende in die Browser-Oberfläche (dann ist `body` aktiv) und von
    // dort zurück ins Sheet laufen; ein Element der Seite dahinter ist dagegen ein Fehler.
    const inside = () => dialog.evaluate((d) => d.contains(document.activeElement));
    const behind = () =>
      dialog.evaluate(
        (d) =>
          document.activeElement !== null &&
          document.activeElement !== document.body &&
          !d.contains(document.activeElement),
      );
    if (!(await inside())) found.push(`${label} | Fokus liegt nach dem Öffnen nicht im Sheet`);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      if (await behind()) {
        found.push(
          `${label} | Fokus erreicht die Seite hinter dem Sheet (Schritt ${String(i + 1)})`,
        );
        break;
      }
    }

    // Escape schließt, der Fokus kehrt zum Öffnen-Knopf zurück.
    await page.keyboard.press('Escape');
    await expect(dialog, label).toHaveCount(0);
    const back = await opener.evaluate((el) => el === document.activeElement);
    if (!back) found.push(`${label} | Fokus kehrt nach Escape nicht zum Knopf zurück`);
  }
  expect(found).toEqual([]);
});

test('Menü: Einträge mit Namen, axe, Escape schließt und gibt den Fokus zurück', async ({
  page,
}, testInfo) => {
  await startDemo(page);
  await page.goto('/Juri/test/stapel/demo-deliktsrecht');
  const button = page.getByRole('button', { name: 'Stapel-Menü' }).first();
  await button.click();
  const menu = page.getByRole('menu', { name: 'Stapel-Menü' }).first();
  await expect(menu.getByRole('menuitem', { name: 'Stapel bearbeiten' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Stapel löschen' })).toBeVisible();
  // Nur das Menü: Es überdeckt Elemente darunter, deren verdeckte Fläche axe sonst bemängelt.
  expect(await violations(page, `${testInfo.project.name} · Menü`, '[role="menu"]')).toEqual([]);
  expect(await smallTargets(page, '[role="menu"]')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  expect(await button.evaluate((el) => el === document.activeElement)).toBe(true);
});

/*
 * Zustände, die im Alltag schwer zu erreichen sind (Feier, Fertig, Fehler, Editoren, Sheets), über
 * die Vorschauseiten der Testinstanz (`/styleguide/...`, dieselben Bildschirme mit Beispieldaten).
 * Die Listen entsprechen den Varianten in `src/app/router.tsx`.
 */
const PREVIEWS: string[] = [
  'heute',
  'heute-erledigt',
  'lernrhythmus',
  'erstellen',
  ...['liste', 'detail', 'ipad'].map((v) => `stapel/${v}`),
  ...['frage', 'luecke'].map((v) => `lernen/${v}`),
  ...[
    'lernen',
    'inhalt',
    'editor',
    'punkt',
    'verknuepfen',
    'verknuepfen-leer',
    'neue-karte',
    'editor-leer',
    'loeschen',
  ].map((v) => `schema/${v}`),
  ...[
    'lernen',
    'antwort',
    'leer',
    'quelle',
    'fehler',
    'verkleinern',
    'bild',
    'editor',
    'editor-leer',
    'pdf',
    'ipad',
    'ipad-abdecken',
  ].map((v) => `abdeckung/${v}`),
  ...['liste', 'leer', 'endspurt', 'neu', 'bearbeiten', 'fehler', 'umfang', 'loeschen'].map(
    (v) => `fristen/${v}`,
  ),
  ...['liste', 'leer', 'ziele', 'fehler', 'meilenstein', 'fertig'].map((v) => `erfolge/${v}`),
  ...['bereit', 'import', 'stapel', 'konflikt', 'fehler', 'leer', 'erfolg', 'anleitung'].map(
    (v) => `teilen/${v}`,
  ),
  ...[
    'liste',
    'ipad',
    'leer',
    'gegeben',
    'einfach',
    'feier',
    'karte',
    'kontakte',
    'kontakt',
    'gruss',
    'fehler',
  ].map((v) => `high-fives/${v}`),
];

test('Vorschauen: axe und Touch-Ziele in Feier, Fertig, Fehler, Editoren und Sheets', async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const found: string[] = [];
  for (const path of PREVIEWS) {
    await page.goto(`/Juri/test/styleguide/${path}`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.querySelectorAll('#root *').length > 10);
    await page.waitForTimeout(150);
    const label = `${testInfo.project.name} · ${path}`;
    found.push(...(await violations(page, label, undefined, true)));
    for (const item of await smallTargets(page)) found.push(`${label} | ${item}`);
  }
  expect(found).toEqual([]);
});

test('Willkommen: axe und Touch-Ziele', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/Juri/test/');
  await expect(page.getByLabel('Wie heißt du?')).toBeVisible();
  const label = `${testInfo.project.name} · Willkommen`;
  expect(await violations(page, label)).toEqual([]);
  expect(await smallTargets(page)).toEqual([]);
});

test.describe('Install-Hinweis im Safari-Tab (A13)', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  });

  test('axe und Touch-Ziele, Schritte als nummerierte Liste', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/Juri/test/');
    await expect(page).toHaveURL(/\/installieren$/);
    await expect(
      page.getByRole('heading', { name: 'Erst installieren, dann lernen.', level: 1 }),
    ).toBeVisible();
    // Drei Schritte als Liste: VoiceOver sagt „Liste, 3 Einträge“.
    await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(3);
    const label = `${testInfo.project.name} · Installieren`;
    expect(await violations(page, label)).toEqual([]);
    expect(await smallTargets(page)).toEqual([]);
  });
});

/**
 * Hat das fokussierte Element eine sichtbare Fokusanzeige (WCAG 2.4.7)? Eigener Rahmen
 * (`outline`) oder ein Elternelement mit `:focus-within` und Rahmen oder Schatten (Felder in Labels).
 */
async function focusIndicatorVisible(page: Page): Promise<{ ok: boolean; what: string }> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { ok: true, what: '' };
    const shows = (e: Element) => {
      const s = getComputedStyle(e);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const shadow = s.boxShadow !== 'none';
      return { outline, shadow };
    };
    const own = shows(el);
    if (own.outline) return { ok: true, what: '' };
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (!p.matches(':focus-within')) break;
      const s = shows(p);
      if (s.outline || s.shadow) return { ok: true, what: '' };
    }
    if (own.shadow) return { ok: true, what: '' };
    const label = el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 30);
    return { ok: false, what: `${el.tagName.toLowerCase()} "${label}"` };
  });
}

test('Tastatur: jedes anfokussierte Element zeigt eine sichtbare Fokusanzeige', async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  await startDemo(page);
  const found: string[] = [];
  for (const screen of SCREENS) {
    await screen.open(page);
    await closeCelebrations(page);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const result = await focusIndicatorVisible(page);
      if (!result.ok) found.push(`${testInfo.project.name} · ${screen.name} | ${result.what}`);
    }
  }
  expect([...new Set(found)]).toEqual([]);
});
