# Bekannte Fehler

Sammlung von Fehlern, die später behoben werden. Neue Einträge unten anhängen, erledigte Einträge mit Datum und PR abhaken, nicht löschen.

Format: laufende Nummer, Titel, Umgebung, Beschreibung, erwartetes Verhalten, Status.

## B1: Desktop hat keinen Zugang zu den Einstellungen

- **Umgebung:** Desktop-Browser (Sidebar ab 768 px), Testinstanz `/Juri/test/`, gemeldet am 29.09.2026
- **Beschreibung:** In der Sidebar gibt es keinen Eintrag für die Einstellungen. Der Bereich „Lernrhythmus“ ist direkt verlinkt, die Einstellungsübersicht erreicht man nur, indem man auf `/einstellungen/lernrhythmus` den Zurück-Link „Einstellungen“ anklickt.
- **Erwartet:** Ein Link zu den Einstellungen in der Sidebar (Desktop), passend zum Design.
- **Betroffene Stellen:** Sidebar in `AppShell`, Route `/einstellungen` in `src/app/router.tsx`, `src/ui/screens/einstellungen/Einstellungen.tsx`
- **Status:** behoben (Branch `fix/bugs-faelligkeit`): Sidebar-Eintrag „Einstellungen“ ab 768 px, als Ergänzung zum Design (`data-addition`)

## B2: Schema-Editor: Nummer der aktiven Zeile wird vom Rahmen abgeschnitten

- **Umgebung:** iPhone, installierte App, Testinstanz `/Juri/test/`, Schema-Editor (Kartentyp Schema), gemeldet am 29.09.2026
- **Beschreibung:** Ist ein Punkt aktiv (Rahmen mit „verknüpfen“-Knopf), wird die Nummer am linken Rand („3.“) vom Rahmen überdeckt bzw. angeschnitten. Bei den inaktiven Zeilen („1.“, „2.“) ist die Nummer vollständig lesbar.
- **Erwartet:** Nummer bleibt vollständig sichtbar, der Rahmen liegt mit Abstand um die ganze Zeile.
- **Betroffene Stellen:** Zeile im Schema-Editor, `src/ui/screens/erstellen/SchemaEditor.tsx`, Vorschauen unter `/styleguide/schema/<Variante>`
- **Status:** behoben (Branch `fix/bugs-faelligkeit`): gewählte Zeile der obersten Ebene bekommt innen 10 px Luft, außen `margin-left: -10px`

## B3: Tageslimit für neue Karten konnte unter dem Tagesziel liegen

- **Umgebung:** alle Geräte, gemeldet am 29.09.2026
- **Beschreibung:** „Neue Karten pro Tag“ (Lernrhythmus, Standard 20) und Tagesziel „Lernen“ (Erfolge, Standard 24) waren unabhängig einstellbar. Lag das Limit unter dem Ziel, war das Ziel mit neuen Karten allein nicht erreichbar (Heute: „Alles erledigt“ bei „20 von 40“), und die Serie zählte den Tag nicht. Beide Werte standen auf getrennten Bildschirmen.
- **Behoben:** Das Limit liegt nie unter dem Ziel (`domain/scheduler/dailyLimits.ts`, wirksam beim Speichern und Lesen, auch für ältere Stände). Ein höheres Ziel hebt das Limit mit an, der Regler des Limits geht nicht unter das Ziel. Tagesziel und Limit stehen zusammen in Lernrhythmus (Ergänzung zum Design), das Sheet „Tagesziele“ kündigt die Anhebung an. Standard-Limit jetzt 24, Ziel höchstens 100. Lernrhythmus erklärt den Unterschied FSRS und Leitner sowie Voreinstellung und Regler.
- **Status:** behoben (Branch `fix/bugs-faelligkeit`)
