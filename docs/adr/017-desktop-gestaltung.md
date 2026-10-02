# ADR-017: Eigene Desktop-Gestaltung

Status: angenommen, umgesetzt in M13 (Version 1.1.0) · 01.10.2026 (Entscheidungen 2 und 12; schreibt A8 und A51 fort, ADR-011 bleibt gültig)

## Kontext

Seit M7 läuft Juri im Desktop-Browser, aber ohne eigene Gestaltung: Unter 768 px gilt das iPhone-Layout, von 768 bis 1099 px die Sidebar mit einspaltigem Inhalt, ab 1100 px die iPad-Designs (A8). Bei 1440 × 900 sind das die iPad-Designs, nur in die Breite gezogen; Lernen, Erstellen, Fristen, Teilen und Einstellungen stehen als schmale Handy-Spalte mitten im Fenster (A54). M13 entwirft nach Entscheidung 2 die fehlenden Desktop-Artboards strikt aus dem vorhandenen System und baut sie danach pixelnah. Sven hat die Artboards am 01.10.2026 freigegeben („Sieht gut aus“), alle sieben Punkte der früheren Liste „Offen zur Freigabe“ gelten damit.

## Entscheidung (am 01.10.2026 mit Sven abgestimmt)

- **Umbruch:** Die Desktop-Gestaltung gilt ab **1280 px Fensterbreite**, erkannt nur an der Breite. Darunter bleibt A8 unverändert (iPad Air 11 quer mit 1180 px bleibt auf den iPad-Designs, iPhone und iPad hoch ebenfalls). Folge: Ein iPad Pro 13 Zoll quer bekäme die Desktop-Gestaltung (Viewport 1376 px laut Sekundärquellen, nicht aus der Primärquelle geprüft); der Gerätetest klärt, ob das stört.
- **Breite:** Neben der Sidebar (240 px, wie iPadHeute.dc.html) wächst der Inhalt bis **1440 px** einschließlich Innenabstand (48 px seitlich, 40 px oben und unten) und steht darüber mittig. Ab 1920 px Fensterbreite sind das 120 px Rand auf jeder Seite. Der Stapel-Bereich deckelt die Detailspalte auf 1100 px (Liste 340 px plus Detail ergibt 1440 px).
- **Referenzgrößen:** Boards bei **1440 × 900** (Plan) und **1920 × 1080**; ohne Pixelvergleich, aber mit Prüfung auf Überlauf, Abschneiden und axe zusätzlich bei 1280 × 720.
- **Vollbild-Abläufe** (Lernen, Erstellen, Schema-Editor, Felder aufziehen) bleiben ohne Sidebar und bekommen eine Kopfzeile in drei Teilen (links, Titel, rechts), zwei Spalten und, wo gespeichert wird, eine Fußleiste.
- **Aufteilung je Bildschirm:**

| Bildschirm       | Desktop-Aufteilung                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Heute            | Zwei Reihen: oben Tagesziel und „Lernen starten“ links, Fristen und High five rechts; unten Rechtsgebiete als Kacheln und die 7 Tage |
| Lernen           | Karte (720 px) mit Seitenfeld (320 px): Stand der Runde je Stufe, Kürzel, „Zurücknehmen“; Bewertung mit Zifferntasten                |
| Erstellen        | Formular links, Vorschau der Karte rechts; Norm, Stapel, Tags und Notiz stehen ohne „Mehr“ sichtbar; Fußleiste mit Speichern         |
| PDF und Karte    | PDF-Fläche links (größer), Formular rechts, wie die iPad-Aufteilung auf mehr Breite                                                  |
| Felder aufziehen | Bildfläche links, rechts die Liste der Felder, Aktionen und Kürzel (statt der Leiste unten)                                          |
| Schema-Editor    | Gliederung links, Punkt bearbeiten rechts als feste Spalte (statt Sheet), die Suche nach Karten als Liste in dieser Spalte           |
| Stapel           | Liste (340 px) und Detail; die Karten als Tabelle (Typ, Karte, Norm, Fällig) statt Kachelraster                                      |
| Erfolge          | Kacheln, Heatmap über 26 Wochen in voller Breite, Meilensteine in einer Reihe                                                        |
| Fristen          | Kopf mit „Als Kalenderdatei sichern“ und „Frist hinzufügen“, Karten im Raster mit zwei Spalten                                       |
| Teilen           | Zwei Spalten: Datei weitergeben links, Empfangen rechts                                                                              |
| High fives       | Drei Spalten: Neu von deinen Leuten, Bekommen, Deine Leute (Kontaktliste fest sichtbar)                                              |
| Einstellungen    | Zwei Spalten: Profil, Lernen, Speicher links; Backup und Entwicklungsstand rechts                                                    |
| Lernrhythmus     | Zwei Spalten: Algorithmus, Voreinstellung und Regler links; die Zeilen (Neue Karten, Fristen und so weiter) rechts                   |
| Dialog           | Sheets stehen am Rechner als Fenster in der Mitte (560 px, Radius 30) statt unten am Rand                                            |
| Willkommen       | Fläche in Violett links, Formular rechts                                                                                             |

