// Nach dem Build: 404.html für GitHub Pages erzeugen und die Ausgabe prüfen.
// GitHub Pages liefert für unbekannte Pfade /Juri/404.html; das Skript darin leitet
// Deep Links auf die richtige Instanz um (siehe src/app/deepLink.ts).
import { existsSync, writeFileSync } from 'node:fs';
import { notFoundRedirectScript } from '../src/app/deepLink.ts';
import { instanceById } from '../src/app/instance.ts';

const app = instanceById('app');
const test = instanceById('test');

for (const dir of [app.outDir, test.outDir]) {
  for (const file of ['index.html', 'manifest.webmanifest', 'sw.js']) {
    if (!existsSync(`${dir}/${file}`)) {
      console.error(`Build unvollständig: ${dir}/${file} fehlt.`);
      process.exit(1);
    }
  }
}

const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Juri</title>
    <script>
${notFoundRedirectScript(app.base, test.base)}
    </script>
  </head>
  <body>
    <p>Juri wird geladen …</p>
  </body>
</html>
`;

writeFileSync(`${app.outDir}/404.html`, html);
writeFileSync(`${app.outDir}/.nojekyll`, '');
console.log('postbuild: 404.html und .nojekyll geschrieben.');
