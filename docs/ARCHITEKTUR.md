# Juri: Architektur, Rückfragen, Plan

Stand: 28.09.2026 · Status: **M1 (Daten, Profil, Backup) umgesetzt, wartet auf Review und Gerätetest; nächster Schritt M2** · Grundlage: Technisches Briefing und die 23 Screens in `design/` (Quelle: Design-Canvas „Juri“)

---

## 1. Architektur-Zusammenfassung

**Grundsatz.** Statische, offline-first PWA. Der Host liefert nur Code, Nutzerdaten liegen ausschließlich in IndexedDB auf dem Gerät und verlassen es nur als Datei, die der Nutzer selbst teilt. Die Origin (Domain) ist Teil der Datenidentität: IndexedDB, Service Worker und der persist()-Status hängen an ihr. Ein späterer Domainwechsel bedeutet für jeden Nutzer Export und Re-Import. Entschieden ist deshalb von Anfang an eine feste Adresse: `https://svenf-png.github.io/Juri/` (Frage 1).

**Schichten** (Abhängigkeiten nur in Pfeilrichtung, per ESLint-Importregeln erzwungen):

```
ui/         Screens, Komponenten, CSS-Animationen        -> features
features/   Anwendungsfälle als Hooks/Services           -> domain, data, platform
domain/     reines TS: Scheduler, Session, Fristen,      -> nichts (Uhr und Zufall werden injiziert)
            Serie, Heatmap, Meilensteine, Merge,
            Cloze-Parser, .juri-Schemas (zod)
data/       Dexie, Repositories, Migrationen, Blobs      -> domain (nur Typen)
platform/   Web Share, Datei-Input, persist/estimate,    -> Browser-APIs
            Install-Erkennung, Canvas, pdf.js-Adapter
```

**Kernentscheidungen**

- **Stack:** Vite, React, TypeScript strict, React Router, Dexie, ts-fsrs 5.x (MIT), pdfjs-dist (lazy geladen), fflate, zod, date-fns mit de-Locale, Vitest, Playwright (WebKit). Versionen werden in M0 nach Kompatibilitätsprüfung gepinnt.
- **Abweichung vom Vorschlag (ADR-001):** keine motion-Bibliothek. Alle Animationen im Design sind CSS-Keyframes und -Transitions mit festen Kurven und Dauern; ich übernehme sie 1:1 als CSS. Das ist exakter, kleiner und über eine zentrale reduced-motion-Regel abschaltbar. Styling über CSS Modules und Token-Variablen, kein Utility-Framework, weil das Design bewusst krumme Werte nutzt (12,5 px, Gewicht 650/750/780, 1,5 px Ränder).
- **Datenmodell** nach Briefing 5.3, mit Ergänzungen: `dayStats` (Tagesaggregate), `meta` (letztes Backup, Onboarding-Flags), `cards.note` (siehe Frage 5), `cards.originHash` (Konflikterkennung beim Merge), Tags als normalisierte Strings statt `tagIds`, Medien als ArrayBuffer statt Blob (ADR-002). Schema-Versionen, Migrationen und Backup-Format: ADR-006.
- **Scheduler (ADR-004):** Jedes reviewItem führt FSRS-Zustand und Leitner-Fach samt eigener Fälligkeit parallel; jede Bewertung aktualisiert beide. `due` ist ein denormalisierter Index für den aktiven Algorithmus, ein Wechsel schreibt nur diesen Index neu, es geht nichts verloren. Undo stellt den vollständigen Vorzustand aus dem reviewLog wieder her.
- **Fristen ändern keine gespeicherten Daten:** Das effektive Fälligkeitsdatum (Deckelung, Endspurt) wird zur Laufzeit aus Algorithmus-Fälligkeit und aktiven Fristen berechnet. Nach Ablauf gilt automatisch wieder der normale Rhythmus.
- **Lernsession** als reine Zustandsmaschine in `domain/` (Queue, Wiedereinreihen, Undo, Bündelung von Lücken einer Karte). Die UI rendert nur Zustände und Übergänge.
- **Fortschritt:** Ereignis-Log (append-only) und Tagesaggregate werden in derselben Transaktion geschrieben. Tagesgrenze 04:00. Meilensteine deklarativ, Freischaltung idempotent (genau einmal).
- **Austausch:** `.juri` = ZIP. Import = Entpacken mit Limits, zod-Validierung, Merge-Plan als reine Funktion, Bestätigung, eine Transaktion. Inhalte werden nie als HTML gerendert; Markdown-lite über eigenen Parser direkt zu React-Elementen. High fives laufen über ein Transport-Interface (heute Datei, später optional Relay).
- **PWA:** vite-plugin-pwa, Precache von Shell, Fonts und pdf.js-Worker, Update-Hinweis statt stillem Reload, keine Nutzerdaten im Cache, CSP ohne fremde Origins.
- **Fonts:** Bricolage Grotesque (inklusive opsz-Achse, die das Design über Google Fonts nutzt) und Figtree als variable woff2 über Fontsource gebündelt, OFL-Lizenzen liegen bei.

