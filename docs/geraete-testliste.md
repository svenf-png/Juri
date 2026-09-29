# Geräte-Testliste

Manuelle Prüfungen auf echten Geräten. Testgeräte (Entscheidung 7): iPhone 14, iPhone 16 Pro Max, iPad Air M4 11 Zoll, älteres iPad (Modell unter Einstellungen → Allgemein → Info).

## M0: Geräte-Check (einmalig, pro Gerät)

1. In Safari `https://svenf-png.github.io/Juri/test/` öffnen.
2. Teilen-Symbol → „Zum Home-Bildschirm“ → „Hinzufügen“. „Juri Test“ vom Home-Bildschirm öffnen.
3. „Geräte-Check starten“.
4. **Speicher:** „persist() anfordern“.
5. **Datenbank:** „50-MB-Test starten“, warten bis beide Zeilen (ArrayBuffer und Blob) ein Ergebnis zeigen.
6. **Teilen:** jede Variante einmal teilen und abbrechen. Bei „Stapel.juri (application/octet-stream)“ einmal „In Dateien sichern“ wählen. Frage zu AirDrop/Nachrichten beantworten.
7. **Datei öffnen:** die eben gesicherte Datei einmal ohne und einmal mit Filter wählen. Frage beantworten.
8. **Fotos:** ein aktuelles Kamera-Foto wählen (HEIC).
9. **Kalender:** „Termin öffnen“ und „Termin teilen“ ausprobieren, Frage beantworten, Testtermin danach löschen.
10. **Statusleiste:** „Lern-Fläche an“, Frage beantworten, wieder aus.
11. **App entfernen:** „Marker setzen“. App-Symbol vom Home-Bildschirm entfernen, erneut hinzufügen (Schritt 2), Geräte-Check öffnen: Steht beim Marker „vorhanden“ oder „kein Marker“?
12. „Ergebnisse kopieren“ und in den Chat einfügen.

### Nachtest M0 (offene Punkte aus dem ersten Lauf)

1. **Datei sichern:** bei „Stapel.juri (application/octet-stream)“ „In Dateien sichern“ wählen (im ersten Lauf abgebrochen).
2. **Datei öffnen mit Filter:** die gesicherte `.juri`-Datei wählen: Ist sie wählbar? Frage beantworten.
3. **persist():** „persist() anfordern“ tippen, Ergebnis notieren.
4. **Statusleiste:** „Lern-Fläche an“, Frage beantworten.
5. **App entfernen:** Marker setzen, Icon entfernen, neu hinzufügen, Marker prüfen.
6. **Service Worker:** App vollständig schließen, neu öffnen, Check erneut starten: Steht „Seite vom Service Worker gesteuert“ auf ja?

## M1: Daten, Profil, Backup (pro Gerät)

1. **Safari-Tab:** `svenf-png.github.io/Juri/` zeigt „Erst installieren, dann lernen.“ Stimmen die drei Schritte mit dem iOS-Menü überein? Abweichenden Wortlaut notieren.
2. **Installieren und öffnen:** Onboarding erscheint. Namen eingeben, „Los geht’s“: Start zeigt „Hallo, Name“ und die Initiale oben rechts.
3. **Neustart:** Juri im App-Umschalter schließen, neu öffnen: Name ist noch da.
4. **Speicher:** Einstellungen (Initiale antippen) → „Dauerhaft gespeichert“: Ja oder Nein notieren. Bei Nein „Dauerhaft speichern anfordern“ tippen und Ergebnis notieren. „Belegt“ zeigt Werte.
5. **Backup erstellen:** „Backup erstellen“ → „Sichern oder teilen“. Öffnet sich das Teilen-Menü? „In Dateien sichern“ → iCloud Drive. Die Datei `Juri-Backup-JJJJ-MM-TT.juri-backup` liegt in der Dateien-App. „Letztes Backup“ zeigt „Heute“.
6. **Einspielen:** Namen ändern und sichern. „Backup einspielen“ → Datei ist wählbar (nicht ausgegraut), die Abfrage zeigt Name und Datum, „Einspielen“ stellt den alten Namen wieder her.
7. **Härtetest:** Juri vom Home-Bildschirm löschen, neu installieren, Backup einspielen: Name ist zurück.
8. **Testinstanz:** `svenf-png.github.io/Juri/test/` installieren, „Mit Demo-Profil starten“: Einstellungen zeigen „Zeit für ein neues Backup“. „Alles zurücksetzen“ führt zurück zum Onboarding.

## M2: Shell und Heute (pro Gerät)

- Offline-Start, Layout auf iPhone und iPad: Tab-Bar unten (iPhone), Sidebar links (iPad).
- Heute: Datum, Kopfzeile und Initiale stehen unter der Statusleiste, nichts wird abgeschnitten.

## M3: Karten und Stapel (pro Gerät)

