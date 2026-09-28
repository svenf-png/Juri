// Rendert die App-Icons aus dem Design (design/AppIcon.dc.html) als PNG nach public/icons/.
// Aufruf: npm run icons   (braucht Chromium; PW_CHROMIUM_PATH zeigt ggf. auf ein installiertes)
//
// - <prefix>-180.png   apple-touch-icon, randlos (iOS rundet selbst ab)
// - <prefix>-32.png    Favicon, abgerundet
// - <prefix>-192/512   Manifest „any“, abgerundet wie im Design (Radius 45 von 200)
// - <prefix>-maskable-512  randlos, Motiv auf 78 % verkleinert (sichere Zone)
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const font = readFileSync(
  'node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2',
).toString('base64');

const variants = {
  app: { bg: '#6A3FE0', back: '#9A7BEF' },
  test: { bg: '#17141F', back: '#6A3FE0' },
};

function html({ bg, back }, { size, rounded, motif }) {
  const k = size / 200;
  return `<!doctype html><html><head><style>
@font-face { font-family: B; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 800; }
html, body { margin: 0; background: transparent; }
#icon { position: relative; width: ${size}px; height: ${size}px; overflow: hidden;
  border-radius: ${rounded ? 45 * k : 0}px; background: ${bg}; }
#m { position: absolute; left: 0; top: 0; width: 200px; height: 200px; transform-origin: 0 0;
  transform: scale(${k}) translate(${(1 - motif) * 100}px, ${(1 - motif) * 100}px) scale(${motif}); }
.back { position: absolute; left: 52px; top: 40px; width: 110px; height: 130px; border-radius: 18px;
  background: ${back}; transform: rotate(8deg); }
.front { position: absolute; left: 40px; top: 36px; width: 110px; height: 130px; border-radius: 18px;
  background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.j { font-family: B; font-size: 96px; font-weight: 800; color: #17141F; letter-spacing: -0.04em;
  line-height: 1; margin-top: -6px; }
</style></head><body><div id="icon"><div id="m"><div class="back"></div><div class="front"><span class="j">J</span></div></div></div></body></html>`;
}

const outputs = [
  { name: '180', size: 180, rounded: false, motif: 1 },
  { name: '32', size: 32, rounded: true, motif: 1 },
  { name: '192', size: 192, rounded: true, motif: 1 },
  { name: '512', size: 512, rounded: true, motif: 1 },
  { name: 'maskable-512', size: 512, rounded: false, motif: 0.78 },
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [prefix, colors] of Object.entries(variants)) {
  for (const out of outputs) {
    await page.setViewportSize({ width: out.size, height: out.size });
    await page.setContent(html(colors, out));
    await page.evaluate(() => document.fonts.ready);
    const path = `public/icons/${prefix}-${out.name}.png`;
    await page.locator('#icon').screenshot({ path, omitBackground: true });
    console.log(`geschrieben: ${path}`);
  }
}
await browser.close();