---

## 2. Rückfragen

### Entscheidungen vom 28.09.2026

| #   | Thema                     | Entscheidung                                                                                                                                      | Folge für die Umsetzung                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hosting                   | **GitHub Pages unter `svenf-png.github.io/Juri`** (zunächst mit eigener Domain gewählt; da keine vorhanden ist, die kostenlose github.io-Adresse) | Deploy per GitHub Actions ohne gespeichertes Secret, Basis-Pfad `/Juri/` für App, Manifest und Service Worker, CSP per Meta-Tag. Bedingung: keine weiteren GitHub-Pages-Projekte im Account `svenf-png`, weil sie sich die Origin (Gerätespeicher) mit Juri teilen würden. ADR-005.                                                                                     |
| 2   | Fehlende Screens          | **Ich entwerfe sie im Canvas**                                                                                                                    | Neue Artboards aus dem bestehenden System, gebaut wird erst nach Freigabe, pro Meilenstein.                                                                                                                                                                                                                                                                             |
| 3   | Lückentext                | **Bündeln, eine Bewertung**                                                                                                                       | Fällige Lücken einer Karte in einer Ansicht wie Luecke.dc.html; eine Bewertung wird auf jede fällige Lücke einzeln angewendet.                                                                                                                                                                                                                                          |
| 4   | Schema                    | **Eine Abfrage pro Schema, Lernziel ist auch der Inhalt, nicht nur die Abfolge**                                                                  | Knoten bekommen neben Text und Norm ein optionales Feld „Inhalt“ (Definition, Prüfungsinhalt). Im Lernmodus wird jeder Punkt mit seinem Inhalt aufgedeckt. Die Editor-Erweiterung wird im Canvas entworfen.                                                                                                                                                             |
| 5   | Notizen                   | **Notiz pro Karte**                                                                                                                               | Feld `cards.note` im Mehr-Modus, im Lernen unter der Antwort, beim Export nur mit Schalter.                                                                                                                                                                                                                                                                             |
| 6   | Serie                     | **Alle drei Regeln**                                                                                                                              | Anlegen-Ziel zählt für die Serie; Tage ohne verfügbare Karten brechen sie nicht; Tageswechsel 04:00 in der Gerätezeitzone.                                                                                                                                                                                                                                              |
| 7   | Mindestversion            | **iOS/iPadOS 18+**                                                                                                                                | Testgeräte: iPhone 14 (390 × 844), iPhone 16 Pro Max (440 × 956), iPad Air M4 11 Zoll (1180 × 820 quer, 820 × 1180 hoch), älteres iPad (Modell und iPadOS-Version liefert der Geräte-Check in M0).                                                                                                                                                                      |
| 8   | Lizenz                    | **MIT**                                                                                                                                           | `LICENSE` im Repo (Rechteinhaber vorerst `svenf-png`); Font-Lizenzen (OFL) bleiben daneben bestehen.                                                                                                                                                                                                                                                                    |
| 9   | Dokumentation             | **Doku und Handbuch als folienfähiges Markdown**                                                                                                  | `docs/folien/projekt.md` und `docs/folien/handbuch.md` nach `docs/folien/KONVENTION.md`, per KI in PowerPoint umwandelbar; Screenshots ab M2 automatisch aus der App. Pflege in jedem Meilenstein.                                                                                                                                                                      |
| 10  | Testdaten                 | **Demo-Stapel, Demo-Profil mit Verlauf, großer Datensatz; eigene Testinstanz; echte juristische Inhalte**                                         | Siehe Abschnitt „Testdaten“ unten. Demo-Profil und großer Datensatz nur in der Testinstanz `svenf-png.github.io/Juri/test/`; Demo-Stapel als normale `.juri`-Dateien.                                                                                                                                                                                                   |
| 11  | Prototyp und Arbeitsweise | **Testbarer Prototyp = Lernkern M1 bis M4; ein neuer Chat pro Meilenstein**                                                                       | Budget rund 100 $ Guthaben (Stand nach M0: 28,44 $ verbraucht; M1: Betrag trägt Sven aus der Abrechnung nach, weil `get_session` keinen Kostenwert liefert). Nach jedem Meilenstein wird der Kostenstand gemeldet. Über M5 bis M11 wird nach dem Prototyp anhand des Restbudgets entschieden; teure Teile (M6 PDF/Abdeckung, M10 High fives) können nach hinten rücken. |

### Ursprüngliche Fragen

**1. Hosting und Domain.** Das Repo ist öffentlich, GitHub Pages wäre kostenlos. Aber alle Projektseiten unter `svenf-png.github.io` teilen sich eine Origin, also auch IndexedDB, Speicherquote und persist()-Status mit jeder anderen Pages-Seite dieses Accounts. GitHub Pages erlaubt außerdem keine eigenen HTTP-Header (CSP nur per Meta-Tag). Optionen:

