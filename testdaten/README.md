# Testdaten

Inhalte der Demo-Stapel als lesbare Datei, damit sie fachlich geprüft werden können, bevor sie in die App übernommen werden (Entscheidung 10).

| Datei              | Inhalt                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-stapel.json` | 3 Rechtsgebiete, 6 Stapel, 40 Karten (Frage, Lückentext und Schema). Zwei Stapel liegen in mehreren Rechtsgebieten.                     |
| `demo-skript.pdf`  | 50-seitiges Demo-Skript für die PDF-Ansicht (M6), erzeugt mit `npm run demo:pdf`. Bis auf Seite 14 Beispieltext ohne fachlichen Inhalt. |

## Aufbau

- `rechtsgebiete`: Kürzel und Name. Gibt es das Kürzel in der Testinstanz schon, wird das vorhandene Rechtsgebiet benutzt.
- `stapel`: Name (mit „(Demo)“), Normen, Rechtsgebiete, Karten. Die IDs sind fest, ein zweites Laden legt nichts doppelt an.
- Karte `frage`: `vorderseite`, `rueckseite`. Karte `luecke`: `text` mit Lücken in der Schreibweise `{{c1::Wort}}`.
- Jede Karte hat `norm`, `tags` (immer mit „Demo“), `quelle` (Adresse auf gesetze-im-internet.de) und `pruefung`.
- Karte `schema`: `titel` und `punkte` (Liste mit `ebene` 1 bis 3, `text`, optional `norm`, `inhalt` und `verknuepfung`, der ID einer anderen Demo-Karte wie `demo-amtshaftung-04`). Verweist eine Verknüpfung auf eine Karte, die es nicht gibt (Stapel gelöscht), entfällt sie beim Laden.
- `wortlaut: true` heißt: Die Karte zitiert eine Norm. Der Text muss Zeichen für Zeichen mit der Quelle übereinstimmen.

## Prüfstand

Alle 40 Karten stehen auf `pruefung: offen`. Die Texte sind ohne Abgleich mit der Quelle entstanden, weil die Entwicklungsumgebung den Zugriff auf gesetze-im-internet.de sperrt. Bitte vor allem die Karten mit `wortlaut: true` die Inhalte der Schemas (Punkte, Normen, Fristen) und die Definitionen (Gewahrsam, Zueignungsabsicht, Verwaltungsakt, sonstiges Recht, drittbezogene Amtspflicht) prüfen. Geprüfte Karten bekommen `pruefung: geprüft`.

## Laden

Das Demo-Profil bringt seit M8 drei Fristen mit (Klausur in 5 Tagen im Endspurt, LL.M.-Modul in 109 Tagen über den Tag „Demo“, Examen ohne Datum), relativ zum Ladetag.

Seit M9 hat es außerdem 26 Wochen Lernverlauf (relativ zum Ladetag): einen Rekordtag vor acht Tagen mit 86 Wiederholungen, in den letzten drei Wochen jeden Tag aktiv bis auf einen Pausentag pro Woche (laufende Serie), davor Lücken, dazu die Meilensteine „Erste Karte“, „7 Tage am Stück“ und „1.000 Wiederholungen“ (der letzte wartet auf die Feier; beim Öffnen von Erfolge erscheint sie) sowie drei fast erreichte („100 angelegt“, „Schema-Baumeister“, „30 Tage am Stück“). Heute zeigt „6 von 24“.

Nur in der Testinstanz: Einstellungen, Testdaten, „Demo-Stapel hinzufügen“ (fügt hinzu, ohne vorhandene Daten zu ändern) oder „Demo-Profil laden“ (ersetzt alles). Einzeln löschbar über den Stapel selbst.

## Demo-Skript (M6)

`demo-skript.pdf` hat 50 Seiten (A4, eingebettete Schriften, markierbarer Text). Seite 14 enthält den Satz aus dem Design (§ 932 II BGB: „Der Erwerber ist nicht in gutem Glauben, wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.“). Er ist **nicht mit gesetze-im-internet.de abgeglichen** (die Umgebung sperrt die Adresse) und gilt wie die Demo-Stapel als ungeprüft. Alle anderen Seiten sind Platzhalter.

Laden: Einstellungen, Testdaten, „Demo-Skript (PDF) hinzufügen“ (nur Testinstanz). Es entsteht der Stapel „Demo-Skript Sachenrecht“ im Rechtsgebiet ZR mit einer Frage (Herkunft: Seite 14) und einer Abdeckung mit drei Feldern auf Seite 14. Ein zweites Laden legt nichts doppelt an. Neu erzeugen: `PW_CHROMIUM_PATH=… npm run demo:pdf`.
