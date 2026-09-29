---
titel: Juri
untertitel: Karteikarten für das Referendariat. Idee, Design, Technik und Fahrplan
zielgruppe: Interessierte, Mitwirkende, Entscheider
stand: 2026-09-29
version: 0.7 (nach M6)
---

# Die Idee

Eine Lern-App, die so ruhig und klar ist wie ein gutes Skript.

## Worum es geht

- Karteikarten-App für das juristische Referendariat
- Läuft auf iPhone und iPad, installiert vom Home-Bildschirm
- Minimalistisch und ästhetisch, motivierend statt fordernd
- Alle Daten bleiben auf dem eigenen Gerät
- Stapel teilen von Mensch zu Mensch, als Datei

> **Notizen:** Juri richtet sich an Referendarinnen und Referendare, die viel Stoff in wenig Zeit wiederholen müssen. Die App soll in Pausen und unterwegs funktionieren, ohne Konto und ohne Cloud.

## Was Juri kann

<!-- layout: zwei-spalten -->

- **Vier Kartentypen:** Frage und Antwort, Lückentext, Prüfungsschema, PDF oder Bild mit Abdeckung
- **Lernrhythmus:** FSRS (modernes Wiederholungsverfahren) oder klassischer Leitner-Kasten
- **Fristen:** Examen, Klausur, LL.M. oder eigene; der Rhythmus endet rechtzeitig davor
- **Erfolge:** Serie, Heatmap, Rekordtage, Meilensteine
- **Teilen:** Stapel als `.juri`-Datei per AirDrop, Nachrichten oder Mail
- **High fives:** kleine Anerkennung unter Lernpartnern

> **Notizen:** Die vier Kartentypen decken ab, wie Juristinnen und Juristen tatsächlich lernen: Definitionen, Normtexte mit Lücken, Prüfungsaufbauten und Übersichten aus Skripten.

# Prinzipien

## Lokal statt Cloud

- Kein Konto, kein Login, kein Server für Nutzerdaten
- Karten, Fortschritt und Profil liegen nur auf dem Gerät
- Sicherung per Backup-Datei, z. B. in iCloud Drive
- Lernfortschritt bleibt beim Teilen immer privat

> **Notizen:** Ohne Server gibt es keine Datenbank, die angegriffen oder verkauft werden kann, und keine laufenden Kosten. Die Kehrseite: Sicherungen liegen in der Verantwortung der Nutzer. Juri erinnert deshalb regelmäßig an ein Backup.

## Positiv statt Druck

- Keine Verlust-Botschaften, keine Ranglisten
- Ein freier Pausentag pro Woche hält die Serie
- Auch das Anlegen von Karten wird belohnt
- Kleine Feiern: Ring, Haken, Funken, leuchtender Tag

> **Notizen:** Das Referendariat ist belastend genug. Juri motiviert über sichtbaren Fortschritt und Anerkennung, nicht über Angst, etwas zu verlieren.

## Teilen von Mensch zu Mensch

- Stapel werden als Datei verschickt, nicht über einen Katalog
- Empfänger wählen: aktualisieren oder als Kopie anlegen
- Beim Aktualisieren bleibt der eigene Fortschritt erhalten
- High fives und Erfolge reisen in den Dateien mit

# Design

## Farben

<!-- layout: tabelle -->

| Rolle          | Farbe        | Wert      |
| -------------- | ------------ | --------- |
| Aktion, Akzent | Veilchen     | `#6A3FE0` |
| Text, Auswahl  | Tinte        | `#17141F` |
| Sekundärtext   | Grau-Violett | `#6B6678` |
| Flächen        | Hell         | `#F6F4FB` |
| Linien         | Sehr hell    | `#EFECF5` |

> **Notizen:** Nur helles Design, kein Dark Mode. Alle Textfarben erreichen mindestens ein Kontrastverhältnis von 4,5 zu 1. Die Bewertungsknöpfe unterscheiden sich über Helligkeit statt über Ampelfarben.

## Schrift und Form

- **Bricolage Grotesque** für Überschriften, Zahlen und Kartenfragen
- **Figtree** für Antworten und Bedienelemente
- Runde Formen: Karte 28 px, Knopf 20 px, Feld 14 bis 16 px
- Beide Schriften unter freier Lizenz (OFL), in der App mitgeliefert

## Bewegung