- (a) Cloudflare Pages mit eigener Subdomain, Deploy aus GitHub Actions. **Empfehlung.**
- (b) GitHub Pages mit eigener Domain (löst das Origin-Problem, CSP nur per Meta-Tag).
- (c) GitHub Pages unter `svenf-png.github.io/Juri/` (nicht empfohlen).
  Hast du eine eigene Domain, die dauerhaft bleibt? Für (a) bräuchte ich einmalig ein Cloudflare-Konto von dir und einen API-Token als Repo-Secret.

**2. Screens ohne Design.** Es fehlen: Onboarding (Name), Install-Anleitung, Import-Anleitung, Einstellungen außerhalb „Lernrhythmus“ (Profil, Speicher/Persistenz, Backup, Tagesziele, Tageswechsel, Pausentag), Stapel anlegen/bearbeiten/löschen, Rechtsgebiet anlegen, Karte bearbeiten/löschen, Abdeckungs-Editor (Masken aufziehen), Merge-Konflikt, Update-Hinweis, Backup-Erinnerung, leere Zustände und Fehler, Stapelwahl beim Export, iPad-Varianten von Fristen/Teilen/Einstellungen/High fives, iPad hochkant und Split View. Vorschlag: Ich entwerfe sie strikt aus dem vorhandenen System, lege sie als neue Artboards in deinen Canvas und baue sie erst nach deiner Freigabe. Oder lieferst du sie?

**3. Lückentext im Lernmodus.** Das Briefing will jede Lücke (cN) als eigene Abfrage. Lernen.dc.html zeigt eine Lücke pro Karte (umdrehen, bewerten), Luecke.dc.html dagegen „Lücke 3 von 4“ mit schrittweisem Aufdecken, „Alle zeigen“ und „Nächste Lücke“, ohne Bewertungsleiste. Vorschlag: Jede Lücke bleibt ein eigenes reviewItem. Sind mehrere Lücken derselben Karte heute fällig, bündelt die Session sie zu einer Ansicht wie Luecke.dc.html (fällige verdeckt, nicht fällige sichtbar), danach eine Bewertung, die auf jede fällige Lücke einzeln angewendet wird. Ist nur eine fällig, läuft es wie Lernen.dc.html. Einverstanden, oder soll jede Lücke einzeln bewertet werden?

**4. Schema: eine Abfrage oder eine pro Knoten?** Das Briefing nennt Schema-Knoten als subKey, die Designs zeigen das Schema als Ganzes mit schrittweisem Aufdecken (Schema.dc.html). Vorschlag: ein reviewItem pro Schema, weil das Lernziel der Aufbau in der richtigen Reihenfolge ist. Aufdecken Punkt für Punkt, danach eine Bewertung. Abfragen einzelner Knoten später optional.

**5. „Eigene Notizen mitschicken“.** Teilen.dc.html hat den Schalter, im Datenmodell und in den Editoren gibt es aber kein Notizfeld. Vorschlag: optionales Feld „Notiz“ pro Karte im Mehr-Modus, im Lernen unter der Antwort, beim Export nur mit Schalter. Oder meinst du etwas anderes (z. B. eine Notiz pro Stapel)?

**6. Serie und Tagesgrenze.**

- (a) Zählt ein Tag auch, wenn nur das Anlegen-Ziel erreicht wurde? Vorschlag: ja, Anlegen soll ausdrücklich belohnt werden.
- (b) Tage, an denen weder Karten fällig noch neue verfügbar sind, unterbrechen die Serie nicht (zählen aber nicht mit). Vorschlag: ja.
- (c) Das Briefing nennt fest Europe/Berlin. Bei einem LL.M. im Ausland läge 04:00 Berliner Zeit mitten im Tag. Vorschlag: Gerätezeitzone, Tageswechsel 04:00 lokal.

**7. Testgeräte und Mindestversion.** pdf.js nennt für Safari offiziell erst Version 18 als unterstützt. Vorschlag: Mindestens iOS/iPadOS 18, Ziel ist das jeweils aktuelle iOS. Welche Geräte und iOS-Versionen hast du? Einige Punkte lassen sich nur auf echter Hardware klären (Geräte-Check in M0), dafür brauche ich dich pro Meilenstein wenige Minuten.

**8. Lizenz.** Das Repo ist öffentlich und hat keine Lizenz, damit gilt „alle Rechte vorbehalten“. Soll das so bleiben, oder soll eine Open-Source-Lizenz (z. B. MIT) gelten?

### Annahmen, die gelten, sofern du nicht widersprichst

