# ADR-009: Schema-Karten und Verknüpfungen

Status: angenommen · 29.09.2026 (Umsetzung in M5)

## Kontext

Ein Prüfungsschema ist eine Gliederung (Rechtsweg, Statthaftigkeit, Klagebefugnis …), die man in der richtigen Reihenfolge und mit ihrem Inhalt beherrschen soll (Entscheidung 4: eine Abfrage pro Schema, Lernziel ist auch der Inhalt). Einzelne Punkte sollen auf andere Karten verweisen können, etwa die Definition der Klagebefugnis. Verweise dürfen nach einer Löschung nirgends ins Leere zeigen (ADR-007: Backup prüft Verweise).

## Entscheidung

- **Kartentyp `schema`** (Titel, Punkte) neben `qa` und `cloze`, ohne neue Tabelle. Der Typ steht nach dem Anlegen fest. Eine Schema-Karte hat genau eine Abfrage (Kennung = Karten-ID), unabhängig von der Zahl der Punkte.
- **Punkte flach in Lesereihenfolge**, jeder mit `id` (`p1`, `p2` …, bleibt beim Bearbeiten stehen), `level` (1 bis 3), `text`, optional `norm`, `content` (Inhalt, Entscheidung 4) und `link` (Kennung einer anderen Karte). Die Baumstruktur folgt aus der Regel „der erste Punkt steht auf Ebene 1, jeder weitere höchstens eine Ebene tiefer als der davor“ (zod-Refine in `records.ts`). Höchstens 60 Punkte, Text und Norm je 200 Zeichen, Inhalt 2.000.
- **Zählung ist abgeleitet:** Ebene 1 „1.“, Ebene 2 „a)“, Ebene 3 „aa)“, jede Ebene zählt unter ihrem Oberpunkt neu (`pointLabels`, `pointNumbers`, `pointPaths`). Nichts davon wird gespeichert, damit Verschieben und Einrücken nichts umbenennen müssen.
- **Editor rein und zuerst:** Einrücken und Ausrücken nehmen den Teilbaum mit, Verschieben tauscht Teilbäume unter demselben Oberpunkt, Entfernen nimmt nur den Punkt (Unterpunkte rücken nach). Ganz leere Punkte fallen beim Sichern weg, Punkte ohne Text, aber mit Norm, Inhalt oder Verknüpfung sind ein Fehler (`checkSchema`).
- **Lernen als Schritte:** Die Session-Maschine kennt für eine Station optional `steps` (Schema: Zahl der Punkte). „Nächster Punkt“ deckt einen Punkt auf, „Alle zeigen“ alle; bewertet wird erst, wenn alle aufgedeckt sind. Eine Bewertung, eine Abfrage. Der letzte aufgedeckte Punkt ist hervorgehoben, verdeckte Punkte tragen keinen Text (`schemaRows`).
- **Verknüpfung ist ein Verweis am Punkt** auf eine beliebige andere Karte (auch ein anderes Schema, nicht die Karte selbst). Es gibt keine Tabelle der Verknüpfungen und keine Rückverweise auf der Zielkarte; „wer verweist auf diese Karte“ ergibt sich aus einer Abfrage über die Schema-Karten (Index `type`).
- **Integrität bei Löschung, in derselben Transaktion:** Karte löschen und Stapel löschen entfernen die Verweise auf die gelöschten Karten aus allen übrigen Schemas. Die Punkte bleiben, das Schema gilt als geändert (`updatedAt`, wichtig für den Merge in M9). Vor dem Löschen nennt das Bestätigungsblatt, in wie vielen Schemas und Punkten die Karte verknüpft ist.
- **Backup prüft Verweise:** `hasIntegrity` verlangt, dass jede Verknüpfung auf eine vorhandene andere Karte zeigt.
- **Schema-Version 4** (`src/data/migrations.ts`): Index `type` auf `cards`, keine Umformung. Ein Backup mit Schema-Karten trägt damit Version 4, ältere App-Stände lehnen es ab, statt an der unbekannten Karte zu scheitern (ADR-006).
- **Injizierbare Dienste im Editor:** Die Oberfläche bekommt Suche, verknüpfte Karte und „Neue Karte anlegen“ als Objekt (`LinkServices`, `features/library/links.ts`), damit Vorschau und Tests ohne Datenbank laufen.

## Konsequenzen

- Schemas sind ohne weitere Migration teilbar (M9): Punkte haben feste Kennungen, Verknüpfungen sind Kartenkennungen und müssen beim Import auf mitgelieferte Karten zeigen oder wegfallen (M9 klärt den Fall „Ziel fehlt“; die Demo-Stapel machen es vor).
- Ein Schema lässt sich im Lernmodus nicht nach einzelnen Punkten abfragen. Abfragen einzelner Punkte bleiben eine spätere Option (Entscheidung 4).
- Die Suche im Verknüpfen-Feld läuft im Speicher über alle Karten wie die Bibliothek; für 5.000 Karten misst M11 nach.