- **Zustände:** Zwei Zustände mehr als auf dem Handy, aus den vorhandenen Farben abgeleitet (Artboard `DesktopZustaende`): Hover (Zeile `#F6F4FB`, Navigation `#F3F1F8`, Fläche `#F1EEF7`, Primär `#5B34D1`, Tinte `#2E1A73`, Rand des Umrisses `#A08BEA`) und sichtbarer Fokus (Ring 2 px Violett mit 2 px Abstand wie bisher). Gedrückt bleibt die Skalierung auf 97 %.
- **Tasten:** Die Kürzel aus A53 bleiben unverändert, es kommt keines dazu. Neu sind nur Hinweise an den Stellen, wo sie gelten (Chip mit der Taste): „/“ und „N“ in der Sidebar, Leertaste, 1 bis 4, Pfeile, Strg+Z und Esc im Lernen, Strg+Eingabe beim Speichern, F in Fristen, E und I in Teilen, H, K und O bei High fives, Entf, Tab und die Pfeile bei den Feldern. Die Desktop-Texte aus A52 gelten in den Boards.
- **Sidebar:** Neu ist der Eintrag „Suchen“ mit „/“ (gleiche Aktion wie die Taste), „Neue Karte“ trägt „N“.
- **Umsetzung (nach Freigabe):** Die Desktop-Layouts liegen hinter `(min-width: 1280px)` und ersetzen dort die iPad-Aufteilung; die Touch-Layouts und ihre Bildvergleiche bleiben unverändert (Regressionsschutz). Die Boards entstehen allein aus `scripts/build-desktop-designs.mjs` mit den Bausteinen in `scripts/desktop-designs/`, nie von Hand.

## Konsequenzen

- Mehr Boards als geplant: 19 Bildschirme in zwei Größen (39 Dateien) und der Zustände-Bogen. Der Planwert von 4 PT (Schätzung 3 bis 5) reicht für „alle Bildschirme“ und die Bildvergleiche bei zwei Größen voraussichtlich nicht; Schätzung 6 bis 7 PT, nicht gemessen. Die Summe von 37 PT bleibt als Planwert stehen, die Abweichung wird im Abschlussbericht begründet.
- Die CI braucht für die Desktop-Bildvergleiche mehr Zeit (drei Browser, zwei Größen). Die Vergleiche bei 1920 × 1080 laufen deshalb nur in Chromium und WebKit, Firefox prüft 1440 × 900 (entschieden; die E2E-Teile brauchen damit 7 bis 8 Minuten).
- Neue Elemente ohne Vorlage im bisherigen Design tragen `data-addition`, wo sie den Vergleich mit einem älteren Board stören würden; die Desktop-Boards selbst sind die Vorlage.

## Umsetzung (M13)

