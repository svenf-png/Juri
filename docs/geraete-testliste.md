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
12. **Entwicklungsstand:** Einstellungen → „Entwicklungsstand“ aufklappen: M0 bis M6 mit Haken und Version, M7 „in Arbeit“.
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

## M6: Bilder, PDF und Abdeckung (pro Gerät)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/`, Einstellungen, Testdaten, „Demo-Skript (PDF) hinzufügen“ (50 Seiten, Stapel „Demo-Skript Sachenrecht“). Für die Fotos ein echtes Foto mit der Kamera (am besten 12 MP oder mehr) und ein HEIC-Foto aus der Fotomediathek bereithalten.

1. **Foto wählen:** „+“ bzw. „Neue Karte“, Reiter „Abdeckung“, „PDF-Seite oder Foto wählen“, „Foto / Bild“. Der Datei-Dialog bietet Fotomediathek, Foto aufnehmen und Dateien. Ein Kamerafoto wählen: „Bild wird verkleinert“ erscheint kurz, danach die Felder. Notieren: Wie lange dauert es? Steht das Bild richtig herum (Hoch- und Querformat)? Klappt ein HEIC-Foto?
2. **Felder aufziehen:** Mit dem Finger ein Feld aufziehen, ein zweites und drittes. Ein Feld antippen (Rahmen und vier Ecken), verschieben, an einer Ecke die Größe ändern. Notieren: Sind die Ecken mit dem Finger gut zu treffen? Zwei Finger zoomen das Bild, die Felder bleiben an ihrer Stelle. Mit dem Apple Pencil ebenso. „Feld löschen“, „Zurück“ nach einer Änderung fragt nach.
3. **Speichern und lernen:** „Fertig“, „Speichern & nächste“, dann Heute → „Lernen starten“. Ein Feld pulsiert, die anderen sind verdeckt. Feld antippen und „Feld N aufdecken“ decken auf. Zwei Finger zoomen, ein Finger verschiebt das gezoomte Bild, Doppeltippen (Zoom 1 und 2,5) ausprobieren: kommt es auf iOS an? Wischen zum Bewerten funktioniert, solange nicht gezoomt ist.
4. **PDF öffnen:** „PDF“ (unter dem Formular), das Demo-Skript oder ein eigenes Skript wählen. Blättern mit den Pfeilen, Seitenzahl antippen und „14“ eingeben. Notieren: Wie flüssig blättert es durch alle 50 Seiten (iPad und iPhone, älteres iPad)? Bleibt die App danach bedienbar, oder lädt Safari sie neu (Speicher)? Zoomen mit zwei Fingern: wird der Text nach kurzer Ruhe scharf?
5. **Text markieren:** Auf Seite 14 den Satz „Der Erwerber ist nicht in gutem Glauben …“ mit Finger und mit Pencil markieren. Notieren: Erscheint die Leiste „Als Antwort / Als Frage / Als Lücke“, und verdeckt sie das Kontextmenü von iOS („Kopieren“, „Nachschlagen“)? Lässt sich der Griff der Markierung ziehen, ohne dass die Leiste verschwindet? „Als Antwort“ tippen: Der Text steht in der Rückseite, Zeilenumbrüche sind weg.
6. **iPad quer:** Das PDF steht links, das Formular rechts. „Speichern & nächste aus PDF“ lässt das PDF offen, der Zähler „N von 5 heute“ läuft. „Abdecken“ schaltet um, Felder aufziehen, speichern. „Speichern“ (nicht „nächste“) verlässt den Bildschirm.
7. **PDF-Seite abdecken (iPhone):** „PDF-Seite oder Foto wählen“, „PDF-Seite“, Seite wählen, Felder aufziehen, „Zur Karte“, speichern. Beim Lernen steht unten rechts „PDF · Demo-Skript Sachenrecht S. 14“, antippen öffnet das PDF an der Seite.
8. **Quelle:** Eine Frage aus dem PDF speichern, beim Lernen unter der Antwort „Anhang: …, S. 14“ mit „Öffnen“. Karte bearbeiten zeigt die Quelle. Karte löschen: Das Blatt nennt bei Abdeckungen die Felder und das Bild.
9. **Fehlerfälle:** Ein PDF über 50 MB wählen (falls vorhanden), ein passwortgeschütztes PDF, ein Bild, das keins ist (z. B. eine Textdatei mit Endung .jpg). Jedes zeigt ein Blatt mit dem Grund und „Andere Datei wählen“. Notieren: Reicht der Speicher für ein 50-MB-PDF, und wie reagiert Juri bei fast vollem Gerät („Speicher voll“)?
10. **Backup:** Mit Demo-Skript und einem Foto-Abdeckung ein Backup erstellen (Einstellungen zeigen die Größe), App löschen, neu installieren, einspielen: Bilder, PDF, Felder und Herkunft sind wieder da, das PDF öffnet sich. Notieren: Dauer und Größe der Datei.
11. **Offline:** Flugmodus, Juri öffnen, das PDF und eine Abdeckung ansehen: Beides funktioniert (der PDF-Worker steckt im Zwischenspeicher der App).
12. **Speicher:** Einstellungen, Speicher: Der belegte Platz wächst mit dem PDF und schrumpft, wenn die letzte Karte darauf gelöscht ist.

