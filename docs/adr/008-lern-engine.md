# ADR-008: Lern-Engine, Fälligkeit und Lernsession

Status: angenommen · 28.09.2026 (Umsetzung in M4)

## Kontext

Mit M4 lernt Juri. Der Lernzustand muss zu ADR-004 passen (beide Algorithmen parallel, Wechsel ohne Datenverlust, Undo aus dem Log), zu ADR-006 (Migrationen, Backup) und zu ADR-007 (jede Lücke eine Abfrage). Die Fälligkeit muss für Heute, Stapel und Session dieselbe Antwort geben.

## Entscheidung

- **Schema-Version 3:** `reviewItems` bekommt optionale Felder `fsrs`, `leitner`, `due`, `lastReviewedAt` und den Index `due`; neu ist die Tabelle `reviewLog` (`++seq`, `itemId`, `at`). Bestehende Abfragen bleiben unverändert und gelten als neu (kein `fsrs`, kein `leitner`); die Migration braucht keine Umformung. Einstellungen liegen als Metadaten-Eintrag `learning` und reisen im Backup mit; fehlt er, gelten die Voreinstellungen.
- **Lernzustand:** `fsrs` (ts-fsrs 5.4.2, nur über `domain/scheduler/fsrs.ts` angesprochen, eigener Zustand in Millisekunden) und `leitner` (Fach 1 bis 5 mit Fälligkeit) entstehen bei jeder Bewertung gemeinsam. `due` ist der Index des aktiven Algorithmus. Ein Wechsel schreibt in einer Transaktion nur `due` aller Abfragen neu.
- **Lernlog:** Jede Bewertung schreibt Abfrage, Stufe, Algorithmus, ob die Abfrage neu war, das ts-fsrs-Protokoll (Zustand, Stabilität, Schwierigkeit, Abstände vor der Bewertung) und den vollständigen Lernzustand davor (`before`). Zustand, Log und Ereignis `reviewed` entstehen in einer Transaktion.
- **Undo:** Der Zustand kommt aus `before` des letzten Logeintrags der Abfrage, der Eintrag wird gelöscht (er war nie gültig, für die FSRS-Optimierung), das Ereignis-Log bleibt anhängend und bekommt `reviewUndone`. Danach setzt Juri `due` auf den aktiven Algorithmus.
- **Fälligkeit:** `due` vor dem Ende des Lerntags (04:00) oder, für neue Abfragen, im Rahmen des Tageslimits (A26). Reine Funktionen in `domain/scheduler/queue.ts`, Uhr und Zufall als Parameter.
- **Session als Zustandsmaschine** (`domain/session/session.ts`): Stationen (Frage, Lücke oder gebündelte Lücken), `flip`, `revealNext`, `rate`, `undo`. `rate` und `undo` liefern die Wirkung auf die Daten (`effect`), die Anwendungsschicht (`features/study/useSession.ts`) führt sie aus. Die Oberfläche rechnet die Bewertung lokal mit derselben reinen Funktion wie die Datenbank (`reviewItem`), damit Vorschau und nächste Karte sofort stimmen, und speichert der Reihe nach über eine Warteschlange.
- **FSRS ohne Streuung, längster Abstand 180 Tage:** siehe A28. Die Vorschau ist damit exakt.
- **Bilanz je Abfrage:** Ein Bündel aus drei Lücken zählt dreifach (Tagesziel A5, Statistik M8).

## Konsequenzen

- Backups aus M1 bis M3 bleiben einspielbar (alle Abfragen neu); Backups aus M4 lehnt eine ältere App ab (ADR-006).
- Ein Wechsel des Algorithmus ist verlustfrei und sofort wirksam; die Fälligkeiten des anderen Algorithmus laufen im Hintergrund mit.
- Fristen (M7) rechnen zur Laufzeit auf `due` und ändern nichts an den Daten.
- Heute und Stapel lesen alle Abfragen (eine kleine Zeile je Frage oder Lücke); für 5.000 Karten misst M11 nach.
- Die FSRS-Optimierung (nach V1) findet im Lernlog alle nötigen Felder.
