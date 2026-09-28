# Juri

Minimalistische Karteikarten-App (PWA) für das juristische Referendariat, für iPhone und iPad. Alle Daten bleiben lokal auf dem Gerät.

- **Adresse (ab M0):** https://svenf-png.github.io/Juri/
- **Status:** M2 (Shell, UI-Kit, Heute) umgesetzt. Testinstanz mit Geräte-Check: https://svenf-png.github.io/Juri/test/
- **Dokumentation:** [docs/README.md](docs/README.md), darin Architektur, Handbuch und Projekt-Präsentation (per KI in PowerPoint umwandelbar).
- **Design-Referenz:** [design/](design/)
- **Lizenz:** [MIT](LICENSE); mitgelieferte Schriften unter SIL Open Font License.

## Entwicklung

Voraussetzung: Node.js 22 (siehe `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:5173/Juri/
npm run dev:test   # Testinstanz: http://localhost:5173/Juri/test/
npm run check      # Lint, Typen, Unit-Tests, Build, E2E
```

Weitere Befehle und Konventionen: [CLAUDE.md](CLAUDE.md).
