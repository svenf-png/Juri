# Juri: Leitfaden für Claude-Sessions

Juri ist eine Karteikarten-PWA für das juristische Referendariat (iPhone/iPad, Safari/WebKit), ohne Server für Nutzerdaten. Dieses Dokument ist die Übergabe für neue Sessions. Maßgeblich sind:

- `docs/ARCHITEKTUR.md`: Architektur, **Entscheidungen 1 bis 12**, Annahmen A1 bis A50, Plan M0 bis M13, Risiken
- `docs/adr/`: Architekturentscheidungen (Stack, Speicher, .juri, Scheduler, Hosting, Datenbank, Karten, Lern-Engine)
- `design/*.dc.html`: verbindliches Design (HTML mit Inline-Styles; `support.js` und der Script-Block am Ende gehören zum Design-Tool)
- `docs/folien/`: Projekt-Präsentation und Handbuch, per KI in PowerPoint umwandelbar (`KONVENTION.md`)

## Arbeitsweise

- Nutzer: Sven. Sprache Deutsch. **Keine Gedankenstriche** (Em-Dash, En-Dash) in Texten für ihn, in UI-Texten und Doku. Bei unklaren Anforderungen nachfragen, Entscheidungen per Auswahl-Popup mit Empfehlung.
- Fakten zu iOS/WebKit nur mit Quelle (WebKit-Blog, MDN, caniuse), nichts erfinden. Normtexte nur wörtlich aus gesetze-im-internet.de; die Cloud-Umgebung sperrt diese Adresse (Netzwerkrichtlinie), sie muss in den Umgebungseinstellungen freigegeben sein, sonst bleiben Demo-Inhalte „ungeprüft“ (`testdaten/README.md`).
- **Ein PR pro Meilenstein** gegen `main`. Nach jedem Meilenstein: Tests grün, Version in `package.json` auf 0.(n+1).0 (speist den Entwicklungsstand in den Einstellungen, A31), Demo-Notiz, Doku und Folien aktualisiert, offene Punkte.
- Design exakt übernehmen (Farben, Radien, Größen, Kurven), Werte aus `src/ui/tokens/tokens.ts`, nicht runden.
- Touch-Ziele mindestens 44 px (sichtbare Größe darf kleiner sein, Trefferfläche erweitern), Text-Kontrast mindestens 4,5:1, echte Buttons/Links/Labels, reduzierte Bewegung respektieren.

## Kosten und Chats

- Kosten: Sven hat ab M4 freigegeben, dass Kosten keine Rolle mehr spielen, alles läuft über das Plan-Abo. Die frühere Budgetgrenze (rund 100 $, verbraucht: nach M0 28,44 $) entfällt, ein Kostenstand muss nicht mehr gemeldet werden. Testbarer Prototyp = M1 bis M4 (Entscheidung 11).
- **Ein neuer Chat pro Meilenstein**, damit der Kontext klein bleibt.
- Gezielt arbeiten: Datei-Ausschnitte statt ganzer Dateien, keine breite Web-Recherche ohne Anlass. Designs nur für den jeweiligen Meilenstein lesen.
- Routine-Meilensteine mit `/effort high`, M4 (Lernalgorithmus) und M10 (Merge) mit höherer Stufe.

### Start-Nachricht für einen Meilenstein-Chat

