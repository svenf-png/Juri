# Juri: Leitfaden für Claude-Sessions

Juri ist eine Karteikarten-PWA für das juristische Referendariat (iPhone/iPad, Safari/WebKit), ohne Server für Nutzerdaten. Dieses Dokument ist die Übergabe für neue Sessions. Maßgeblich sind:

- `docs/ARCHITEKTUR.md`: Architektur, **Entscheidungen 1 bis 10**, Annahmen A1 bis A14, Plan M0 bis M11, Risiken
- `docs/adr/`: Architekturentscheidungen (Stack, Speicher, .juri, Scheduler, Hosting)
- `design/*.dc.html`: verbindliches Design (HTML mit Inline-Styles; `support.js` und der Script-Block am Ende gehören zum Design-Tool)
- `docs/folien/`: Projekt-Präsentation und Handbuch, per KI in PowerPoint umwandelbar (`KONVENTION.md`)

## Arbeitsweise

- Nutzer: Sven. Sprache Deutsch. **Keine Gedankenstriche** (Em-Dash, En-Dash) in Texten für ihn, in UI-Texten und Doku. Bei unklaren Anforderungen nachfragen, Entscheidungen per Auswahl-Popup mit Empfehlung.
- Fakten zu iOS/WebKit nur mit Quelle (WebKit-Blog, MDN, caniuse), nichts erfinden.
- **Ein PR pro Meilenstein** gegen `main`. Nach jedem Meilenstein: Tests grün, Demo-Notiz, Doku und Folien aktualisiert, offene Punkte.
- Design exakt übernehmen (Farben, Radien, Größen, Kurven), Werte aus `src/ui/tokens/tokens.ts`, nicht runden.
- Touch-Ziele mindestens 44 px (sichtbare Größe darf kleiner sein, Trefferfläche erweitern), Text-Kontrast mindestens 4,5:1, echte Buttons/Links/Labels, reduzierte Bewegung respektieren.

## Budget und Chats

- Budget: rund 100 $ Guthaben für das ganze Projekt (nach M0 verbraucht: 10,50 $). Testbarer Prototyp = M1 bis M4 (Entscheidung 11).
- **Ein neuer Chat pro Meilenstein**, damit der Kontext klein bleibt. Am Ende jedes Meilensteins den Kostenstand aus `get_session` (usage.cost_usd) melden und in `docs/ARCHITEKTUR.md` (Entscheidung 11) nachtragen.
- Sparsam arbeiten: wenige Screenshots und Bild-Reads, gezielte Datei-Ausschnitte statt ganzer Dateien, keine breite Web-Recherche ohne Anlass. Designs nur für den jeweiligen Meilenstein lesen.
- Routine-Meilensteine mit `/effort high`, M4 (Lernalgorithmus) und M9 (Merge) mit höherer Stufe.

### Start-Nachricht für einen Meilenstein-Chat

```
Juri, Meilenstein Mx. Lies CLAUDE.md, docs/ARCHITEKTUR.md (Entscheidungen, Annahmen,
Plan-Zeile Mx) und nur die Design-Dateien, die Mx betrifft. Setze Mx um, ein PR gegen main.
Frag mich nur bei kritischen Punkten. Am Ende: Demo-Notiz, offene Punkte, Kostenstand.
```

## Befehle

```bash
npm run dev            # echte App, http://localhost:5173/Juri/
npm run dev:test       # Testinstanz, http://localhost:5173/Juri/test/
npm run lint && npm run typecheck && npm test
npm run test:coverage  # domain/ muss >= 90 % haben
npm run build          # dist/ (App) und dist/test/ (Testinstanz) + 404.html
npm run serve          # dist/ wie GitHub Pages unter http://127.0.0.1:4173/Juri/
npm run e2e            # Playwright (baut nicht selbst: vorher npm run build)
npm run icons          # App-Icons aus dem Design neu rendern
npm run format         # Prettier
```

In der Cloud-Umgebung gibt es nur Chromium (kein `playwright install`):
`PW_CHROMIUM_ONLY=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e`.
WebKit läuft in der GitHub-CI.

## Architektur in Kürze

- Schichten: `ui/` → `features/` → `domain/` (rein, ohne Browser/React) ; `data/` (Dexie ab M1) ; `platform/` (Browser-APIs). ESLint erzwingt die Richtung, Importe über `@/`.
- Zwei Instanzen (`src/app/instance.ts`): `/Juri/` und `/Juri/test/` (Vite-Modus `testinstanz`), getrennte DB, eigenes Manifest und Icon.
- Router-`basename` ist `import.meta.env.BASE_URL` **mit** Schrägstrich (Manifest-Scope).
- CSP als Meta-Tag (`src/app/security.ts`), keine fremden Origins, keine Inline-Skripte, React-Styles nur über `style`-Props (CSSOM).
- Deep Links über `404.html` (`src/app/deepLink.ts`, `scripts/postbuild.mjs`).
- Tokens: `tokens.ts` → `tokens.css` (Vite-Plugin), Gleichstand und Kontraste in `tokens.test.ts`.
- Bildschirm-Abstände oben: Designwert + `var(--top-shift)` (Designs enthalten 47 px Statusleiste).

## Stand

Siehe `docs/ARCHITEKTUR.md` (Status-Zeile) und `docs/folien/projekt.md` (Folie „Stand heute“).
