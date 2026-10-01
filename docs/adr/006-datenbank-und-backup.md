# ADR-006: Datenbank, Migrationen und Backup

Status: angenommen · 28.09.2026 (Umsetzung in M1)

## Kontext

Alle Daten liegen in IndexedDB (ADR-002). Das Schema wächst mit jedem Meilenstein, Nutzerinnen und Nutzer aktualisieren aber nicht gleichzeitig, und ein Backup kann Monate alt sein. Ein Backup muss deshalb auch in einer neueren Juri-Version einspielbar sein, und ein fehlerhaftes Backup darf keine Daten zerstören.

## Entscheidung

- **Dexie 4** mit einer Liste von Schema-Versionen (`src/data/migrations.ts`), fortlaufend ab 1 und nur anhängen. Jede neue Tabelle, jeder neue Index und jede Umformung bekommt eine neue Version.
- **Eine Umformung für beides:** `upgrade` wandelt Datensätze der Vorversion um und gilt für die Datenbank (Dexie-Upgrade) und genauso für ältere Backups (`migrateTables`).
- **Schemas als einzige Quelle:** Jede Tabelle hat ein zod-Schema in `src/domain/model/records.ts`; die TypeScript-Typen werden daraus abgeleitet. Ein Test verlangt für jede Tabelle ein Schema.
- **Backup-Datei `.juri-backup`:** ZIP (fflate) mit `manifest.json` (Format, Formatversion, Schema-Version, Zeitpunkt, Instanz, App-Version, Tabellen), `tables/<name>.json` und `bin/<n>` für Binärdaten (ArrayBuffer, z. B. Medien). Kodieren ist deterministisch: gleiche Daten und gleicher Zeitpunkt ergeben dieselben Bytes.
- **Einspielen = Ersetzen**, nach vollständiger Prüfung vor dem ersten Schreibzugriff: ZIP-Signatur, Grenzen (Einträge, Größe), Manifest, Version, Migration, jeder Datensatz gegen sein Schema, eindeutige Schlüssel, genau ein Profil. Geschrieben wird in einer Transaktion; scheitert etwas, bleibt der alte Stand. Zusammenführen ist Sache von `.juri` (M10).
- **Gerätedaten reisen nicht mit:** `lastBackupAt` und `newCardsSinceBackup` beschreiben dieses Gerät. Beim Einspielen gilt die Datei selbst als letztes Backup.
- **Export über das Teilen-Menü in zwei Schritten:** Datei erstellen, dann „Sichern oder teilen“. So läuft `navigator.share` direkt aus einem Tippen heraus, auch wenn das Erstellen dauert.
- **zod ohne Code-Erzeugung** (`z.config({ jitless: true })`), weil die CSP kein `unsafe-eval` erlaubt. zod wird erst mit den Einstellungen geladen, die Startseite braucht es nicht.

## Zielmodell (Tabellen kommen mit ihren Meilensteinen)

`profile` und `meta` (M1); `areas`, `decks`, `cards`, `reviewItems` (M3); `reviewLog` (M4); `media` (M6, ArrayBuffer); `deadlines` (M8); `events`, `dayStats`, `milestones` (M9); `contacts`, `kudos` (M11, Schema-Version 8, ADR-015). Felder und Indizes legt der jeweilige Meilenstein fest, mit Migration und Schema.

## Konsequenzen

- Ein Backup aus M1 lässt sich in jeder späteren Version einspielen; ein Backup aus einer neueren Version lehnt eine ältere App mit Hinweis ab.
- Fehlerhafte oder manipulierte Dateien ändern nichts; die Meldung sagt, warum.
- Große Backups mit vielen Medien werden im Speicher entpackt. Die Grenze (1 GB) wird in M6 mit echten PDFs überprüft.
