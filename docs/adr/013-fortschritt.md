# ADR-013: Fortschritt (Tagesaggregate, Serie, Meilensteine)

Status: angenommen · 29.09.2026 (Umsetzung in M9, Entscheidungen 2, 6, 11 und 12)

## Kontext

Erfolge zeigt Verlauf, Serie und Meilensteine; Heute zeigt Tagesziel, Woche und Rekordtag. Alles folgt aus dem Ereignis-Log (ab M3) und dem Lernlog (ab M4). Entscheidung 6 legt die Serie fest: Anlegen zählt, Tage ohne verfügbare Karten brechen sie nicht, der Lerntag wechselt um 04:00 in der Gerätezeitzone. Anforderung: Zahlen, die sich nicht auseinanderentwickeln, und Meilensteine, die genau einmal entstehen.

## Entscheidung

- **Tagesaggregate** (`domain/progress/stats.ts`, rein): `dayStats(events)` liefert je Lerntag `reviews` (jede Bewertung), `learned` (Abfragen mit mindestens einer Bewertung, Annahme A5) und `created` (angelegte Karten). Ein `reviewUndone` hebt die letzte gültige Bewertung derselben Abfrage auf, an dem Tag, an dem sie geschah, auch wenn das Zurücknehmen nach dem Tageswechsel kam. Die Funktion ist die einzige Quelle der Zahlen.
- **Speicherung** (Schema-Version 7): Tabelle `dayStats` (Schlüssel „JJJJ-MM-TT“, ein Datensatz je Tag mit Aktivität, dazu `met`) und Tabelle `milestones`. Jede Bewertung, jedes Zurücknehmen und jede neue Karte rechnet die betroffenen Tage aus dem Log neu und schreibt Ereignis, Aggregat und Meilensteine **in derselben Transaktion** (`data/repositories/progress.ts`, `ACTIVITY_TABLES`); scheitert etwas, bleibt alles wie vorher. Ein neuer Aufbau aus dem Log liefert dieselben Zahlen: Die Migration 7 baut die Aggregate einmalig aus `events` auf (`Migration.derive`), dasselbe gilt für Backups der Version 6 beim Einspielen.
- **Tagesziele** (Meta-Schlüssel `goals`): Lernen (Voreinstellung 24, 1 bis 200), Anlegen (5, 1 bis 50), Pausentag (an). `met` hält fest, ob der Tag mit den damals gültigen Zielen erreicht war; ein Ändern der Ziele bewertet nur den heutigen Tag neu, die Vergangenheit bleibt.
- **Stufen der Heatmap** (`levels.ts`): 0 = nichts, 1 bis 4 nach den Quartilen (linear interpoliert) der Tage mit Aktivität über den ganzen Verlauf; ein Tag erreicht eine Stufe, sobald er die Schwelle erreicht (Gleichstand zählt nach oben). Ein einziger Tag oder lauter gleiche Tage sind damit Stufe 4. „Gelernt“ misst Wiederholungen, „Angelegt“ die neuen Karten, beide mit eigenen Stufen und Rekorden. Der **Rekordtag** ist der Tag mit dem größten Wert, bei Gleichstand der frühere.
- **Serie** (`streak.ts`, rein, vorwärts gerechnet): Ein Tag zählt, wenn `met` gilt. Ein verpasster Tag, an dem keine Karte bereitlag, bricht nichts und zählt nicht mit. Der Pausentag ist der erste verpasste Tag einer Woche (Montag bis Sonntag): Er bricht nichts und zählt nicht mit; der zweite bricht. Der heutige Tag ist offen und verbraucht keinen Pausentag. Vorwärts gerechnet, weil rückwärts der spätere von zwei verpassten Tagen den Pausentag bekäme und die Serie anders ausfiele.
- **Verfügbarkeit** (`availability.ts`): Ob an einem Tag Karten bereitlagen, wird aus dem Lernlog rekonstruiert. Eine Abfrage ist von ihrer Fälligkeit (neu: vom Anlegen) bis zur nächsten Bewertung offen (`before.due` aus dem Lernlog); der Lerntag ihres Beginns und alle bis zur Bewertung zählen als „Karten verfügbar“. Fristen (ADR-012) bleiben außen vor, sie ziehen nur vor. Das Lernlog wird nur gelesen, wenn es verpasste Tage gibt.
- **Meilensteine** (`milestones.ts`, deklarativ): Kennzahl und Ziel je Meilenstein (Erste Karte, 100 angelegt, Schema-Baumeister, 7 und 30 Tage am Stück, 1.000 Wiederholungen). Freigeschaltet wird, was erreicht und noch nicht in `milestones` eingetragen ist; der Eintrag entsteht in der Transaktion der Aktivität und ändert sich nie wieder (nur `seen`). Eine später sinkende Serie nimmt nichts zurück. Die Serie wird nur geprüft, wenn der heutige Tag im Lauf dieser Transaktion sein Ziel erreicht hat. Erfolge holt Erreichtes beim Öffnen nach (Update, Backup). „Teamplayer“ aus dem Design entfällt bis M10 und M11, weil es noch nichts zu zählen gibt; „30 Tage am Stück“ steht an seiner Stelle.
- **Feiern:** Erfolge zeigt einen frisch freigeschalteten Meilenstein einmal in einem Sheet („Neuer Meilenstein“). Am Ende einer Lernsession folgt auf „Geschafft.“ die Feier „Tagesziel erreicht.“ (`Fertig.dc.html`), wenn das Lernen-Ziel in dieser Session neu erreicht wurde (vorher darunter, nachher darauf); sie nennt die Serie, die Woche mit dem Rang des Tages und höchstens einen neuen Meilenstein. Gefeierte Meilensteine sind als gesehen markiert.
- **Heute:** Ziel, Woche und Rekord kommen aus den Aggregaten (`todayInputFrom`); Tage mit nur angelegten Karten sind mindestens Stufe 1. Das Tagesziel „Anlegen“ hat keine eigene Leiste.
- **Tests:** Grenzfälle in `domain/progress/progress.test.ts` (Tageswechsel 04:00, Zeitumstellung in `Europe/Berlin`, Pausentag, Rekord bei Gleichstand, leere Historie, Undo, Quantile bei wenigen Tagen); Datenschicht in `data/repositories/progress.test.ts`; Bildvergleiche und Abläufe in `tests/e2e/erfolge*.spec.ts`.

