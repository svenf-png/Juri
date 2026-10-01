# Entwurf M13: Desktop-Artboards

Stand: 01.10.2026 · Status: zur Freigabe (Entscheidung 2: erst die Artboards, danach die Umsetzung)

Alle Boards entstehen aus `scripts/build-desktop-designs.mjs` (`npm run design:desktop`), nie von Hand. Die Werte stammen aus `src/ui/tokens/tokens.ts` und den vorhandenen Designs, nichts ist gerundet. Jedes Board gibt es bei 1440 × 900 und bei 1920 × 1080; ab 1440 px Breite steht der Inhalt mittig (Deckel 1440 px, Sidebar 240 px). Die Bilder erzeugt `node scripts/render-desktop-boards.mjs <Ordner>`. Architektur und Begründung: [ADR-017](adr/017-desktop-gestaltung.md), Annahmen A95 bis A97 in der [Architektur](ARCHITEKTUR.md).

## Bitte prüfen

Diese Punkte sind neu gegenüber den bisherigen Designs und brauchen deine Freigabe:

1. **Lernen:** Seitenfeld mit Stand der Runde je Stufe und Kürzeln, Zifferntasten an den Bewertungsknöpfen.
2. **Erstellen:** Alle Felder sichtbar (kein „Einfach/Mehr“ am Rechner) und eine Vorschau der Karte.
3. **Schema-Editor:** „Punkt bearbeiten“ als feste Spalte statt Sheet.
4. **Stapel:** Tabelle statt Kachelraster.
5. **Sidebar:** Eintrag „Suchen“ mit „/“, „Neue Karte“ mit „N“.
6. **Dialog:** Sheets als Fenster in der Mitte.
7. **Willkommen:** geteilte Fläche.
8. **Zustände:** Hover und Fokus wie im Artboard `DesktopZustaende`.

Offen aus der Abstimmung: Ein iPad Pro 13 Zoll quer (Viewport 1376 px laut Sekundärquellen) bekäme die Desktop-Gestaltung, weil der Umbruch nur an der Breite hängt (A95).

## Die Boards

### Heute

Zwei Reihen statt der gestreckten iPad-Aufteilung: oben Tagesziel und „Lernen starten“ links, Fristen und High five rechts; unten die Rechtsgebiete als Kacheln und die letzten 7 Tage. Sidebar mit „Suchen“ (/) und „Neue Karte“ (N).

![Heute, 1440 × 900](bilder/entwurf-m13/DesktopHeute.png)

<details><summary>Heute bei 1920 × 1080</summary>

![Heute, 1920 × 1080](bilder/entwurf-m13/DesktopHeute1920.png)

</details>

### Stapel

Liste links, rechts die Karten als Tabelle (Typ, Karte, Norm, Fällig). Die Detailspalte wird auf 1100 px gedeckelt.

![Stapel, 1440 × 900](bilder/entwurf-m13/DesktopStapel.png)

<details><summary>Stapel bei 1920 × 1080</summary>

![Stapel, 1920 × 1080](bilder/entwurf-m13/DesktopStapel1920.png)

</details>

### Lernen, Vorderseite

Karte 720 px, daneben das Seitenfeld (Stand der Runde je Stufe, Kürzel, Zurücknehmen). „Antwort zeigen“ trägt die Leertaste.

![Lernen, Vorderseite, 1440 × 900](bilder/entwurf-m13/DesktopLernenFrage.png)

<details><summary>Lernen, Vorderseite bei 1920 × 1080</summary>

![Lernen, Vorderseite, 1920 × 1080](bilder/entwurf-m13/DesktopLernenFrage1920.png)

</details>

### Lernen, Bewertung

Vier Bewertungen mit den Zifferntasten 1 bis 4 und den Abständen. Die Notiz steht unter der Antwort.

![Lernen, Bewertung, 1440 × 900](bilder/entwurf-m13/DesktopLernenAntwort.png)

<details><summary>Lernen, Bewertung bei 1920 × 1080</summary>

![Lernen, Bewertung, 1920 × 1080](bilder/entwurf-m13/DesktopLernenAntwort1920.png)

</details>

### Lernen, Schema

Punkt für Punkt aufdecken; „Nächster Punkt“ trägt die Leertaste.

![Lernen, Schema, 1440 × 900](bilder/entwurf-m13/DesktopLernenSchema.png)

<details><summary>Lernen, Schema bei 1920 × 1080</summary>

![Lernen, Schema, 1920 × 1080](bilder/entwurf-m13/DesktopLernenSchema1920.png)

</details>

### Lernen, Abdeckung

Gefragtes Feld pulsiert, „Feld 2 aufdecken“.

![Lernen, Abdeckung, 1440 × 900](bilder/entwurf-m13/DesktopLernenAbdeckung.png)

<details><summary>Lernen, Abdeckung bei 1920 × 1080</summary>

![Lernen, Abdeckung, 1920 × 1080](bilder/entwurf-m13/DesktopLernenAbdeckung1920.png)

</details>

### Geschafft

Bilanz in einer Zeile, „Zurück zu Heute“ und die Karten mit offenem Lernschritt.

![Geschafft, 1440 × 900](bilder/entwurf-m13/DesktopFertig.png)

<details><summary>Geschafft bei 1920 × 1080</summary>

![Geschafft, 1920 × 1080](bilder/entwurf-m13/DesktopFertig1920.png)

</details>

### Erstellen

Formular links mit allen Feldern (kein „Einfach/Mehr“ am Rechner), rechts die Vorschau der Karte mit Umschalter Vorderseite und Rückseite. Fußleiste mit Fortschritt, „Speichern“ und „Speichern & nächste“ (Strg+Eingabe).

