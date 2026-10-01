# ADR-016: Qualität, Messgrenzen und Veröffentlichung 1.0

Status: angenommen · 01.10.2026 (Umsetzung in M12, Entscheidungen 7, 9, 10, 11 und 12; schreibt ADR-005 und ADR-011 fort)

## Kontext

M12 schließt den Funktionsumfang ab: Update-Ablauf, Install-Hinweis, Zugänglichkeit, Kontraste, Touch-Ziele und die Leistung mit 5.000 Karten, dazu Version 1.0.0. Es gibt keine Geräte in der Cloud-Umgebung, VoiceOver und Safari lassen sich dort nicht bedienen. Ziel ist, was sich automatisch messen lässt, als Test festzuhalten, und den Rest als Schrittliste für den Gerätetest bereitzustellen, ohne etwas zu behaupten, das nicht geprüft wurde.

## Entscheidung

- **Messgrenzen für die Leistung** (Sven hat gewählt, A90): Bildschirm öffnen bis zum sichtbaren Inhalt höchstens 1,5 s, Eingabe (Suche) bis zum Ergebnis höchstens 500 ms, Backup bis zur fertigen Datei höchstens 5 s; mit vierfach gedrosselter CPU 4 s, 1,5 s und 8 s; Bewerten höchstens 300 ms mehr als mit 40 Karten. Die Messung läuft als `tests/e2e/leistung.spec.ts` in Chromium Desktop mit echter IndexedDB (Median aus drei Läufen) und prüft die Grenzen in der CI. WebKit und echte Geräte werden nicht gemessen; die CPU-Drosselung ist eine grobe Annäherung. Der große Datensatz entsteht in der Testinstanz über `src/demo/demoLarge.ts`, deterministisch aus der Uhrzeit.
- **Zugänglichkeit ohne Gerät** (Sven hat gewählt, A91): axe-core in Playwright (WCAG 2.0 bis 2.2 A und AA sowie Best Practices) über Bildschirme, Sheets, Menü und Vorschau-Zustände; eigene Tests für Fokus (Sheet nimmt den Fokus, Tab erreicht nie die Seite dahinter, Escape gibt ihn zurück, Fokusanzeige sichtbar) und für Trefferflächen von 44 px. Gemessen wird mit reduzierter Bewegung. Das echte VoiceOver bleibt eine Schrittliste in `docs/geraete-testliste.md`. Neue Dev-Abhängigkeit: `@axe-core/playwright` 4.13.0.
- **Trefferflächen** werden über `::after` erweitert; dabei zählt bei `border-box` der Rand nicht zur Innenkante (A91). Neue Elemente rechnen mit der Innenkante und der Test fängt Fehler.
- **Update-Ablauf** (A92): Hinweis statt stillem Reload (`registerType: 'prompt'`), in einer Lernrunde zurückgehalten, E2E-Test mit einer Kopie von `dist/` auf freiem Port (`scripts/serve-pages.mjs --root`).
- **Abhängigkeiten:** pdf.js 6.3.289 statt 5.7.284 (A93, GHSA-hq66-cqwq-w95j), `npm audit` ohne Befund.
- **Version 1.0.0** (A94): Funktionsumfang M0 bis M12, Daten stabil (Schema 8, `.juri` Formatversion 1); M13 (Desktop-Gestaltung) folgt als 1.1.0.

## Konsequenzen

- Die Leistung auf iPhone und iPad ist nicht belegt, nur geschätzt; der Gerätetest mit dem großen Datensatz klärt es.
- Die Stapel-Liste ist mit 5.000 Karten der langsamste Bildschirm (rund 1,2 s); eine Zählung der fälligen Karten über den `due`-Index wäre die Option, wenn sie auf dem Gerät zu langsam ist.
- axe-core findet nur, was sich aus dem DOM ablesen lässt. Reihenfolge und Ansage durch VoiceOver, Dynamic Type und Sprachsteuerung bleiben Gerätetest.
- Der Test für den Update-Ablauf braucht einen Build (`npm run build`) und läuft nur in Chromium Desktop; Firefox und Safari steuern den Service Worker anders, dort deckt ihn die Praxis ab.