## Konsequenzen

- Die Aggregate sind abgeleitete Daten. Weichen sie je ab (Fehler, Handarbeit an der Datenbank), stellt `refreshDays` sie aus dem Log wieder her; ein Werkzeug dafür in den Einstellungen gibt es nicht.
- Gelöschte Karten bleiben in „Karten angelegt“ und in den Tageszahlen, weil das Ereignis-Log nur anhängt.
- Die Verfügbarkeit ist eine Rekonstruktion: Gelöschte Karten verschwinden mit ihrem Lernlog aus der Rechnung, Tage davor können dadurch rückwirkend als „nichts bereit“ gelten. Das macht die Serie eher großzügiger.
- Das Lesen des gesamten Lernlogs für die Serie skaliert mit dem Verlauf; die Messung mit 5.000 Karten gehört zu M12.
- Bei 26 Wochen sind es höchstens 182 Datensätze `dayStats`, ein Lesen aller Zeilen ist unkritisch.

## Verworfen

- **Zählen ohne Tabelle (nur Log lesen):** Jede Anzeige müsste das ganze Log durchlaufen, und die Rekord- und Stufenberechnung liefe bei jedem Öffnen.
- **Inkrementelle Zähler:** Undo über den Tageswechsel und der Neuaufbau aus dem Log wären zwei Wege zu denselben Zahlen. Neu rechnen ist einer.
- **Serie rückwärts rechnen:** siehe oben, der Pausentag würde dem falschen Tag zugeschlagen.
- **Ziele rückwirkend anwenden:** Eine Änderung von 24 auf 50 würde die Serie über Nacht zerstören.
- **Verfügbarkeit beim Öffnen von Heute festhalten:** Wer Juri an einem freien Tag nicht öffnet, hätte keine Angabe; die Rekonstruktion braucht das nicht.