1. **Testinstanz:** `svenf-png.github.io/Juri/test/` öffnen, Einstellungen → Testdaten → „Demo-Stapel hinzufügen“. Stapel-Übersicht zeigt 6 Stapel; „Amtshaftung (Demo)“ steht in ZR und ÖR, „Prüfungsschemata (Demo)“ in ZR, SR und ÖR.
2. **Echte App, erster Stapel:** Stapel → „Ersten Stapel anlegen“, Name „Deliktsrecht“, „Zivilrecht“ antippen, anlegen.
3. **Frage anlegen:** „+“ (iPhone) bzw. „Neue Karte“ (iPad), Vorderseite und Rückseite tippen, „Speichern & nächste“. Die Meldung „Karte gespeichert“ erscheint oben; die Tastatur verdeckt weder Felder noch Knopf.
4. **Lückentext:** Typ „Lücke“, einen Satz tippen, ein Wort **per Doppeltipp oder Ziehen der Auswahlgriffe** markieren, „Markierung wird Lücke“. Das Wort wird violett und die Auswahl bleibt im Text sichtbar. Drei Lücken setzen: „Lücken · 3 Abfragen“. Text weiter tippen, ohne dass die Hervorhebung verrutscht (auch bei Zeilenumbruch und Diktat). Notieren: Sitzt die violette Fläche exakt hinter dem Wort?
5. **Heute:** zeigt „N Karten warten heute“, „+N Karten angelegt“ und die Rechtsgebiete.
6. **Bearbeiten und Löschen:** Karte im Stapel antippen, ändern, speichern. „Karte löschen“ und bestätigen. Stapel über „⋯“ umbenennen und löschen.
7. **Rechtsgebiete:** Stift-Chip → „Rechtsgebiet anlegen“; ein Rechtsgebiet mit Stapel löschen versuchen (gesperrt).
8. **Suche:** „Gewahrsam“ eintippen; Treffer öffnen die Karte. Umlaute tippen („Verjährung“).
9. **iPad:** Liste links, Stapel rechts. Hochkant und Split View: Liste und Stapel nacheinander.
10. **Backup:** Karten anlegen, Backup erstellen, App löschen, neu installieren, einspielen: Stapel, Karten und Lücken sind wieder da.

## M4: Lernen (pro Gerät)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/` installieren oder öffnen, Einstellungen → Testdaten → „Demo-Stapel hinzufügen“. In der echten App vorher ein paar eigene Karten anlegen.

1. **Heute:** zeigt „N Karten warten heute“ (höchstens 20 neue plus fällige). „Lernen starten“ öffnet die Lernansicht; oben stehen Statusleiste und Zähler ohne Überlappung.
2. **Umdrehen und bewerten:** Karte antippen oder „Antwort zeigen“. Die Karte dreht sich, unten stehen vier Knöpfe mit „1 min“, „6 min“, „10 min“ und einer Zahl in Tagen. „Leicht“ tippen: Die Karte fliegt nach rechts weg, die nächste erscheint.
3. **Wischen:** Antwort aufdecken, mit dem Finger nach links ziehen: „Nochmal“, die Karte kommt nach etwa drei anderen wieder. Nach rechts: „Gut“. Ein kurzes Wischen unter etwa einem Daumenbreit springt zurück. Notieren: Stört das Wischen das Scrollen oder die Rand-Geste von Safari?
4. **Rückgängig:** Nach einer Bewertung erscheint unter „Antwort zeigen“ „Letzte Bewertung zurücknehmen“. Tippen: Die vorige Karte steht mit Antwort wieder da.
5. **Lückentext mit mehreren Lücken:** „Nächste Lücke“ deckt der Reihe nach auf, „Alle zeigen“ alles; danach eine Bewertung.
6. **Notiz:** Eine Karte mit Notiz (Erstellen → „Mehr“ → Notiz) zeigt sie unter der Antwort.
7. **Abbrechen:** Nach einer Bewertung das X tippen: „Schon aufhören?“. „Beenden“ führt zurück, Heute zeigt weniger fällige Karten.
8. **Ende:** Alles bewerten: „Geschafft.“ mit Bilanz. „Zurück zu Heute“ zeigt „Alles erledigt für heute.“
9. **Stapel:** Im Stapel-Detail lernt „N fällige lernen“ nur diesen Stapel; die Fortschrittsleiste zeigt „neu“, „im Lernen“ und „sicher“.
10. **Lernrhythmus:** Einstellungen → „Lernrhythmus“ (iPad: Sidebar). Voreinstellung Examen wählen, Regler bewegen, „Neue Karten pro Tag“ ändern. Zu „Leitner-Kasten“ wechseln, Fach antippen, Tage ändern, zurück zu FSRS: Karten bleiben bewertet.
11. **Tastatur (iPad mit Tastatur):** Leertaste dreht, 1 bis 4 bewerten, Strg/Cmd+Z nimmt zurück, Esc beendet.
12. **Entwicklungsstand:** Einstellungen → „Entwicklungsstand“ aufklappen: M0 bis M5 mit Haken und Version, M6 „in Arbeit“.
13. **Backup:** Nach dem Lernen ein Backup erstellen, App löschen, neu installieren, einspielen: Fälligkeiten und Lernstand sind wie vorher.
14. **Bewegung:** Bei „Bewegung reduzieren“ (Bedienungshilfen) drehen und wechseln die Karten ohne Animation.

