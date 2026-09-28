# Bilder für Doku und Folien

Hier liegen die Screenshots, auf die `docs/folien/*.md` verweisen.

- Ab M2 erzeugt ein Skript (`npm run docs:bilder`) die Screenshots automatisch mit Playwright aus der laufenden App, mit festen Beispieldaten, auf den Viewports iPhone (390 × 844) und iPad (1180 × 820). So bleiben die Bilder bei jedem Meilenstein aktuell.
- Dateinamen folgen dem Muster `<screen>-<geraet>.png`, z. B. `lernen-iphone.png`, `heute-ipad.png`.
- Bis zum ersten Lauf fehlen die Dateien; Folien zeigen dann einen beschrifteten Platzhalter.