- **A1 Touch-Ziele:** Einige Elemente sind im Design kleiner als 44 px (Avatar 40, Frist-Chip 34, Filterchips 38, Stepper 36, „Sichern“ 36, „Mehr“ 34, Sheet-Schließen 40, Heatmap-Umschalter 32). Die sichtbare Größe bleibt wie im Design, die Trefferfläche wird unsichtbar auf mindestens 44 × 44 px erweitert.
- **A2 Kontrast:** Placeholder `#8E8A99` hat auf `#F6F4FB` nur 3,08:1. Ich nutze `#726E7A` (4,55:1, gleicher Farbton). Alle übrigen Textfarben des Designs habe ich nachgerechnet, sie liegen bei mindestens 4,63:1.
- **A3 Tokens:** Das Design nutzt mehr Farben als die Token-Liste im Briefing (`#5B34D1` Link, `#E4DDF7`, `#DCD6EA`, `#D6D1E2`, `#CFC8E0`, `#A08BEA`, `#B3AEC0`, `#F1EEF7`, `#F3F1F8`, `#FBFAFD`). Ich übernehme sie als benannte Tokens.
- **A4 „Nochmal“ in der Session:** Die Karte kommt wieder, bis sie mindestens „Schwer“ bekommt, frühestens nach drei anderen Karten oder wenn ihr Lernschritt fällig ist. (Das Design-Demo reiht nur einmal neu ein.)
- **A5 Tagesziel Lernen** zählt die erste Bewertung je Abfrage und Tag („24 von 24 Karten“). Der Zähler „Wiederholungen“ in Erfolge zählt jede Bewertung.
- **A6 Leitner mit vier Knöpfen:** Nochmal: Fach 1. Schwer: Fach bleibt. Gut und Leicht: Fach +1.
- **A7 Abdeckung:** „Alle verdeckt, eine gefragt“ wie Abdeckung.dc.html, jede Maske eine eigene Abfrage.
- **A8 iPad-Breiten:** unter 768 px iPhone-Layout, 768 bis 1099 px Sidebar mit einspaltigem Inhalt, ab 1100 px die iPad-Designs. Nicht eigens gestaltete Screens stehen auf dem iPad mittig in der Inhaltsspalte.
- **A9 Erfolgs-Snapshot und High fives** reisen standardmäßig in jeder `.juri`-Datei mit, abschaltbar in den Einstellungen.
- **A10 Import-Dialog ohne `accept`-Filter:** iOS graut Dateien mit unbekannter Endung sonst aus. Die Prüfung erfolgt nach der Auswahl (ZIP-Signatur, manifest, zod).
- **A11 Keine Seed-Daten in der echten App:** Die Produktiv-App startet leer. Testdaten gibt es nach Entscheidung 10: Demo-Stapel zum Import und Demo-Profil nur in der Testinstanz.
- **A12 Referenz-Screenshots** rendere ich selbst aus `design/` mit festen Fixture-Daten. Vergleich mit Toleranz, dazu exakte Prüfung der Tokens über berechnete Styles.
- **A13 Safari-Tab vs. installierte App:** Auf iPhone und iPad haben Safari und die Home-Bildschirm-App getrennte Speicher. Im Safari-Tab zeigt Juri deshalb zuerst die Install-Anleitung und legt dort keine Daten an.
- **A14 Statusleiste:** `apple-mobile-web-app-status-bar-style = default` (dunkle Schrift). `black-translucent` scheidet aus, weil die Schrift dann weiß ist und auf dem hellen Design unlesbar wäre. Ob sich der Hintergrund der Lern-Screens (`#F6F4FB`) per `theme-color` bis in die Statusleiste ziehen lässt, prüfe ich im Geräte-Check; sonst bleibt oben ein weißer Streifen.

---

## 3. Verfeinerter Plan

Aufwand in Personentagen (PT) für eine erfahrene Einzelperson. Jeder Meilenstein endet mit: Tests grün, kurze Demo-Notiz, Doku und Folien aktualisiert (inkl. Screenshots), Commit, Liste offener Punkte. Ein PR pro Meilenstein.

Hinweis: Lighthouse hat die PWA-Kategorie mit Version 12 (April 2024) entfernt. Den „Lighthouse-PWA-Check“ ersetze ich durch eigene Playwright-Prüfungen (Manifest, Icons, Service Worker, Offline-Start) plus Lighthouse für Performance, Accessibility und Best Practices.

