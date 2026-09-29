# ADR-007: Karten, Stapel, Rechtsgebiete und Lückentext

Status: angenommen · 28.09.2026 (Umsetzung in M3)

## Kontext

Mit M3 entstehen die Inhalte der App. Sie müssen sich sichern, teilen (M10) und später mit Lernzustand (M4) verbinden lassen, ohne dass Bestehendes umgebaut wird. Ein Lückentext mit drei Lücken soll drei Abfragen ergeben (Entscheidung 3).

## Entscheidung

- **Tabellen (Schema-Version 2):** `areas` (Rechtsgebiete), `decks` (Stapel), `cards` (Karten), `reviewItems` (Abfragen), `events` (Ereignis-Log). Schemas in `src/domain/model/records.ts`, Migration in `src/data/migrations.ts`.
- **Rechtsgebiet und Stapel sind m:n:** `decks.areaIds` ist ein Array mit Mehrfach-Index (`*areaIds`). Ein Stapel liegt in mindestens einem Rechtsgebiet. Die Karte gehört genau einem Stapel (`cards.deckId`).
- **Reihenfolge der Rechtsgebiete ist abgeleitet, nicht gespeichert:** ZR, SR, ÖR zuerst, danach eigene in der Reihenfolge des Anlegens.
- **Kartentypen als diskriminierte Union** (`type`): `qa` mit `front`, `back` und `cloze` mit `text`. Schema (M5) und Abdeckung (M6) kommen als weitere Typen dazu, ohne Migration. Der Typ steht nach dem Anlegen fest.
- **Lückenschreibweise:** `{{c1::Wort}}` im Text, die Zahl nummeriert die Lücke. Jede Nummer ist eine Abfrage, mehrere Lücken gleicher Nummer werden zusammen abgefragt. Der Editor arbeitet mit reinem Text und Bereichen (`clozeDraft.ts`) und schreibt beim Speichern die Markierung.
- **Abfragen haben feste Kennungen:** Frage = Karten-ID, Lücke = `<Karten-ID>:c<N>`. Beim Bearbeiten bleiben Abfragen unangetastet, die Lücke behalten; neue Lücken bekommen eine Abfrage, entfernte verlieren sie samt Lernfortschritt. Nummern vergibt der Editor als größte plus eins, damit gelöschte nicht wiederkehren.
- **`reviewItems.deckId` ist denormalisiert**, damit Zählungen je Stapel ohne Verbindung auskommen; beim Verschieben einer Karte zieht die Transaktion ihre Abfragen mit.
- **Ereignis-Log ab hier:** `events` (`++seq`, `at`, `type`) nimmt bisher „Karte angelegt“ auf, nur anhängend. Tagesziel „Anlegen“, „+N Karten angelegt“ und der Backup-Zähler (`newCardsSinceBackup`) entstehen in derselben Transaktion wie die Karte. Löschen einer Karte lässt das Ereignis stehen.
- **Löschregeln:** Ein Stapel löschen entfernt Karten und Abfragen in einer Transaktion. Ein Rechtsgebiet lässt sich nicht löschen, solange Stapel nur dort liegen; andere Stapel verlieren nur die Zuordnung.
- **Backup prüft Verweise:** Vor dem Einspielen müssen alle `areaIds` und `deckId` auf vorhandene Datensätze zeigen und jede Karte genau ihre Abfragen haben (`hasIntegrity`). Ein Backup aus M1 ohne die neuen Tabellen bleibt einspielbar.
- **Bis M4 war jede Abfrage fällig.** Der Lernzustand (FSRS, Leitner, `due`) kam mit M4 als optionale Felder und neuer Index, siehe ADR-008.

## Konsequenzen

- Karten, Stapel und Rechtsgebiete sind ohne weitere Migration teilbar (M10) und um Lernzustand erweiterbar (M4).
- Der Mehrfach-Index macht „Stapel je Rechtsgebiet“ und „Rechtsgebiete je Stapel“ ohne Zwischentabelle abfragbar.
- Stabile Abfrage-Kennungen erlauben den Merge „Aktualisieren“ (M10), der Lernfortschritt behält.
- Suche läuft im Speicher über alle Karten; für 5.000 Karten wird das in M12 gemessen.