## M7: Browser-Version (Desktop, pro Browser)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/`, Fenster etwa 1440 × 900. Prüfen in Chrome (oder Edge), Safari auf dem Mac und Firefox.

1. **Kein Sperrbild:** Die Adresse öffnen: Juri zeigt das Onboarding, nicht die Install-Anleitung. `/installieren` führt zurück zur Startseite.
2. **Abläufe:** Demo-Profil laden, dann Heute, Stapel, Neue Karte (alle vier Typen), Lernen, PDF, Einstellungen durchgehen. Notieren: Ist irgendwo etwas abgeschnitten oder verrutscht?
3. **Backup:** „Backup erstellen“, „Herunterladen“: Die Datei landet im Download-Ordner, es öffnet sich kein Teilen-Fenster. Anderen Namen im Profil setzen, „Backup einspielen“, Datei wählen: Der alte Stand ist zurück.
4. **Kürzel:** „n“ öffnet die neue Karte, „/“ die Suche der Stapel, im Feld tippen ändert nichts. Strg (Mac: Cmd) + Eingabe speichert die Karte. Lernen: Leertaste, 1 bis 4, Pfeile, Strg/Cmd + Z, Esc.
5. **PDF und Zoom:** Demo-Skript öffnen. Strg + Mausrad zoomt um den Mauszeiger. Trackpad-Zwicken zoomt (Chrome, Firefox; in **Safari auf dem Mac** eigens prüfen, dort läuft es über `gesturechange`). Firefox: Ein Schritt des Mausrads (3 Zeilen) zoomt nicht sprunghaft. „+“, „−“, „0“ und Bild auf/ab funktionieren.
6. **Desktop-PWA:** Chrome: Symbol „Installieren“ in der Adressleiste, Juri als App öffnen. Notieren: Sind die Daten aus dem Tab da (gleicher Speicher) oder leer? Safari ab macOS 14: „Zum Dock hinzufügen“, gleiche Frage. Firefox bietet keine Installation an; dort läuft Juri im Tab.
7. **Speicher:** Einstellungen, Speicher: „Dauerhaft speichern anfordern“ ausprobieren. Notieren: Was antwortet der Browser?

## M8: Fristen (pro Gerät)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/`, Demo-Profil laden (bringt drei Fristen mit).

1. **Liste:** Lernrhythmus, Zeile „Fristen“: Dort steht die Zahl 3. Der Bildschirm zeigt eine große Karte im Endspurt („Endspurt läuft“), das LL.M.-Modul und das Examen ohne Datum („Datum setzen“).
2. **Anlegen:** „+ Frist hinzufügen“, Name leer lassen und speichern: Der Hinweis steht unter den Feldern. Ein Datum in der Vergangenheit wird abgelehnt. Mit Name und Datum speichern: Die Karte erscheint. Notieren: Öffnet sich das Datumsfeld von Safari sauber, ist die Tastatur dabei im Weg?
3. **Umfang:** „+ Eingrenzen“, Rechtsgebiete, Stapel und Tags wählen, einen Tag eintippen, „Fertig“. Die Chips im Sheet zeigen die Auswahl, ein Tipp auf einen Chip entfernt ihn.
4. **Deckelung:** Eine Frist für morgen mit Umfang „Alle Karten“ anlegen, dann Heute öffnen: Die Zahl fälliger Karten steigt um die Karten, deren Termin nach der Frist lag. Die Frist löschen: Die Zahl fällt wieder auf den alten Stand.
5. **Endspurt:** Frist in 5 Tagen mit Endspurt: Heute zeigt die Karten verteilt, nicht alle auf einmal. Notieren: Wie viele Karten sind es am ersten Tag?
6. **Kalenderdatei:** In der Frist „Im Kalender sichern“ und unter der Liste „Fristen als Kalenderdatei sichern“: Auf dem iPhone und iPad öffnet sich das Teilen-Menü. **Notieren:** Bietet es „Zum Kalender hinzufügen“ oder nur „In Dateien sichern“? Öffnet die gesicherte Datei die Kalender-App mit dem Termin (ganztägig, Erinnerung am Vortag um 9 Uhr)? Ein zweiter Export darf den Termin nicht verdoppeln.
7. **Löschen:** Stapel löschen, der in einer Frist gewählt war: Die Frist bleibt, der Stapel ist aus dem Umfang verschwunden. Rechtsgebiet ebenso.
8. **Backup:** Backup erstellen, App-Daten löschen, einspielen: Die Fristen sind wieder da.
9. **Rechner:** Taste „F“ auf der Fristen-Seite öffnet „Neue Frist“, Strg (Cmd) + Eingabe im Sheet speichert, „Fristen als Kalenderdatei sichern“ lädt die Datei herunter.