| #   | Meilenstein                 | Inhalt                                                                                                                                                                                                                                                                                                 | Abnahme                                                                                      | PT (Briefing → neu) |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------- |
| M0  | Fundament + Geräte-Check    | Toolchain, CI, ADR-001 bis 005, Tokens, Fonts, `/styleguide`, Deploy-Pipeline (GitHub Pages) für App und Testinstanz `/Juri/test/`, Seite `/geraetecheck` in der Testinstanz (persist, estimate, standalone, Web Share mit `.juri`, Dateiauswahl, 50-MB-Blob in IndexedDB, HEIC, `.ics`, Statusleiste) | leere App installierbar und offline startbar; Geräte-Check-Ergebnisse von deinem iPhone/iPad | 0,5 → 1,5           |
| M1  | Daten, Profil, Backup       | Dexie-Schema, Repositories, Migrationstest, Onboarding, persist(), Speicheranzeige, Backup Export/Import                                                                                                                                                                                               | Daten überleben Neustart; Backup-Roundtrip identisch                                         | 1 → 2               |
| M2  | Shell, UI-Kit, Heute        | Tab-Bar, Sidebar, Routing, Safe Areas, alle Basiskomponenten, Motion, Reduced Motion                                                                                                                                                                                                                   | Heute auf iPhone/iPad pixelnah zu Main/iPadHeute (Screenshot-Test)                           | 1,5 → 2,5           |
| M3  | Karten und Stapel           | Areas, Decks m:n, Tags, Frage/Antwort und Lückentext, Einfach/Mehr, Bibliothek, Stapel-Detail, iPad Master-Detail; Ereignis-Log ab hier                                                                                                                                                                | Stapel in ZR und ÖR in beiden Gruppen; Cloze mit 3 Lücken ergibt 3 reviewItems               | 2 → 3               |
| M4  | Lern-Engine                 | ts-fsrs, Leitner, Rhythmus-Einstellungen, Session-Maschine, Flip, Bewertung, Wischen, Undo, Tastatur, Session-Ende                                                                                                                                                                                     | Scheduler-Tests inkl. Algorithmuswechsel; Flow wie Lernen.dc.html; Intervallvorschau korrekt | 2,5 → 4             |
| M5  | Schema und Verknüpfungen    | Schema-Editor inkl. Feld „Inhalt“ pro Punkt, schrittweises Aufdecken mit Inhalt, Link-Sheet, Integrität bei Löschung                                                                                                                                                                                   | Editor und Lernmodus wie SchemaEditor/Schema                                                 | 1,5 → 2             |
| M6  | Medien, PDF, Abdeckung      | Upload, Verkleinern, pdf.js-Viewer, Markierung zu Karte, iPad-Split, Abdeckungs-Editor, Quelle an Karte                                                                                                                                                                                                | 50-seitiges PDF flüssig auf iPad; Masken sitzen nach Zoom exakt                              | 3 → 5               |
| M7  | Fristen                     | CRUD, Deckelung, Endspurt, Countdown, „x % sitzen sicher“, `.ics`-Export                                                                                                                                                                                                                               | Grenzfall-Tests aus B8                                                                       | 1 → 1,5             |
| M8  | Fortschritt                 | Tagesaggregate, Heatmap 12/26 Wochen, Rekord, Serie mit Pausentag, Tagesziele, Meilensteine, Feiern                                                                                                                                                                                                    | deterministische Tests für Serie und Quantil-Stufen                                          | 2 → 2,5             |
| M9  | Teilen und Import           | `.juri` Export/Import, zod, Merge „Aktualisieren/Als Kopie“, Konflikte, Web Share, Import-Anleitung                                                                                                                                                                                                    | Roundtrip; Merge behält Fortschritt; manipulierte Datei sauber abgelehnt                     | 2 → 3               |
| M10 | High fives                  | Kontakte aus Importen, geben/bekommen, Bildkarte per Canvas + Web Share, Mitreise, Gruß-Datei                                                                                                                                                                                                          | Flow wie HighFive.dc.html                                                                    | 1 → 1,5             |
| M11 | Feinschliff, QA, Deployment | Update-Flow, Install-Hinweis, VoiceOver-Grundcheck, Kontraste, 5.000-Karten-Performance, README, Geräte-Testliste                                                                                                                                                                                      | manuelle Testliste auf iPhone und iPad abgehakt                                              | 1,5 → 3             |
|     | **Summe**                   |                                                                                                                                                                                                                                                                                                        |                                                                                              | **19 → 31,5**       |

Dazu rund 2 PT für die fehlenden Screens (Entscheidung 2) und rund 1,5 PT für Testdaten und Testinstanz (Entscheidung 10). **Realistisch: etwa 35 PT.** Mehraufwand gegenüber dem Briefing entsteht vor allem durch Pixelnähe auf 23 Screens plus rund 15 ungestaltete Zustände, ≥ 90 % Testabdeckung in `domain/`, Screenshot-Tests mit Referenzen, PDF und Abdeckung unter iOS-Speichergrenzen sowie Merge mit Konflikten. Der Engpass sind deine Freigaben und die Gerätetests, nicht die Implementierung.

### Testdaten

**Drei Arten, alle aus einem deterministischen Generator** (gleiche Eingabe ergibt immer dieselben Daten). Derselbe Generator speist Unit-Tests, E2E- und Screenshot-Tests, die Doku-Bilder und die Testinstanz.

