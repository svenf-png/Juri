# Testdaten

Inhalte der Demo-Stapel als lesbare Datei, damit sie fachlich geprüft werden können, bevor sie in die App übernommen werden (Entscheidung 10).

| Datei              | Inhalt                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `demo-stapel.json` | 3 Rechtsgebiete, 6 Stapel, 40 Karten (Frage, Lückentext und Schema). Zwei Stapel liegen in mehreren Rechtsgebieten. |

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

Nur in der Testinstanz: Einstellungen, Testdaten, „Demo-Stapel hinzufügen“ (fügt hinzu, ohne vorhandene Daten zu ändern) oder „Demo-Profil laden“ (ersetzt alles). Einzeln löschbar über den Stapel selbst.
