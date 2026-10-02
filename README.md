# Juri

Minimalistische Karteikarten-App (PWA) für das juristische Referendariat, für iPhone und iPad, mit einer eigenen Gestaltung für den Desktop-Browser (ab 1280 px Breite). Alle Daten bleiben lokal auf dem Gerät, es gibt keinen Server für Nutzerdaten.

- **Adresse:** https://svenf-png.github.io/Juri/
- **Testinstanz** (eigene Daten, Demo-Inhalte, Testdaten-Menü): https://svenf-png.github.io/Juri/test/
- **Version:** 1.1.0 (Meilensteine M0 bis M13, mit eigener Desktop-Gestaltung ab 1280 px Breite). Offen sind die Gerätetests ([docs/geraete-testliste.md](docs/geraete-testliste.md)).
- **Dokumentation:** [docs/README.md](docs/README.md), darin Architektur, Handbuch und Projekt-Präsentation (per KI in PowerPoint umwandelbar).
- **Design-Referenz:** [design/](design/)
- **Lizenz:** [MIT](LICENSE); mitgelieferte Schriften unter SIL Open Font License.

## Was Juri kann

- **Karten:** Frage und Antwort, Lückentext, Schema (Gliederung mit Normen und Verknüpfungen), Abdeckung auf Bildern und PDF-Seiten; Stapel und Rechtsgebiete, Suche.
- **Lernen:** FSRS oder Leitner, Tageslimits, Rückgängig, Wischen und Tastatur.
- **Fristen:** Deckelung und Endspurt, Countdown, Kalenderdatei (`.ics`).
- **Fortschritt:** Serie mit Pausentag, Tagesziele, Heatmap, Meilensteine, High fives.
- **Teilen:** Stapel als `.juri`-Datei weitergeben und mit Aktualisieren oder Als Kopie zusammenführen; Backup als `.juri-backup`.
- **Offline:** installierbar, läuft ohne Netz.

## Installieren

Auf iPhone und iPad: Juri in Safari öffnen, Teilen, „Zum Home-Bildschirm“, „Hinzufügen“ (gibt es den Schalter „Als Web-App öffnen“, bleibt er an), und ab dann nur noch über das neue Symbol öffnen. Safari und die installierte App haben getrennte Speicher, deshalb legt Juri im Safari-Tab keine Daten an. Auf dem Desktop läuft Juri in Chrome, Safari und Firefox direkt im Tab.

## Entwicklung

Voraussetzung: Node.js 22 (siehe `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:5173/Juri/
npm run dev:test   # Testinstanz: http://localhost:5173/Juri/test/
npm run check      # Lint, Typen, Unit-Tests, Build, E2E
```

Tests: `npm test` (Vitest, `domain/` mit mindestens 90 % Abdeckung über `npm run test:coverage`), `npm run e2e` (Playwright gegen den Build, mit Bildvergleich zu den Designs, Zugänglichkeit mit axe-core, Leistung mit 5.000 Karten und dem Update-Ablauf). Weitere Befehle und Konventionen: [CLAUDE.md](CLAUDE.md).

## Daten und Datenschutz

Karten, Lernstand und Einstellungen liegen in IndexedDB auf dem Gerät und verlassen es nur als Datei, die du selbst teilst. Ein Backup ist die einzige Sicherung: Bei gelöschten Website-Daten oder verlorenem Gerät hilft nur eine Backup-Datei (Einstellungen, „Backup erstellen“).
