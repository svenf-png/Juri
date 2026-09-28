# Folien-Konvention

Die Dateien in `docs/folien/` sind normales Markdown, das auf GitHub gut lesbar ist und sich gleichzeitig ohne Nacharbeit von einer KI in eine PowerPoint-Präsentation umwandeln lässt. Jede Datei ist genau eine Präsentation.

| Datei         | Präsentation                                               | Zielgruppe                              |
| ------------- | ---------------------------------------------------------- | --------------------------------------- |
| `projekt.md`  | Juri: Idee, Design, Technik, Entscheidungen, Fahrplan      | Interessierte, Mitwirkende, Entscheider |
| `handbuch.md` | Juri benutzen: Installation, Karten, Lernen, Teilen, Daten | Referendarinnen und Referendare         |

## Regeln für die Markdown-Dateien

1. **Kopf (Front Matter)** zwischen `---` am Dateianfang: `titel`, `untertitel`, `zielgruppe`, `stand`, `version`. Daraus entsteht die Titelfolie.
2. **`# Überschrift`** (Ebene 1) = Kapiteltrennfolie. Nur der Titel, optional ein Satz darunter.
3. **`## Überschrift`** (Ebene 2) = eine Inhaltsfolie. Alles bis zur nächsten Überschrift gehört auf diese Folie.
4. **Stichpunkte:** höchstens 6 pro Folie, möglichst unter 12 Wörtern je Punkt. Keine verschachtelten Listen tiefer als eine Ebene.
5. **Tabellen:** höchstens 6 Zeilen und 4 Spalten, sonst auf zwei Folien teilen.
6. **Bilder:** `![Beschreibung](../bilder/datei.png)`. Die Beschreibung ist Alternativtext und Bildunterschrift. Screenshots entstehen automatisch aus der App (siehe `docs/bilder/README.md`).
7. **Sprechernotizen:** ein Zitatblock, der mit `**Notizen:**` beginnt. Er kommt in die Notizen der Folie, nicht auf die Folie.
8. **Layout-Hinweis (optional):** HTML-Kommentar direkt unter der Folienüberschrift, z. B. `<!-- layout: zwei-spalten -->`. Erlaubt: `titel-und-text`, `zwei-spalten`, `grosse-zahl`, `tabelle`, `bild-gross`, `zitat`.
9. **Status-Hinweise** als HTML-Kommentar, z. B. `<!-- status: entwurf, pruefen in M4 -->`. Sie sind für die Pflege gedacht und erscheinen nicht auf Folien.
10. **Sprache:** Deutsch. Handbuch in Du-Form, Projekt-Präsentation in neutraler Sachsprache. Keine Gedankenstriche, keine erfundenen Zahlen.

## Pflege

- Jeder Meilenstein aktualisiert beide Präsentationen (Teil der Definition of Done).
- Kapitel, deren Funktion noch nicht gebaut ist, tragen `<!-- status: entwurf ... -->` und werden bei Fertigstellung gegen die echte App geprüft.
- `stand` und `version` im Kopf werden bei jeder inhaltlichen Änderung angepasst.

## Prompt für die Umwandlung in PowerPoint

Diesen Text zusammen mit einer der Dateien an eine KI geben (Datei anhängen oder Inhalt einfügen):

```
Erstelle aus der angehängten Markdown-Datei eine PowerPoint-Präsentation (.pptx).

Aufbau:
- Der Kopf zwischen den --- Zeilen ergibt die Titelfolie (titel, untertitel, stand).
- Jede Überschrift der Ebene 1 (#) ist eine Kapiteltrennfolie.
- Jede Überschrift der Ebene 2 (##) ist genau eine Inhaltsfolie mit allem, was bis zur nächsten Überschrift folgt.
- Zitatblöcke, die mit "Notizen:" beginnen, kommen in die Sprechernotizen, nicht auf die Folie.
- HTML-Kommentare mit "layout:" sind Layout-Wünsche; alle anderen HTML-Kommentare ignorieren.
- Bilder aus den Bildverweisen einfügen, falls vorhanden; sonst einen beschrifteten Platzhalter.

Inhalt:
- Text wörtlich übernehmen, nichts hinzuerfinden, nichts weglassen.
- Tabellen als echte Tabellen, nicht als Bild.

Gestaltung (Designsystem von Juri):
- Hintergrund Weiß #FFFFFF, Flächen #F6F4FB, Linien #EFECF5.
- Text #17141F, Sekundärtext #6B6678.
- Akzentfarbe Veilchen #6A3FE0, helle Akzente #EEE8FD und #C9B8F7, dunkler Akzent #4B2AA8.
- Titel in "Bricolage Grotesque" (fett, eng gesetzt), Fließtext in "Figtree".
  Falls nicht installiert: Titel "Arial Black", Text "Arial".
- Kapiteltrennfolien vollflächig #6A3FE0 mit weißem Titel.
- Viel Weißraum, abgerundete Ecken (Karten ca. 28 px), keine Farbverläufe, keine Emojis, keine Schlagschatten.
- Format 16:9.
```