| Testdaten                   | Inhalt                                                                                                                                                                                      | Wo                                                                     | ab                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Demo-Stapel**             | Je Rechtsgebiet 1 bis 2 Stapel mit Karten aller vier Typen, ohne Lernfortschritt; ein Stapel in zwei Rechtsgebieten (m:n)                                                                   | `.juri`-Dateien, normal importierbar in jede Instanz, einzeln löschbar | M3 (Frage, Lücke), M5 (Schema), M6 (Abdeckung), M9 (als `.juri`) |
| **Demo-Profil mit Verlauf** | 26 Wochen Lernhistorie mit Rekordtag und Pausentagen, laufende Serie, freigeschaltete und fast erreichte Meilensteine, Fristen (eine im Endspurt, eine ohne Datum), Kontakte mit High fives | nur Testinstanz, Menü „Testdaten laden / zurücksetzen“                 | M1 (Grundgerüst), ausgebaut in M7, M8, M10                       |
| **Großer Datensatz**        | 5.000 Karten über viele Stapel, 50-seitiges PDF                                                                                                                                             | nur Testinstanz                                                        | M6 (PDF), M11 (5.000 Karten)                                     |

**Testinstanz** `svenf-png.github.io/Juri/test/`: Build derselben App mit eigener Datenbank, eigenem Service-Worker-Bereich (die echte App schließt `/Juri/test/` von ihrem Offline-Fallback aus), Name „Juri Test“, abgewandeltem Icon und dauerhaftem Hinweisband. Als zweites Icon installierbar; die echten Lerndaten bleiben unberührt. Die Geräte-Check-Seite aus M0 zieht dorthin um. Aufbau ab M0, Menü ab M1.

**Inhalte:** Echte juristische Inhalte, als Demo gekennzeichnet. Definitionen und Prüfungsschemata nach den Beispielen aus den Designs (u. a. Gewahrsam, Betrug, Anfechtungsklage, Amtshaftung, Versäumnisurteil, gutgläubiger Erwerb). Normtexte und Demo-PDFs aus Gesetzestexten, die als amtliche Werke nach § 5 Abs. 1 UrhG gemeinfrei sind. Alle Inhalte liegen als lesbare Dateien in `testdaten/`, damit du sie fachlich prüfen kannst, bevor sie in Demo-Stapel übernommen werden.

### Risiken

| Risiko                                                                                | Folge                                                                  | Gegenmaßnahme                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safari-Tab und Home-Bildschirm-App haben getrennte Speicher                           | Karten „verschwinden“ nach der Installation                            | A13: im Tab keine Daten anlegen, zuerst installieren                                                                                                                                                |
| Eviction trotz persist() bei Speicherdruck, Löschen des App-Icons                     | Datenverlust                                                           | persist-Status sichtbar; Backup-Erinnerung nach 14 Tagen **oder** 50 neuen Karten; Backup direkt per Teilen-Menü in „Dateien“/iCloud Drive; Verhalten beim Löschen des Icons im Geräte-Check prüfen |
| Web Share akzeptiert den Dateityp `.juri` evtl. nicht                                 | Export über Teilen-Menü scheitert                                      | `canShare`-Test, Fallback Download bzw. alternativer MIME-Typ; Klärung in M0                                                                                                                        |
| Dateiauswahl graut `.juri` aus                                                        | Import unmöglich                                                       | A10: kein `accept`-Filter                                                                                                                                                                           |
| pdf.js-Speicher auf iOS (Canvas-Grenzen)                                              | Abstürze bei großen PDFs                                               | nur sichtbare Seiten rendern, Canvas freigeben, Pixeldichte begrenzen, Test mit 50 Seiten auf iPad                                                                                                  |
| ts-fsrs 6 ist in Beta                                                                 | Breaking Changes                                                       | 5.x pinnen, Zugriff nur über eigenen Adapter                                                                                                                                                        |
| Adresswechsel nach Start (z. B. später eigene Domain)                                 | Nutzer müssen Backup exportieren und neu importieren                   | feste github.io-Adresse gewählt; ein Wechsel nur mit Umzugshinweis in der App                                                                                                                       |
| Weitere Pages-Projekte im Account `svenf-png`                                         | teilen sich Gerätespeicher und persist()-Status mit Juri               | keine weiteren GitHub-Pages-Projekte in diesem Account                                                                                                                                              |
| Übernahme des GitHub-Kontos                                                           | ein manipuliertes Update könnte lokale Daten aller Nutzer auslesen     | Zwei-Faktor bzw. Passkey, Regel für `main` (nur per PR, kein Force-Push)                                                                                                                            |
| Lieferkette (npm-Pakete, Actions)                                                     | fremder Code in der App                                                | wenige Abhängigkeiten, Lockfile, Dependabot, Actions auf Commit-Hashes gepinnt, minimale Workflow-Rechte                                                                                            |
| Einbetten in fremde Seiten                                                            | Pages erlaubt keine Header, `frame-ancestors` wirkt per Meta-Tag nicht | App prüft selbst, ob sie eingebettet ist, und rendert dann nicht                                                                                                                                    |
| Fachliche Fehler in Demo-Inhalten                                                     | falsches Lernen, wenn jemand Demo-Stapel ernst nimmt                   | als Demo gekennzeichnet, Normtexte wörtlich aus amtlichen Quellen, Inhalte als prüfbare Dateien in `testdaten/`, Stichprobe durch dich                                                              |
| Verwechslung von Testinstanz und echter App                                           | Lernen in der falschen App                                             | eigener Name „Juri Test“, abgewandeltes Icon, dauerhaftes Hinweisband, getrennte Datenbank                                                                                                          |
| Teilen-Menü verweigert sich nach längerer Vorbereitung (Nutzeraktivierung abgelaufen) | Backup lässt sich nicht sichern                                        | Export in zwei Schritten (ADR-006), Fallback Download; Verhalten im Gerätetest M1 prüfen                                                                                                            |
| Absender in `.juri` nicht authentifiziert                                             | gefälschte High fives möglich                                          | für V1 akzeptiert (reine Anzeige, kein Zugriff), dokumentiert                                                                                                                                       |
| Screenshot-Vergleich täuscht Präzision vor                                            | Abweichungen fallen durch                                              | feste Fixtures, Toleranz, zusätzlich Token-Prüfung per berechnetem Style                                                                                                                            |

