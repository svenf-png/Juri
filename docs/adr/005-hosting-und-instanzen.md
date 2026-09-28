# ADR-005: Hosting, Instanzen und Sicherheit

Status: angenommen · 28.09.2026

## Kontext

Hosting kostenlos und statisch, keine eigene Domain (Entscheidung 1). GitHub Pages erlaubt keine eigenen HTTP-Header und leitet unbekannte Pfade nicht auf index.html um. Für Tests mit Beispieldaten soll es eine getrennte Testinstanz geben (Entscheidung 10).

## Entscheidung

- **GitHub Pages** unter `https://svenf-png.github.io/Juri/`, Deploy per GitHub Actions nur von `main`, ohne gespeichertes Secret.
- **Zwei Builds:** echte App unter `/Juri/` und Testinstanz „Juri Test“ unter `/Juri/test/` (Vite-Modus `testinstanz`), mit eigener Datenbank, eigenem Manifest (`id`, `scope`), eigenem Icon und Hinweisband.
- Der Service Worker der echten App beantwortet `/Juri/test/` nicht (`navigateFallbackDenylist`), damit sich die Instanzen nicht überlagern.
- **Deep Links:** `404.html` leitet auf `<basis>?p=<pfad>` der passenden Instanz um, die App stellt die Adresse vor dem Router wieder her. Pfade mit Schema oder Backslash werden verworfen.
- **Content-Security-Policy** als Meta-Tag ohne fremde Origins und ohne Inline-Skripte. Da `frame-ancestors` per Meta-Tag nicht wirkt, rendert die App nicht, wenn sie eingebettet ist.
- **Lieferkette:** Actions auf Commit-Hashes gepinnt, minimale Workflow-Rechte, Dependabot, Lockfile, wenige Abhängigkeiten.
- **Konto:** Zwei-Faktor bzw. Passkey im GitHub-Konto und eine Regel für `main` (nur per PR, kein Force-Push) liegen beim Repo-Inhaber.
- Keine weiteren GitHub-Pages-Projekte im Account `svenf-png`, weil sie sich die Origin (Gerätespeicher) mit Juri teilen würden.

## Konsequenzen

- Deep Links antworten auf GitHub Pages mit Status 404, funktionieren aber; innerhalb der installierten App übernimmt der Service Worker.
- Ein späterer Umzug auf eine eigene Domain erfordert einen Umzugshinweis in der App (Backup exportieren, neu importieren).
