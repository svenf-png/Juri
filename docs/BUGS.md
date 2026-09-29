# Bekannte Fehler

Sammlung von Fehlern, die später behoben werden. Neue Einträge unten anhängen, erledigte Einträge mit Datum und PR abhaken, nicht löschen.

Format: laufende Nummer, Titel, Umgebung, Beschreibung, erwartetes Verhalten, Status.

## B1: Desktop hat keinen Zugang zu den Einstellungen

- **Umgebung:** Desktop-Browser (Sidebar ab 768 px), Testinstanz `/Juri/test/`, gemeldet am 29.09.2026
- **Beschreibung:** In der Sidebar gibt es keinen Eintrag für die Einstellungen. Der Bereich „Lernrhythmus“ ist direkt verlinkt, die Einstellungsübersicht erreicht man nur, indem man auf `/einstellungen/lernrhythmus` den Zurück-Link „Einstellungen“ anklickt.
- **Erwartet:** Ein Link zu den Einstellungen in der Sidebar (Desktop), passend zum Design.
- **Betroffene Stellen:** Sidebar in `AppShell`, Route `/einstellungen` in `src/app/router.tsx`, `src/ui/screens/einstellungen/Einstellungen.tsx`
- **Status:** offen
