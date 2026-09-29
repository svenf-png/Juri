# ADR-012: Fristen

Status: angenommen · 29.09.2026 (Umsetzung in M8, Entscheidungen 2, 6, 11 und 12)

## Kontext

Prüfungen, Klausuren und Module haben ein Datum. Juri soll dafür sorgen, dass der Stoff bis dahin rechtzeitig dran kommt, ohne den Rhythmus des Lernalgorithmus dauerhaft zu verbiegen. Nach dem Termin soll alles wieder laufen wie zuvor. Grundsatz aus der Architektur: **Fristen ändern keine gespeicherten Daten.**

## Entscheidung

- **Datenmodell:** Tabelle `deadlines` (Schema-Version 6, nur angehängt) mit `kind` (Examen, Klausur, LL.M., Eigene), `name`, optionalem `date` („JJJJ-MM-TT“), `scope` und `sprint`. Der Umfang ist `all` (alle Karten) oder die Vereinigung aus `areaIds` (über die Stapel), `deckIds` und `tags` (der Karten). Ein Umfang ohne Angaben und ohne `all` erfasst keine Karte. Eine Frist ohne Datum ändert nichts.
- **Verweise:** Löschen eines Stapels oder Rechtsgebiets entfernt die Verweise aus den Umfängen in derselben Transaktion (`data/repositories/decks.ts`, `areas.ts`). Bleibt ein Umfang leer, bleibt die Frist bestehen und der Bildschirm sagt „Kein Umfang gewählt“; sie wird nie stillschweigend zu „alle Karten“. Das Backup prüft die Verweise (`domain/model/integrity.ts`).
- **Effektive Fälligkeit** (`domain/deadlines/effective.ts`, rein): Aus dem gespeicherten `due` und den aktiven Fristen wird zur Laufzeit ein früheres Datum, nie ein späteres; gespeichert wird nichts. Aktiv ist eine Frist mit Datum vom Tag der Frist an rückwärts, der Tag der Frist zählt noch mit, danach gilt wieder der normale Rhythmus. Der Lerntag folgt Entscheidung 6 (Wechsel 04:00 in der Gerätezeitzone).
  - **Deckelung:** Eine Abfrage im Umfang wird spätestens um 04:00 am letzten Lerntag vor der Frist fällig, es sei denn, sie wurde seit diesem Zeitpunkt schon gesehen (`lastReviewedAt`).
  - **Endspurt:** Ist er eingeschaltet, kommt jede Abfrage im Umfang in den 7 Tagen vor der Frist noch einmal. Der Tag ergibt sich stabil aus der ID der Abfrage (FNV-1a modulo 7), damit nicht alles am ersten Tag fällig wird. Wer im Endspurt schon gesehen wurde, ist erledigt und wird nicht mehr vorgezogen. Neue Abfragen (ohne `due`) bleiben unberührt, für sie gilt das Tageslimit.
  - **Mehrere Fristen:** Es gilt die früheste Forderung aller Fristen, in deren Umfang die Abfrage liegt.
- **Einspeisung:** Die Datenschicht rechnet die effektive Fälligkeit beim Lesen ein (`readOverlay`, `readStudy`, `readDeckDetail`, `readTodaySnapshot`); Heute, Stapel, Stapel-Detail und die Lernsession sehen dieselben Zahlen. Bewertungen lesen und schreiben den gespeicherten Zustand und wissen nichts von Fristen.
- **„x % sitzen sicher“:** Anteil der Abfragen im Umfang, die gelernt sind und deren gespeicherte Fälligkeit nicht vor dem Tag der Frist liegt (der Abstand trägt bis zum Termin), abgerundet, damit 100 % wirklich alle heißt. Ohne Abfragen im Umfang gibt es keine Quote.
- **Countdown und Liste:** `domain/deadlines/list.ts` liefert die fertigen Texte. Reihenfolge: bevorstehende nach Datum, dann ohne Datum, dann abgelaufene (gedämpft unter „Abgelaufen“). Nur die nächste Frist mit Datum ist die große Karte mit Fortschritt.
- **Kalenderdatei:** `domain/deadlines/calendar.ts` erzeugt `.ics` (RFC 5545): je kommender Frist ein ganztägiger Termin mit Erinnerung am Vortag um 09:00, dazu ein Termin am Beginn des Endspurts. Die UID ist je Frist stabil (`frist-<ID>@juri`), damit ein erneuter Import den Termin aktualisiert. Auf dem Desktop lädt der Knopf die Datei, auf iOS öffnet er das Teilen-Menü (`saveMode`, Entscheidung 12).
- **Tests:** Grenzfälle in `domain/deadlines/deadlines.test.ts` (Tageswechsel 04:00, Frist heute, abgelaufen, ohne Datum, mehrere Fristen je Stapel und Rechtsgebiet, Zeitumstellung März und Oktober in `Europe/Berlin`); Datenschicht in `data/repositories/deadlines.test.ts`; Bildvergleich und Abläufe in `tests/e2e/fristen*.spec.ts`.

## Konsequenzen

- Eine Frist zieht Karten nur vor. Wer sie löscht oder wem sie abläuft, hat keine veränderten Daten zu reparieren.
- Die Zahl fälliger Karten kann vor einer Frist deutlich steigen, besonders am Beginn des Endspurts bei großen Umfängen. Die Verteilung nach ID glättet das über 7 Tage, ändert aber nichts an der Menge. Ein einstellbares Tageslimit für vorgezogene Karten gibt es nicht (offen).
- Die Quote misst den Termin, nicht die Behaltenswahrscheinlichkeit. Sie steigt, wenn Abstände über die Frist hinausreichen, und fällt nach „Nochmal“.
- Die Zeile „Fristen“ unter Lernrhythmus (A29) zeigt die Zahl der Fristen.
- Ob das Teilen-Menü von iOS `.ics` als Kalendertermine anbietet, ist nicht geprüft (Geräte-Check, Testliste M8).

## Verworfen

- **Fälligkeit in der Datenbank ändern:** Bei Löschen oder Ablauf einer Frist müsste man den alten Termin wiederherstellen; Undo, Algorithmuswechsel und Backup würden komplizierter.
- **Alle Endspurt-Karten am ersten Tag:** Ein großer Umfang ergäbe einen Berg an einem Tag.
- **Leerer Umfang bedeutet alle Karten:** Nach dem Löschen des letzten Stapels würde eine Frist unbemerkt alles erfassen.