```
Juri, Meilenstein Mx. Lies CLAUDE.md, docs/ARCHITEKTUR.md (Entscheidungen, Annahmen,
Plan-Zeile Mx) und nur die Design-Dateien, die Mx betrifft. Setze Mx um, ein PR gegen main.
Frag mich nur bei kritischen Punkten. Am Ende: Demo-Notiz, offene Punkte, PT-Stand.
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
npm run docs:bilder    # Screenshots nach docs/bilder/ (nach npm run build; Pixelvergleich mit dem Design)
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
- Daten (ADR-006): Schema-Versionen in `src/data/migrations.ts` nur anhängen, je Tabelle ein zod-Schema in `src/domain/model/records.ts`; Backup `.juri-backup` in `src/domain/backup/`. Routen-Wächter in `src/app/gates.tsx`: im Safari-Tab auf iPhone/iPad keine Datenbank (A13); E2E-Tests emulieren die installierte App mit `asInstalledApp`.
- Tokens: `tokens.ts` → `tokens.css` (Vite-Plugin), Gleichstand und Kontraste in `tokens.test.ts`.
- Bildschirm-Abstände oben: iPhone Designwert + `var(--top-shift)` (Designs enthalten 47 px Statusleiste), iPad Designwert + `var(--top-inset)`.
- Shell (M2): `AppShell` als Layout-Route, Tab-Bar unter 768 px, Sidebar ab 768 px, iPad-Designs ab 1100 px (A8). Bildschirme sind reine Ansichten eines Modells aus `domain/` (z. B. `todayModel`), Beispieldaten der Designs unter `/styleguide/heute`.
- Pixelnähe: `tests/e2e/design.ts` rendert `design/*.dc.html` im Testbrowser (mit Vorlagen `sc-for`, `sc-if`, verschachtelt); `heute.spec.ts` und `stapel.spec.ts` vergleichen Bild und Lage mit der App (auch WebKit). Bewusste Abweichungen stehen mit Grund in `FIXES`. Neue Screens so absichern.
- Karten und Stapel (M3, ADR-007): Tabellen `areas`, `decks` (m:n über `areaIds`), `cards` (qa, cloze), `reviewItems` (Lücke = Abfrage), `events` (Ereignis-Log). Reine Logik in `domain/cards`, `domain/library`, `domain/today/build.ts`; Schreiben in `data/repositories`, Hooks in `features/library`. Route `/stapel/:deckId?` (Master-Detail ab 1100 px), `/neu`, `/karte/:cardId`. Warn-Rot `danger` nur für Löschen und Fehler. Demo-Stapel: `testdaten/demo-stapel.json`.
- Lernen (M4, ADR-008): `reviewItems` trägt `fsrs`, `leitner`, `due` (Index des aktiven Algorithmus), `reviewLog` das Lernlog samt Zustand davor (Undo), Einstellungen liegen in `meta` (`learning`). Reine Logik in `domain/scheduler` (ts-fsrs nur in `fsrs.ts`, Leitner, Fälligkeit und Reihenfolge in `queue.ts`, Zustand in `schedule.ts`) und `domain/session` (Zustandsmaschine, `present.ts` für die Ansicht). Schreiben in `data/repositories/study.ts`, Session-Hook `features/study/useSession.ts`, Bildschirme `ui/screens/lernen` und `ui/screens/einstellungen/Lernrhythmus*`. Route `/lernen?stapel=<ID>`. Der Entwicklungsstand (`domain/roadmap`) folgt der Version aus `package.json`.
- Schema und Verknüpfungen (M5, ADR-009): Kartentyp `schema` mit flachen Punkten (`level` 1 bis 3, `text`, `norm`, `content`, `link`), eine Abfrage je Schema. Reine Logik in `domain/cards/schema.ts` (Editor-Operationen, Prüfung, Zählung, Verknüpfungen), Ansicht in `domain/session/present.ts` (`schemaRows`), Aufdeck-Schritte einer Station (`Station.steps`) in `domain/session`. Löschen bereinigt Verweise in derselben Transaktion (`data/repositories/cards.ts`, `decks.ts`), Backup prüft sie (`domain/model/integrity.ts`), Schema-Version 4. Dienste des Editors (Suche, verknüpfte Karte, neue Karte) sind über `LinkServices` (`features/library/links.ts`) austauschbar; Bildschirme `ui/screens/erstellen/SchemaEditor.tsx`, `ui/screens/lernen/LinkedCardSheet.tsx`, Vorschauen unter `/styleguide/schema/<Variante>` für `tests/e2e/schema.spec.ts`. Route `/lernen?karte=<ID>` lernt eine einzelne Karte.
- Bilder, PDF und Abdeckung (M6, ADR-010): Tabelle `media` (ArrayBuffer), Kartentyp `cover` (Felder in Bruchteilen des Bildes, Abfrage `<ID>:m<n>`), Herkunft `source` an jeder Karte, Schema-Version 5. Reine Logik in `domain/media` (Signatur, Grenzen, Renderplan, Zoom, Markierung) und `domain/cards/occlusion.ts`; Browser in `platform/media` (Bild verkleinern) und `platform/pdf` (pdf.js Legacy-Build, lazy, nur dort); Anwendungsfälle in `features/media`. Bildschirme: Reiter Abdeckung, Editor und PDF-Ansicht unter `ui/screens/erstellen` und `ui/screens/pdf`, Zoom `ui/useZoomPan.ts`, Fläche `ui/components/CoverSurface`. Vorschauen unter `/styleguide/abdeckung/<Variante>` für `tests/e2e/abdeckung.spec.ts`; Demo-PDF aus `npm run demo:pdf`, Demo-Skript in den Testdaten.
- Browser-Version (M7, ADR-011): `domain/device` (Umgebung iOS/Desktop/Android, Sperrbild nur iOS-Tab, Speichern als Download auf dem Desktop, Texte, Kürzel-Regeln), `ui/useKeys.ts` bindet Kürzel (schweigt in Feldern und bei offenem Sheet), Rad, Zeilen und Safari-Geste in `domain/media/viewport.ts` und `ui/useZoomPan.ts`. `features/app/install.ts` liefert `needsInstall()` und `currentEnvironment()`. Vorschauen (Designvergleich) nehmen immer die Touch-Texte. Playwright hat Desktop-Projekte (`*-desktop`, 1440 × 900, ohne Touch, ohne Design-Vergleiche); lokal `--project=chromium-desktop`. Firefox und WebKit laufen nur in der CI.
- Bildvergleich in Chromium läuft mit `--disable-lcd-text` (`playwright.config.ts`): Ein `<dialog>` wird in eigener Ebene mit Graustufen-Glättung gezeichnet, die Design-Seiten mit Farbsäumen. Bewusste Abweichungen vom Design stehen in `FIXES` (`tests/e2e/design.ts`).
- Beim Design-Vergleich: Elemente, die im Design ohne `border-box` mit Rand gezeichnet sind, bekommen `box-sizing: content-box`, damit die Größe auf jeder Bildschirmdichte stimmt. Das Design lässt die Zeilenhöhe auf „normal“: Bildschirme aus dem Design setzen `line-height: normal`.

## Stand

Siehe `docs/ARCHITEKTUR.md` (Status-Zeile) und `docs/folien/projekt.md` (Folie „Stand heute“).