![Erstellen, 1440 × 900](bilder/entwurf-m13/DesktopErstellen.png)

<details><summary>Erstellen bei 1920 × 1080</summary>

![Erstellen, 1920 × 1080](bilder/entwurf-m13/DesktopErstellen1920.png)

</details>

### Erstellen mit PDF

PDF-Fläche links (breiter als auf dem iPad), Formular rechts. Zoom mit +, − und 0, Blättern mit den Pfeilen.

![Erstellen mit PDF, 1440 × 900](bilder/entwurf-m13/DesktopErstellenPdf.png)

<details><summary>Erstellen mit PDF bei 1920 × 1080</summary>

![Erstellen mit PDF, 1920 × 1080](bilder/entwurf-m13/DesktopErstellenPdf1920.png)

</details>

### Felder aufziehen

Bildfläche links, rechts die Liste der Felder, „Feld in der Mitte anlegen“, „Feld löschen“ (Entf) und die Kürzel.

![Felder aufziehen, 1440 × 900](bilder/entwurf-m13/DesktopAbdeckungEditor.png)

<details><summary>Felder aufziehen bei 1920 × 1080</summary>

![Felder aufziehen, 1920 × 1080](bilder/entwurf-m13/DesktopAbdeckungEditor1920.png)

</details>

### Schema-Editor

Gliederung links, rechts „Punkt bearbeiten“ als feste Spalte (statt Sheet) mit Text, Norm, Inhalt und der Suche nach Karten zum Verknüpfen.

![Schema-Editor, 1440 × 900](bilder/entwurf-m13/DesktopSchemaEditor.png)

<details><summary>Schema-Editor bei 1920 × 1080</summary>

![Schema-Editor, 1920 × 1080](bilder/entwurf-m13/DesktopSchemaEditor1920.png)

</details>

### Erfolge

Kacheln, Heatmap über 26 Wochen in voller Breite, Meilensteine in einer Reihe; High fives als Knopf oben rechts.

![Erfolge, 1440 × 900](bilder/entwurf-m13/DesktopErfolge.png)

<details><summary>Erfolge bei 1920 × 1080</summary>

![Erfolge, 1920 × 1080](bilder/entwurf-m13/DesktopErfolge1920.png)

</details>

### Fristen

Kopf mit „Als Kalenderdatei sichern“ und „Frist hinzufügen“ (F), die nächste Frist über die ganze Breite, die übrigen in zwei Spalten.

![Fristen, 1440 × 900](bilder/entwurf-m13/DesktopFristen.png)

<details><summary>Fristen bei 1920 × 1080</summary>

![Fristen, 1920 × 1080](bilder/entwurf-m13/DesktopFristen1920.png)

</details>

### Teilen

Zwei Spalten: Datei weitergeben („Herunterladen“, E) links, Empfangen („Datei öffnen“, I) rechts, darunter das Backup.

![Teilen, 1440 × 900](bilder/entwurf-m13/DesktopTeilen.png)

<details><summary>Teilen bei 1920 × 1080</summary>

![Teilen, 1920 × 1080](bilder/entwurf-m13/DesktopTeilen1920.png)

</details>

### High fives

Drei Spalten: Neu von deinen Leuten, Bekommen, Deine Leute (die Kontaktliste ist fest sichtbar). Kürzel H, K und O.

![High fives, 1440 × 900](bilder/entwurf-m13/DesktopHighFive.png)

<details><summary>High fives bei 1920 × 1080</summary>

![High fives, 1920 × 1080](bilder/entwurf-m13/DesktopHighFive1920.png)

</details>

### Einstellungen

Zwei Spalten: Profil, Lernen und Speicher links, Backup und Entwicklungsstand rechts.

![Einstellungen, 1440 × 900](bilder/entwurf-m13/DesktopEinstellungen.png)

<details><summary>Einstellungen bei 1920 × 1080</summary>

![Einstellungen, 1920 × 1080](bilder/entwurf-m13/DesktopEinstellungen1920.png)

</details>

### Lernrhythmus

Zwei Spalten: Algorithmus, Voreinstellung, Regler und Beispiel links, die Zeilen rechts.

![Lernrhythmus, 1440 × 900](bilder/entwurf-m13/DesktopLernrhythmus.png)

<details><summary>Lernrhythmus bei 1920 × 1080</summary>

![Lernrhythmus, 1920 × 1080](bilder/entwurf-m13/DesktopLernrhythmus1920.png)

</details>

### Dialog

Sheets stehen am Rechner als Fenster in der Mitte (560 px) statt unten am Rand; hier „Neue Frist“ über Fristen.

![Dialog, 1440 × 900](bilder/entwurf-m13/DesktopDialog.png)

<details><summary>Dialog bei 1920 × 1080</summary>

![Dialog, 1920 × 1080](bilder/entwurf-m13/DesktopDialog1920.png)

</details>

### Willkommen

Violette Fläche links mit dem Zeichen, Formular rechts.

![Willkommen, 1440 × 900](bilder/entwurf-m13/DesktopWillkommen.png)

<details><summary>Willkommen bei 1920 × 1080</summary>

![Willkommen, 1920 × 1080](bilder/entwurf-m13/DesktopWillkommen1920.png)

</details>

### Zustände

Ruhe, Hover und Tastaturfokus der Bausteine, aus den vorhandenen Farben abgeleitet. Nur in 1440 × 900.

![Zustände, 1440 × 900](bilder/entwurf-m13/DesktopZustaende.png)