- Karte umdrehen: 620 ms mit leichtem Nachschwung
- Karte wegfliegen: 420 ms, nach rechts oder nach hinten
- Antippen: 180 ms, leichtes Eindrücken
- Erfolg: Ring, dann Haken, dann Funken
- Bei „Bewegung reduzieren“ in iOS sind alle Animationen aus

## So sieht es aus

<!-- layout: bild-gross -->
<!-- status: M2, Bild automatisch aus der App (npm run docs:bilder) mit den Beispieldaten der Designs -->

![Heute auf dem iPad: fällige Karten, Tagesziel, letzte 7 Tage, Fristen](../bilder/heute-ipad.png)

> **Notizen:** Das Bild stammt aus der App, nicht aus dem Design-Werkzeug. Ein Test vergleicht es bei jeder Änderung Pixel für Pixel mit dem Design.

# Technik

## Warum eine Web-App

- Kein App Store nötig, Installation direkt aus Safari
- Ein Code für iPhone, iPad und Desktop-Browser
- Installierte Web-Apps laufen auf iOS offline und im Vollbild
- Grenzen: kein Teilen-Ziel, kein Hintergrund-Sync, Push nur mit Server

> **Notizen:** Seit iOS 17.4 laufen Home-Bildschirm-Web-Apps auch in der EU weiter. Installierte Web-Apps sind von der 7-Tage-Löschregel von Safari ausgenommen. Quellen stehen in docs/ARCHITEKTUR.md.

## Aufbau in Schichten

<!-- layout: tabelle -->

| Schicht         | Aufgabe                                                      |
| --------------- | ------------------------------------------------------------ |
| Oberfläche      | Screens, Komponenten, Animationen                            |
| Anwendungsfälle | Lernen, Erstellen, Teilen, Fristen, Fortschritt              |
| Fachlogik       | Lernalgorithmus, Fristen, Serie, Merge; vollständig getestet |
| Daten           | Lokale Datenbank (IndexedDB), Sicherung                      |
| Plattform       | Teilen, Dateien, Speicher, PDF                               |

> **Notizen:** Die Fachlogik hängt nicht vom Browser ab und wird mit automatischen Tests zu mindestens 90 Prozent abgedeckt.

## Karten, Stapel und Rechtsgebiete

<!-- status: M3 umgesetzt, Modell in docs/adr/007-karten-stapel-und-luecken.md -->

- Ein **Rechtsgebiet** ist ein Etikett; ein Stapel liegt in mindestens einem, gern in mehreren
- Eine **Karte** ist eine Frage, ein Lückentext oder ein Prüfungsschema, später die Abdeckung
- Jede Lücke wird eine **Abfrage** mit fester Kennung: drei Lücken ergeben drei Abfragen
- Jede neue Karte schreibt ein Ereignis; daraus entstehen Tagesziel und Verlauf
- Stapel löschen und Rechtsgebiet löschen folgen Regeln, damit nichts ins Leere zeigt

> **Notizen:** Ein Backup prüft vor dem Einspielen alle Verweise zwischen Rechtsgebieten, Stapeln, Karten und Abfragen. Seit M4 trägt jede Abfrage ihren Lernzustand und wird nach Fälligkeit gezählt.

## Wie der Lernrhythmus funktioniert

<!-- status: M4 umgesetzt (ADR-008) -->

- **FSRS** schätzt für jede Karte, wie sicher sie noch sitzt
- Sie kommt wieder, kurz bevor diese Sicherheit unter das Ziel fällt
- Ziel einstellbar: 85, 90 oder 95 Prozent (Entspannt, Standard, Examen), dazwischen frei
- **Leitner** als Alternative: fünf Fächer mit festen, einstellbaren Abständen
- Jede Bewertung aktualisiert **beide** Verfahren; der Wechsel ändert nur, welches die Fälligkeit bestimmt
- Kein Abstand länger als 180 Tage, „Nochmal“ führt über Lernschritte von 1 und 10 Minuten

> **Notizen:** FSRS (Free Spaced Repetition Scheduler) ist ein offenes Verfahren, das auch Anki verwendet. Juri nutzt die Bibliothek ts-fsrs 5.4 unter MIT-Lizenz, gepinnt und nur über einen eigenen Adapter angesprochen. Streuung der Abstände ist aus, damit die Vorschau auf den Knöpfen genau stimmt.

## Die Lernrunde

<!-- status: M4 umgesetzt -->