## M5: Schema und Verknüpfungen (pro Gerät)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/` mit den Demo-Stapeln (Stapel „Prüfungsschemata (Demo)“). In der echten App vorher einen Stapel mit zwei, drei Fragen anlegen.

1. **Schema anlegen:** „+“ (iPhone) bzw. „Neue Karte“ (iPad), Typ „Schema“, Titel „Amtshaftungsanspruch“, „Gliederung bearbeiten“. „Ersten Punkt hinzufügen“: Das Sheet „Punkt bearbeiten“ öffnet sich, die Tastatur verdeckt weder Felder noch „Fertig“. Text, Norm und Inhalt eintragen, „Fertig“.
2. **Gliederung:** „+“ setzt einen weiteren Punkt, „Einrücken“ macht ihn zum Unterpunkt („a)“), „Ausrücken“ holt ihn zurück. Einen Punkt antippen (Rahmen), nochmal antippen: Sheet. „Nach oben“ und „Nach unten“ verschieben ihn samt Unterpunkten. Notieren: Sind die Knöpfe unten gut zu treffen, auch am Rand des iPhone?
3. **Verknüpfen:** Punkt wählen, Ketten-Symbol unten oder Chip „verknüpfen“. Das Feld öffnet sich mit dem Punkttext als Suche. Notieren: Verdeckt die Tastatur die Treffer oder springt die Ansicht? Zoomt Safari beim Antippen des Suchfelds hinein? Eine Karte antippen: Chip „Karte“ steht am Punkt. „Ändern“ und „Verknüpfung lösen“ ausprobieren.
4. **Neue Karte aus dem Schema:** Im Suchfeld einen Begriff ohne Treffer tippen, „+ Neue Karte … anlegen“, Rückseite eintragen, „Anlegen und verknüpfen“. Die Karte liegt danach im Stapel.
5. **Sichern und Speichern:** „Sichern“ führt zurück ins Formular („N Punkte“), „Speichern & nächste“ legt das Schema an. „Zurück“ im Editor nach einer Änderung fragt „Änderungen verwerfen?“.
6. **Lernen:** Heute → „Lernen starten“. Beim Schema stehen die Punkte als graue Platzhalter da. „Nächster Punkt“ deckt einen auf (Norm und Inhalt erscheinen, der neue Punkt ist hinterlegt), „Alle zeigen“ alle. Erst danach erscheinen die Bewertungen. Notieren: Bleibt der aufgedeckte Punkt bei langen Schemas im Blick?
7. **Verknüpfte Karte:** Am aufgedeckten Punkt „Karte“ antippen: Sheet mit der Karte. „Zurück zum Schema“ schließt es, „Karte lernen“ öffnet die Karte allein. Wischen auf der Schema-Karte (links „Nochmal“, rechts „Gut“) funktioniert wie sonst, das Antippen von „Karte“ wird nicht als Wischen gewertet.
8. **Löschen:** Eine verknüpfte Frage öffnen, „Karte löschen“: Das Blatt nennt „Verknüpft in N Schemas“. Nach dem Löschen hat das Schema alle Punkte, aber keine Verknüpfung mehr. Ebenso beim Löschen eines Stapels.
9. **Backup:** Backup erstellen, App löschen, neu installieren, einspielen: Schemas, Inhalte und Verknüpfungen sind wieder da.
10. **iPad:** Erstellen und Editor stehen als Spalte in der Mitte; Lernen wie beim iPhone.

## Updates (pro Gerät, ab Version 0.4.1)

1. Nach einem neuen Deploy die App im App-Umschalter schließen und neu öffnen, dann etwa 20 Sekunden auf Heute bleiben: Unten erscheint „Neue Version verfügbar“. „Neu laden“ tippen, unter Einstellungen steht die neue Versionsnummer.
2. Die App im Hintergrund lassen, während ein neuer Deploy läuft, dann zurück in die App wechseln: Der Hinweis erscheint auch ohne Neustart (höchstens einmal pro Minute wird nachgefragt).
3. Ohne Netz öffnen: kein Fehler, kein Hinweis.
   Version 0.3.0 und 0.4.0 fragen nicht aktiv nach; dort entscheidet allein der Browser, wann er eine neue Version bemerkt.
