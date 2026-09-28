# Bilder für Doku und Folien

Hier liegen die Screenshots, auf die `docs/folien/*.md` verweisen.

- `npm run docs:bilder` erzeugt sie mit Playwright aus der gebauten App (vorher `npm run build`), mit den festen Beispieldaten der Designs, auf den Viewports iPhone 14 (390 × 844) und iPad Air 11 Zoll quer (1180 × 820). In der Cloud-Umgebung mit `PW_CHROMIUM_ONLY=1` und `PW_CHROMIUM_PATH` wie in `CLAUDE.md`.
- Dabei läuft derselbe Pixelvergleich wie in den E2E-Tests: Ein Bild wird nur geschrieben, wenn es zum Design passt.
- Dateinamen folgen dem Muster `<screen>-<geraet>.png`, z. B. `heute-iphone.png`, `heute-ipad.png`.
- Stand M4: `heute-iphone.png`, `heute-ipad.png`, `heute-erledigt-iphone.png`, `stapel-iphone.png`, `stapel-detail-iphone.png`, `stapel-ipad.png`, `erstellen-iphone.png`, `lernen-frage-iphone.png`, `lernen-luecke-iphone.png`, `lernrhythmus-iphone.png`. Fehlende Bilder zeigen die Folien als beschrifteten Platzhalter.