- Reine **Zustandsmaschine** ohne Browser: Karte drehen, bewerten, „Nochmal“ nach drei anderen Karten, Rückgängig
- Mehrere fällige Lücken einer Karte erscheinen **gebündelt**, eine Bewertung gilt für jede Lücke
- Fällig heißt: vor dem Ende des Lerntags (4 Uhr); neue Karten bis zum Tageslimit
- Jede Bewertung entsteht in **einer Transaktion**: Lernzustand, Lernlog, Ereignis
- **Rückgängig** stellt den Zustand aus dem Lernlog her; nichts wird geraten

> **Notizen:** Das Lernlog enthält alle Felder, die eine spätere Optimierung der FSRS-Parameter auf den eigenen Daten braucht. Zufall und Uhr sind Parameter der Logik, damit die Tests deterministisch sind.

## Prüfungsschemata und Verknüpfungen

<!-- status: M5 umgesetzt (ADR-009) -->

![Schema lernen auf dem iPhone: drei von fünf Punkten aufgedeckt, der dritte mit Norm, Inhalt und verknüpfter Karte](../bilder/schema-inhalt-iphone.png)

- Ein **Schema** ist eine Gliederung mit bis zu drei Ebenen (1., a), aa)); jeder Punkt hat Text, Norm und Inhalt
- Beim Lernen wird **Punkt für Punkt** aufgedeckt, danach gibt es eine Bewertung: das Schema ist eine Abfrage
- Ein Punkt kann auf eine **andere Karte** verweisen, etwa die Definition der Klagebefugnis
- Wird eine Karte gelöscht, nennt Juri vorher die betroffenen Schemas und entfernt die Verweise; die Punkte bleiben
- Das Backup lehnt Verweise ins Leere ab

> **Notizen:** Die Punkte stehen flach in Lesereihenfolge mit ihrer Ebene, die Zählung ist abgeleitet. Verknüpfungen sind Kartenkennungen am Punkt, es gibt keine eigene Tabelle. Schema-Version 4 fügt nur einen Index hinzu, damit die Suche nach Verweisen schnell bleibt. Fachlich sind die Demo-Schemata noch ungeprüft.

## Fristen

- Umfang wählen: Rechtsgebiete, Stapel oder Tags
- **Deckelung:** Keine Wiederholung wird hinter die Frist geplant
- **Endspurt:** In den letzten 7 Tagen kommt jede Karte noch einmal
- Anzeige: Countdown und Anteil, der am Stichtag sicher sitzt
- Nach der Frist läuft der normale Rhythmus weiter

## Daten und Backup

- Alle Daten in der Gerätedatenbank (IndexedDB), jede Tabelle mit geprüftem Schema
- Neue Versionen heben die Datenbank an, **ältere Backups gleich mit**
- Backup = eine Datei (.juri-backup), vor dem Einspielen vollständig geprüft
- Einspielen in einem Schritt: klappt es nicht, bleibt alles wie vorher

> **Notizen:** Dieselbe Umformung gilt für die Datenbank und für alte Backups, so bleibt ein Backup aus dem ersten Monat auch nach vielen Updates einspielbar. Der Roundtrip ist byte-genau getestet: Backup, Einspielen und erneutes Backup ergeben dieselbe Datei.

## Teilen ohne Server

- Format `.juri`: ein ZIP mit Beschreibung, Karten und Medien
- Verschicken über das Teilen-Menü von iOS
- Empfangen: Datei in „Dateien“ sichern, in Juri importieren
- Jede Datei wird vor dem Import streng geprüft
- Inhalte werden nie als ausführbarer Code behandelt

> **Notizen:** iOS erlaubt Web-Apps nicht, im Teilen-Menü als Ziel zu erscheinen. Der Umweg über die Dateien-App ist deshalb nötig; Juri erklärt ihn einmalig mit einer Anleitung.

## Sicherheit

- Keine Nutzerdaten auf Servern, keine Geheimnisse im Code
- Öffentlicher Code ist kein Risiko: Web-Apps sind ohnehin einsehbar
- Wichtigster Schutz: das GitHub-Konto (Zwei-Faktor, Regeln für `main`)
- Abhängigkeiten minimal, fest versioniert und überwacht
- Schutz gegen Einbetten in fremde Seiten in der App selbst

## Testen

