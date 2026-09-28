# ADR-003: Dateiformat .juri

Status: angenommen · 28.09.2026 (Umsetzung in M9)

## Kontext

Teilen läuft ausschließlich über Dateien von Mensch zu Mensch (AirDrop, Nachrichten, Mail). iOS bietet Web Share mit Dateien, aber kein Share Target und kein File Handling für Web-Apps. Die Dateiauswahl graut Dateien aus, wenn `accept` eine unbekannte Endung nennt.

## Entscheidung

- `.juri` ist ein **ZIP** (fflate) mit `manifest.json` (Format, Version, Autor, Stapel, optional Erfolgs-Snapshot und High fives), `cards.json` (ohne Lernfortschritt) und `media/<id>.<ext>`.
- Jede Datei wird vor dem Import mit **zod** validiert, mit Größen- und Mengenlimits; Inhalte werden nie als HTML oder Code ausgeführt.
- Merge über stabile UUIDs (`deck.id`, `card.id`), „Aktualisieren“ behält den Lernfortschritt des Empfängers, „Als Kopie“ vergibt neue IDs.
- Die Dateiauswahl nutzt **keinen `accept`-Filter**; erkannt wird über ZIP-Signatur und `manifest.json`.
- Welcher MIME-Typ beim Teilen funktioniert (`application/octet-stream`, `application/zip`, eigener Typ), klärt der Geräte-Check; bis dahin ist `application/octet-stream` vorgesehen, Fallback Download.

## Konsequenzen

- Empfänger speichern die Datei zuerst in „Dateien“ und importieren dann in Juri; die App erklärt das einmalig.
- Absender sind nicht authentifiziert; für V1 akzeptiert, weil nur Anzeige betroffen ist.
