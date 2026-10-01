# ADR-003: Dateiformat .juri

Status: umgesetzt in M10 (0.11.0) · angenommen 28.09.2026 · Merge, Konflikte und Prüfung im Einzelnen: ADR-014

## Kontext

Teilen läuft ausschließlich über Dateien von Mensch zu Mensch (AirDrop, Nachrichten, Mail). iOS bietet Web Share mit Dateien, aber kein Share Target und kein File Handling für Web-Apps. Die Dateiauswahl graut Dateien aus, wenn `accept` eine unbekannte Endung nennt.

## Entscheidung

- `.juri` ist ein **ZIP** (fflate) mit `manifest.json` (Format, Version, Autor, Stapel, optional Erfolgs-Snapshot und High fives), `cards.json` (ohne Lernfortschritt) und `media/<id>.<ext>`.
- Jede Datei wird vor dem Import mit **zod** validiert, mit Größen- und Mengenlimits; Inhalte werden nie als HTML oder Code ausgeführt.
- Merge über stabile UUIDs (`deck.id`, `card.id`), „Aktualisieren“ behält den Lernfortschritt des Empfängers, „Als Kopie“ vergibt neue IDs.
- Die Dateiauswahl nutzt **keinen `accept`-Filter**; erkannt wird über ZIP-Signatur und `manifest.json`.
- Beim Teilen gilt `application/octet-stream` (Geräte-Check M0: `canShare` für `.juri` in allen getesteten Typen ja; ob das Teilen-Menü die Datei mit diesem Typ anbietet und ob die Dateiauswahl sie wieder annimmt, prüft der Gerätetest M10), Fallback Download.

## Konsequenzen

- Empfänger speichern die Datei zuerst in „Dateien“ und importieren dann in Juri; die App erklärt das einmalig.
- Absender sind nicht authentifiziert; für V1 akzeptiert, weil nur Anzeige betroffen ist.

## Umsetzung (M10)

Umgesetzt wie beschrieben, mit diesen Festlegungen: Formatversion 1, Absender optional und nur zur Anzeige, Notizen nur mit Schalter (`manifest.notes`), Erfolgs-Snapshot und High-five-Feld optional, Whitelist der ZIP-Einträge, Grenzen und Prüfungen siehe ADR-014. Die Datei enthält keine Lernzustände und keine Abfragen.

**Fortschreibung M11 (ADR-015):** Das Manifest trägt optional `sender.id` (zufällige Absender-ID, nicht authentifiziert) und `highFives` in der Form `{ id, at, to?, win? }`. Die Formatversion bleibt 1. Dazu gibt es die kleine Gruß-Datei `.juri-gruss` (nur `manifest.json`, gleiche Prüfung, keine Karten).