### Stellungnahme zu Briefing Abschnitt 9

- **iOS-Speicher:** Seit Safari 17 bekommt eine Home-Bildschirm-App die Quote der Browser-App (bis ca. 60 % des Speichers), und WebKit gewährt persist() heuristisch, u. a. für Home-Bildschirm-Apps. Das schützt vor automatischer Eviction, nicht vor Nutzeraktionen (Verlauf löschen, App entfernen) oder Geräteverlust. Die Backup-Erinnerung ist daher notwendig, aber allein zu schwach: Ich ergänze den Auslöser „50 neue Karten“ und mache das Backup zu einem Tipp ins Teilen-Menü („In Dateien sichern“, damit iCloud Drive). Die 7-Tage-Regel betrifft installierte Apps nicht, sie haben einen eigenen Nutzungszähler.
- **Kein Share Target:** Bestmöglicher Flow: Im Bereich „Empfangen“ ein großer Knopf „Datei öffnen“, der den Datei-Dialog startet (iOS zeigt dort „Zuletzt“ zuerst, frisch gesicherte Dateien stehen also oben). Einmalige, illustrierte 3-Schritt-Anleitung: (1) in AirDrop/Nachrichten „In Dateien sichern“, (2) Juri öffnen, (3) „Datei öffnen“. Zusätzlich im Export-Begleittext ein Satz für den Empfänger, wie er importiert.
- **Keine Push-Erinnerungen:** (1) `.ics`-Export: Fristen als Kalendertermine mit Erinnerung, optional eine wiederkehrende „Lernzeit“. Der Kalender erinnert, ganz ohne Server. (2) App-Badge (Badging API, iOS 16.4+ für Home-Bildschirm-Apps): zeigt die Zahl fälliger Karten am Icon, braucht aber die Mitteilungs-Erlaubnis und aktualisiert sich nur, während Juri offen ist. Daher nur optional. Ob `.ics` aus der installierten App sauber in den Kalender geht, prüft der Geräte-Check.
- **FSRS-Optimierung:** Anki verlangt seit Version 24.06 keine Mindestzahl mehr; Benchmarks im Anki-Tracker deuten darauf hin, dass sich Optimierung schon ab wenigen Dutzend Wiederholungen lohnt. Vorschlag: Das reviewLog enthält ab Tag 1 alle nötigen Felder. Die Optimierung (WASM-Paket `fsrs-browser`, lazy geladen) biete ich nach V1 an, zuerst ab 400 Wiederholungen, dann bei jeder Verdopplung, und übernehme neue Parameter nur, wenn sie auf den eigenen Daten besser vorhersagen.
- **HEIC:** Safari 17 dekodiert HEIC nativ (`<img>`, `createImageBitmap`). Juri dekodiert daher mit Bordmitteln und speichert als JPEG (max. 2000 px Kante); WebP nur, wenn der Browser es beim Kodieren nachweislich liefert. Gelingt das Dekodieren nicht, erscheint ein Hinweis.
- **Beispielinhalte:** Die Platzhalter aus den Designs werden nicht in die echte App eingebaut (A11). Auf deinen Wunsch gibt es stattdessen gezielte Testdaten (Entscheidung 10, Abschnitt „Testdaten“).

---

## 4. Ordnerstruktur