- Automatische Tests für Fachlogik, Abläufe und Aussehen
- **Pixelvergleich:** Design und App im selben Browser gerendert, auch in Safaris Engine WebKit
- Geprüft auf iPhone 14, iPhone 16 Pro Max und iPad Air 11 Zoll
- **Testinstanz** „Juri Test“ unter `svenf-png.github.io/Juri/test/`, getrennt von echten Daten
- Dort per Knopfdruck: 26 Wochen Lernverlauf, Fristen, High fives, 5.000 Karten
- **Demo-Stapel** mit echten juristischen Inhalten, als Demo gekennzeichnet

> **Notizen:** Der Heute-Screen weicht in Chromium um 0 Pixel vom Design ab; bewusste Korrekturen am Design sind im Test dokumentiert. Erfolge, Heatmap und Fristen sieht man sonst erst nach Wochen echter Nutzung. Die Testinstanz macht alle Screens sofort prüfbar, ohne die eigenen Lerndaten anzufassen. Normtexte in den Demo-PDFs sind als amtliche Werke nach § 5 UrhG gemeinfrei.

# Entscheidungen

## Getroffene Entscheidungen

<!-- layout: tabelle -->

| Thema                  | Entscheidung                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| Hosting                | GitHub Pages unter `svenf-png.github.io/Juri`                     |
| Lückentext             | Lücken einer Karte gebündelt, eine Bewertung                      |
| Schema                 | Eine Abfrage pro Schema, mit Inhalt je Punkt                      |
| Serie                  | Anlegen zählt, leere Tage brechen nicht, Gerätezeitzone           |
| Mindestversion, Lizenz | iOS und iPadOS 18, MIT                                            |
| Testdaten              | Demo-Stapel, Demo-Profil, großer Datensatz in eigener Testinstanz |

> **Notizen:** Alle Entscheidungen mit Begründung stehen in docs/ARCHITEKTUR.md, Abschnitt 2.

# Fahrplan

## Meilensteine

<!-- layout: tabelle -->

| Phase       | Inhalt                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------ |
| M0 bis M3   | Fundament, Daten und Backup, Oberfläche, Karten und Stapel                                 |
| M4 bis M5   | Lern-Engine und Prüfungsschemata (fertig)                                                  |
| M6 bis M9   | PDF und Abdeckung, Browser-Version, Fristen, Erfolge                                       |
| M10 bis M13 | Teilen und Import, High fives, Feinschliff und Veröffentlichung, eigene Desktop-Gestaltung |

> **Notizen:** Geschätzt rund 41 Personentage. Jeder Meilenstein endet mit grünen Tests, einer kurzen Demo und aktualisierter Dokumentation.

## Stand heute

<!-- status: bei jedem Meilenstein aktualisieren -->

- **M0 fertig:** Grundgerüst, Design-Tokens, Schriften, App-Icon, Styleguide, Testinstanz mit Geräte-Check
- **M1 fertig:** Datenbank mit Migrationen, Onboarding, Install-Anleitung im Safari-Tab, Speicheranzeige, Backup erstellen und einspielen
- **M2 fertig:** Tab-Bar und Sidebar, Heute-Screen pixelgleich zum Design, Lerntag ab 4 Uhr
- **M3 fertig:** Rechtsgebiete, Stapel (in mehreren Rechtsgebieten), Frage und Lückentext, Suche, Bearbeiten und Löschen, Master-Detail auf dem iPad, Demo-Stapel
- **M4 fertig:** Lernen mit FSRS und Leitner, Vorschau der Abstände, Wischen, Rückgängig, Tastatur, gebündelte Lücken, Lernrhythmus einstellen, Notiz an Karten, „Alles erledigt für heute“, Entwicklungsstand in den Einstellungen
- **M5 fertig:** Prüfungsschemata mit Gliederung in drei Ebenen, Norm und Inhalt je Punkt, Punkt für Punkt lernen, Verknüpfungen zu anderen Karten, Löschen ohne Verweise ins Leere, Demo-Schemata
- **M6 fertig:** Abdeckung aus Foto oder PDF-Seite mit Feldern, Zoom und Editor, PDF-Ansicht mit Markieren zu Frage, Antwort oder Lücke, Quelle an der Karte, geteilte Ansicht auf dem iPad, Demo-Skript mit 50 Seiten
- Automatische Prüfung bei jeder Änderung: 541 Unit-Tests, 12 Bildvergleiche für Abdeckung und PDF, Abläufe mit Foto und PDF, insgesamt rund 180 E2E-Szenarien auf iPhone- und iPad-Größen
- Nächster Schritt: Gerätetest von M0 bis M6 auf iPhone und iPad, dann M7 (Browser-Version)
