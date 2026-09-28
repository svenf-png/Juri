# ADR-002: Speicher ohne Server

Status: angenommen · 28.09.2026

## Kontext

Keine Accounts, keine Server für Nutzerdaten. Auf iOS entscheidet WebKit über Quote und Persistenz. Seit Safari 17 gilt für Home-Bildschirm-Apps die Quote der Browser-App (bis ca. 60 % des Speichers) und persist() wird heuristisch gewährt, u. a. für Home-Bildschirm-Apps. Safari und die installierte App haben getrennte Speicher (WebKit-Bug 181849).

## Entscheidung

- Alle Daten in **IndexedDB** (ab M1 über Dexie), Medien als Blobs.
- Pro Instanz eine eigene Datenbank (`juri`, `juri-test`), siehe ADR-005.
- Nach der Installation `navigator.storage.persist()` anfordern, Status und `estimate()` in den Einstellungen anzeigen.
- **Backup** als Datei (`.juri-backup`), Erinnerung nach 14 Tagen oder 50 neuen Karten, bevorzugt „In Dateien sichern“ (iCloud Drive).
- Im Safari-Tab (nicht installiert) legt Juri keine Daten an und zeigt zuerst die Install-Anleitung.
- Löschen ist Soft-Delete (`deletedAt`), damit Merges nachvollziehbar bleiben.

## Konsequenzen

- Datenverlust ist nur über Nutzeraktionen (App entfernen, Verlauf löschen) oder Geräteverlust möglich; dagegen hilft nur das Backup.
- Ein Wechsel der Adresse (Origin) bedeutet Export und Re-Import für alle Nutzer.
- Das Verhalten beim Entfernen des App-Symbols prüft der Geräte-Check (Marker-Test).