```
Juri/
├── .github/workflows/      ci.yml (Lint, Typecheck, Unit, E2E, Build), deploy.yml
├── design/                 Referenz: .dc.html-Screens und canvas.json, unverändert aus dem Canvas
├── docs/
│   ├── README.md           Übersicht über alle Dokumente
│   ├── ARCHITEKTUR.md      dieses Dokument
│   ├── folien/             projekt.md, handbuch.md, KONVENTION.md (folienfähig, per KI zu PowerPoint)
│   ├── bilder/             Screenshots für Doku und Folien, ab M2 automatisch
│   ├── adr/                001-stack, 002-speicher-ohne-server, 003-dateiformat-juri,
│   │                       004-scheduler-zustaende, 005-hosting, 006-datenbank-und-backup
│   └── geraete-testliste.md
├── public/                 App-Icons, apple-touch-icon, Lizenzen (OFL)
├── scripts/                render-design-refs.ts (Referenz-Screenshots), build-icons.ts, build-testdaten.ts
├── testdaten/              Inhalte der Demo-Stapel als prüfbare JSON-Dateien, Quellen der Normtexte, Demo-Bilder
├── src/
│   ├── app/                Einstieg, Router, Provider, Layouts (Tab-Bar/Sidebar), Fehlergrenzen
│   ├── ui/
│   │   ├── tokens/         tokens.ts (einzige Quelle), tokens.css, fonts.css
│   │   ├── components/     Button, Chip, Segmented, Switch, Stepper, Sheet, Toast,
│   │   │                   ProgressSegments, Ring, Heatmap, Badge, RatingBar, CardFace,
│   │   │                   TabBar, Sidebar
│   │   ├── motion/         Keyframes, Reduced Motion, Wisch-Geste
│   │   └── screens/        heute, lernen, stapel, erstellen, schema, teilen, erfolge,
│   │                       high-five, fristen, rhythmus, einstellungen, onboarding,
│   │                       styleguide, geraetecheck
│   ├── features/           study, create, decks, deadlines, progress, share, kudos,
│   │                       settings, media, backup
│   ├── domain/             scheduler/ (fsrs, leitner, queue, session), deadlines/,
│   │                       progress/ (day, streak, heatmap, milestones), cards/
│   │                       (cloze, schema-tree, occlusion), merge/, format/ (zod),
│   │                       text/ (markdown-lite); Unit-Tests jeweils daneben (*.test.ts)
│   ├── data/               db.ts, migrations.ts, repositories/, backup.ts, live.ts
│   ├── platform/           share, file-input, storage, install, clock, image, pdf/
│   ├── demo/               Generator für Demo-Profil und großen Datensatz, Menü der Testinstanz (nur im Test-Build)
│   └── sw/                 service-worker.ts
├── tests/
│   ├── e2e/                Playwright (WebKit): iPhone 14, iPhone 16 Pro Max, iPad Air 11 quer und hoch
│   ├── visual/             Referenz-Screenshots aus design/
│   └── fixtures/           Test-Stapel, gültige und manipulierte .juri-Dateien
├── index.html, vite.config.ts, tsconfig.json, eslint.config.js,
├── vitest.config.ts, playwright.config.ts, package.json
└── README.md               Installation auf iPhone/iPad, Entwicklung, Deployment
```

---

## Quellen

- WebKit: [Updates to Storage Policy (Safari 17)](https://webkit.org/blog/14403/updates-to-storage-policy/)
- WebKit: [Full Third-Party Cookie Blocking and More (7-Tage-Regel, Home-Bildschirm-Apps)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- WebKit: [Web Push for Web Apps on iOS and iPadOS (16.4)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- WebKit: [Badging for Home Screen Web Apps](https://webkit.org/blog/14112/badging-for-home-screen-web-apps/)
- WebKit: [WebKit Features in Safari 17.0 (HEIC)](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- WebKit Bugzilla: [181849, Home-Bildschirm-Apps teilen keinen Speicher mit Safari](https://bugs.webkit.org/show_bug.cgi?id=181849)
- 9to5Mac: [iOS 17.4 entfernt Home-Bildschirm-Web-Apps in der EU doch nicht](https://9to5mac.com/2024/03/01/apple-home-screen-web-apps-ios-17-eu/)
- caniuse: [Web Share API](https://caniuse.com/web-share), [canShare mit Dateien](https://caniuse.com/mdn-api_navigator_canshare_data_files_parameter)
- MDN-Content: [Issue 32019, Dateien teilen auf iOS nur mit reinem `files`-Objekt](https://github.com/mdn/content/issues/32019)
- MDN-BCD: [Issue 26043, iOS ignoriert `accept` mit Dateiendungen](https://github.com/mdn/browser-compat-data/issues/26043)
- pdf.js: [FAQ, unterstützte Browser (Safari 18+)](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions)
- Lighthouse: [Issue 15535, PWA-Kategorie entfernt](https://github.com/GoogleChrome/lighthouse/issues/15535)
- Anki: [Issue 3094, FSRS-Mindestmenge](https://github.com/ankitects/anki/issues/3094), [Forum: Wie viele Wiederholungen für Optimierung](https://forums.ankiweb.net/t/how-many-reviews-for-accurate-optimization/53320)
- GitHub Docs: [GitHubs Pläne (Pages)](https://docs.github.com/get-started/learning-about-github/githubs-products)
- Statusleiste: [Alex Wendland, Translucent status bar in PWAs on iOS](https://blog.alexwendland.com/2020-09-25-translucent-status-bar-in-pwas-on-ios/)
