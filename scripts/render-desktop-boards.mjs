/*
 * Rendert die Desktop-Artboards (design/Desktop*.dc.html) als PNG, zur Durchsicht im Pull Request
 * und für die Doku. Aufruf: node scripts/render-desktop-boards.mjs <Ausgabeordner> [Name ...]
 *
 * Die Boards sind statisches HTML (kein Design-Tool nötig). Schriften kommen wie im Bildvergleich
 * (tests/e2e/design.ts) aus den Dateien der App. Chromium: PW_CHROMIUM_PATH, sonst Playwright.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [out, ...only] = process.argv.slice(2);
if (!out)
  throw new Error('Aufruf: node scripts/render-desktop-boards.mjs <Ausgabeordner> [Name ...]');
mkdirSync(out, { recursive: true });

const fontFaces = readFileSync('src/ui/tokens/fonts.css', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replaceAll("'Bricolage Grotesque Variable'", "'Bricolage Grotesque'")
  .replaceAll("'Figtree Variable'", "'Figtree'")
  .replace(/url\('(@fontsource-variable\/[^']+)'\)/g, (_, path) => {
    const data = readFileSync(`node_modules/${path}`).toString('base64');
    return `url(data:font/woff2;base64,${data})`;
  });

const canvas = JSON.parse(readFileSync('design/canvas.json', 'utf8'));
const files = readdirSync('design')
  .filter((f) => /^Desktop.*\.dc\.html$/.test(f))
  .filter((f) => only.length === 0 || only.includes(f.replace('.dc.html', '')));

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--disable-lcd-text'],
});
for (const file of files) {
  const html = readFileSync(`design/${file}`, 'utf8');
  const style = /<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>[\s\S]*?<\/helmet>/.exec(html)?.[1];
  const body = /<x-dc>[\s\S]*?<\/helmet>([\s\S]*?)<\/x-dc>/.exec(html)?.[1];
  if (style === undefined || body === undefined) throw new Error(`Unbekanntes Format: ${file}`);
  const { w, h } = canvas.boards[file];
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.setContent(
    '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
      `<style>${fontFaces}</style><style>${style}</style></head><body>${body}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot();
  writeFileSync(`${out}/${file.replace('.dc.html', '.png')}`, png);
  await context.close();
}
await browser.close();
console.log(`${files.length} Bilder in ${out}`);