- **Muster:** Wo die Reihenfolge im DOM gleich bleibt, liegt die Desktop-Aufteilung als CSS hinter `@media (min-width: 1280px)` (Hüllen mit `display: contents` darunter, Spalten darüber). Wo sich die Lese- und Tab-Reihenfolge ändern würde (Neue Karte, Schema-Editor, Felder aufziehen, Willkommen), baut der Bildschirm den Desktop-Aufbau mit `useMediaQuery('(min-width: 1280px)')` getrennt, damit Vorlesegerät und Tabulator der Sichtfolge folgen. Das Handy- und das iPad-Layout behalten ihren DOM unverändert.
- **Neue Bausteine:** `Kbd` (Tastenhinweis, nur ab 1280 px sichtbar, für Vorlesegeräte verborgen; das Kürzel steht als `aria-keyshortcuts` am Element), `DesktopShell` (rahmt Vorschauen mit der Sidebar), `useSearchAction` (Suchen in der Sidebar), `modifierLabel` (Cmd auf dem Mac und am iPad, sonst Strg; am iPad gilt laut [Apple Support](https://support.apple.com/en-us/102393) bei den meisten Kürzeln die Cmd-Taste), `domain/cards/preview.ts` (Vorschau der Karte beim Erstellen) und `CardPreview`.
- **Neue Karte:** alle Felder offen (kein „Einfach/Mehr“), Vorschau mit Umschalter Vorder- und Rückseite, Fußleiste mit Tagesziel, „Speichern“ (speichert und schließt) und „Speichern & nächste“; Strg+Eingabe speichert.
- **Schema-Editor:** „Punkt bearbeiten“ als feste Spalte, die Suche nach Karten als Liste in der Spalte (`LinkSearch`, am Handy weiter das Popover); Strg+Eingabe sichert. Die Vollbild-Ansichten haben eigene Kürzel, das Formular dahinter schweigt.
- **Felder aufziehen:** Feldliste, Zoom-Knöpfe (`useZoomPan.step`, `MaskCanvas.onZoom`), Kürzel-Tabelle; Entf löscht das gewählte Feld, auch wenn der Fokus auf dem Listenknopf liegt (`useKeys` im Editor; die Maske behandelt die Taste bei eigenem Fokus selbst).
- **Breitenwechsel:** Bildschirme mit getrenntem Desktop-Aufbau (Neue Karte, Schema-Editor, Felder, Willkommen) hängen ihre Felder neu ein, wenn die Breite die 1280 px kreuzt (Fenster ziehen, iPad Pro drehen). Eingaben bleiben erhalten (der Zustand liegt im Bildschirm), Fokus und Cursor gehen verloren; im Schema-Editor schließt der Wechsel ein offenes Punkt- oder Verknüpfungsfenster der anderen Form.
- **Stapel:** Kacheln und Tabelle werden nie zugleich gerendert (`useMediaQuery`), damit ein großer Stapel das DOM nicht verdoppelt.
- **Dialog:** `Sheet` steht ab 1280 px als Fenster in der Mitte (560 px, Radius 30, Schatten, Einblenden 180 ms), ohne Griff.
- **Hover:** nur mit `(min-width: 1280px) and (hover: hover)`, Farben aus den Tokens (Zeile `surface`, Navigation `line-soft`, Fläche `heat-0`, Primär `link`, Tinte `violet-900`, Umriss `dash-cloze`).
- **Tests:** `desktop-design.spec.ts` vergleicht 19 Bildschirme in zwei Größen mit den Artboards (Chromium und WebKit beide Größen, Firefox 1440 × 900); `desktop.spec.ts` prüft Umbruch, Bedienung und 1280 × 720; axe, Touch-Ziele und Fokus laufen am Rechner wie am Handy.

## Folgen für die Messung

Die Boards wurden an die vorhandenen Maße der App angeglichen, wo ein Wert schon im Design-System stand (Zeilenhöhen, Schriftgrößen, Felder). Das Skript `scripts/build-desktop-designs.mjs` bleibt die einzige Quelle der Boards (nie von Hand ändern). Zwei Abweichungen vom Vergleich stehen mit Grund im Spec: der Dialog (halbe Pixelzeile, 1,5 %) und der Lernrhythmus (Regler des Browsers, 0,4 %); in den Einstellungen ersetzt der Test die veränderlichen Werte (Speicher, Commit, Datum).