## M9: Erfolge (pro Gerät)

Vorher: Testinstanz `svenf-png.github.io/Juri/test/`, Demo-Profil laden (bringt 26 Wochen Verlauf mit).

1. **Erfolge:** Tab „Erfolge“. Oben die Serie (etwa 21 Tage in Folge), darunter Wiederholungen und Karten angelegt, die Heatmap (iPhone 12, iPad quer 26 Wochen) mit einem Ring am Rekordtag („Rekord: … 86 Wiederholungen“), dann die Meilensteine. Beim ersten Öffnen erscheint das Sheet „Neuer Meilenstein“ (1.000 Wiederholungen), danach nicht mehr. Notieren: Springt die Seite beim Umschalten „Gelernt“ und „Angelegt“?
2. **Heute:** Tagesziel „6 von 24“, die letzten 7 Tage mit Ring am Rekordtag.
3. **Tagesziele:** In Erfolge „Tagesziele“, Lernen auf 12 stellen, Pausentag ausschalten, speichern. Heute zeigt „6 von 12“. Wieder auf 24 und Pausentag an.
4. **Feier:** Lernen starten und Karten bewerten, bis das Ziel erreicht ist (ggf. Ziel auf 8 stellen). Am Ende „Geschafft.“, dann „Weiter“, dann „Tagesziel erreicht.“ mit der Serie. Notieren: Stimmen Animation und Text, ist die Tastatur nicht im Weg? Ein zweites Mal am selben Tag lernen: keine zweite Feier.
5. **Tageswechsel:** Kurz nach 4 Uhr Heute öffnen: Das Tagesziel steht wieder auf 0, der Vortag ist in den letzten 7 Tagen. Nach Mitternacht (vor 4 Uhr) lernen zählt für den Vortag.
6. **Pausentag:** An einem Tag nichts lernen, am nächsten weiter: Die Serie bleibt stehen (Text „Pausentag diese Woche genutzt“). Zweiter freier Tag in derselben Woche: Die Serie beginnt neu. Notieren: Nachvollziehbar?
7. **Undo:** Karte bewerten, „Letzte Bewertung zurücknehmen“: Das Tagesziel in Heute sinkt wieder.
8. **Leerzustand:** Frische App (nicht die Testinstanz): Erfolge zeigt „Noch kein Verlauf“; nach der ersten Karte erscheint die Feier „Erste Karte“.
9. **Backup:** Backup erstellen, App-Daten löschen, einspielen: Serie, Heatmap und Meilensteine sind wieder da, ohne erneute Feier.
10. **Rechner:** Erfolge bei 1440 × 900: 26 Wochen, nichts abgeschnitten.

## Updates (pro Gerät, ab Version 0.4.1)

1. Nach einem neuen Deploy die App im App-Umschalter schließen und neu öffnen, dann etwa 20 Sekunden auf Heute bleiben: Unten erscheint „Neue Version verfügbar“. „Neu laden“ tippen, unter Einstellungen steht die neue Versionsnummer.
2. Die App im Hintergrund lassen, während ein neuer Deploy läuft, dann zurück in die App wechseln: Der Hinweis erscheint auch ohne Neustart (höchstens einmal pro Minute wird nachgefragt).
3. Ohne Netz öffnen: kein Fehler, kein Hinweis.
   Version 0.3.0 und 0.4.0 fragen nicht aktiv nach; dort entscheidet allein der Browser, wann er eine neue Version bemerkt.
