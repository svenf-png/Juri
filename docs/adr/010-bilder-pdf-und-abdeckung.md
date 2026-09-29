# ADR-010: Bilder, PDF und Abdeckung

Status: angenommen · 29.09.2026 (Umsetzung in M6)

## Kontext

Karten sollen aus Fotos und PDF-Seiten entstehen: Felder auf einem Bild, die beim Lernen verdeckt sind (Abdeckung, Annahme A7), Text aus einem PDF als Frage, Antwort oder Lücke, und die Herkunft (Datei, Seite) an der Karte. Alles bleibt auf dem Gerät (ADR-002). iOS begrenzt Speicher und Zeichenflächen, ein PDF darf deshalb nie vollständig gerendert im Speicher stehen.

## Entscheidung

- **Tabelle `media` (Schema-Version 5):** `id`, `kind` (`image` oder `pdf`), `mime`, `name`, `size`, `width` und `height` (Bild) oder `pages` (PDF), `createdAt`, `data` als ArrayBuffer (ADR-002). Karten verweisen darauf über `mediaId` (Abdeckung) und `source.mediaId` (Herkunft); beide Verweise sind indiziert, damit Löschen ungenutzte Medien ohne Vollzugriff findet.
- **Kartentyp `cover`:** `mediaId` und `masks`, höchstens 30 Felder. Ein Feld ist ein Rechteck in **Bruchteilen des Bildes** (`n`, `x`, `y`, `w`, `h`, vier Nachkommastellen), damit es bei jeder Anzeigegröße und jedem Zoom exakt sitzt. Jedes Feld ist eine Abfrage mit fester Kennung `<Karten-ID>:m<n>`; `n` wird nie neu vergeben (wie bei Lücken), die Anzeigenummer 1, 2, 3 ist abgeleitet.
- **Herkunft `source`** an jeder Karte: `name`, optional `page` und `mediaId` des gespeicherten PDFs. Das PDF wird mit der ersten Karte gespeichert, weitere Karten verweisen darauf. Karte oder Stapel löschen entfernt Bild und PDF in derselben Transaktion, sobald keine Karte mehr darauf zeigt.
- **Bilder:** Prüfung an den ersten Bytes (JPEG, PNG, GIF, WebP, HEIC, AVIF; SVG wird nicht angenommen), Dekodieren mit `createImageBitmap` (richtet Fotos nach der Kameraausrichtung), Verkleinern auf höchstens 2000 px Kante, Kodieren als JPEG (Qualität 0,85) auf weißem Grund. Grenzen (vorsichtige Annahmen, Gerätetest): Datei bis 40 MB, bis 120 Millionen Bildpunkte.
- **PDF:** pdf.js 5.7.284, **Legacy-Build**, erst beim ersten Öffnen geladen; der Worker kommt vom eigenen Origin (CSP unverändert), WebAssembly ist aus. Grenzen: Datei bis 50 MB, bis 1000 Seiten. Passwortgeschützte oder beschädigte Dateien bekommen eine eigene Meldung.
- **Speicher vor dem Speichern:** `navigator.storage.estimate()` muss Platz für die doppelte Größe plus 5 MB melden (Kopien beim Speichern und Sichern), sonst „Speicher voll“.
- **PDF-Ansicht:** Es ist nur die angezeigte Seite gezeichnet; die Zeichenfläche wird beim Blättern freigegeben und bleibt unter 12 Millionen Bildpunkten (Annahme; die Pixeldichte sinkt, die Seite bleibt gleich groß). Beim Zoomen rendert die Ansicht nach 250 ms Ruhe in Stufen (2, 3, 4, 6) schärfer nach. Über der Seite liegt eine unsichtbare Textebene; die Markierung wird bereinigt (Trennstriche, Zeilenumbrüche) und als Frage, Antwort oder Lücke übernommen.
- **Abdecken auf einer PDF-Seite:** Die Seite wird als JPEG (höchstens 2000 px Kante) festgehalten und ist das Bild der Karte; die Felder liegen darauf. Die Karte braucht pdf.js beim Lernen nicht.
- **Lernen:** Jedes Feld ist eine eigene Station (nie gebündelt). Alle Felder sind verdeckt, das gefragte pulsiert, Antippen oder „Feld N aufdecken“ deckt es auf; die übrigen bleiben verdeckt. Zwei Finger zoomen, ein Finger verschiebt das gezoomte Bild.
- **Backup:** `media` gehört zu den Tabellen; die Integritätsprüfung verlangt, dass jedes Bild und jedes PDF, auf das eine Karte zeigt, vorhanden ist und die richtige Art hat.

## Konsequenzen

- Ein Bild oder PDF belegt Speicher, bis die letzte Karte darauf gelöscht ist. Ein verwaistes Medium (Abbruch nach dem Wählen) entsteht nicht, weil erst mit der Karte gespeichert wird.
- Backups mit vielen PDFs werden groß; die Entpack-Grenze von 1 GB (ADR-006) bleibt, der Gerätetest prüft sie mit dem Demo-Skript.
- Nicht eingebettete Schriften und Zeichensätze (CMaps) liefert Juri nicht mit: Solche PDFs zeigen die Systemschrift, Text in CJK-Schriften kann fehlen. Für deutsche Skripte mit eingebetteten Schriften ist das unkritisch.
- Ob die Grenzen (Zeichenfläche, Dateigrößen, Speicher) auf dem iPad tragen, klärt der Gerätetest (`docs/geraete-testliste.md`); die Zahlen stehen als Konstanten in `src/domain/media/media.ts` und lassen sich dort anpassen.
- pdf.js steht unter Apache-2.0; der Lizenztext liegt in `public/licenses/`.
