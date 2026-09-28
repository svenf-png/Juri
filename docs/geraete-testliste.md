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

1. **Testinstanz:** `svenf-png.github.io/Juri/test/` öffnen, Einstellungen → Testdaten → „Demo-Stapel hinzufügen“. Stapel-Übersicht zeigt 5 Stapel; „Amtshaftung (Demo)“ steht in ZR und ÖR.
2. **Echte App, erster Stapel:** Stapel → „Ersten Stapel anlegen“, Name „Deliktsrecht“, „Zivilrecht“ antippen, anlegen.
3. **Frage anlegen:** „+“ (iPhone) bzw. „Neue Karte“ (iPad), Vorderseite und Rückseite tippen, „Speichern & nächste“. Die Meldung „Karte gespeichert“ erscheint oben; die Tastatur verdeckt weder Felder noch Knopf.
4. **Lückentext:** Typ „Lücke“, einen Satz tippen, ein Wort **per Doppeltipp oder Ziehen der Auswahlgriffe** markieren, „Markierung wird Lücke“. Das Wort wird violett und die Auswahl bleibt im Text sichtbar. Drei Lücken setzen: „Lücken · 3 Abfragen“. Text weiter tippen, ohne dass die Hervorhebung verrutscht (auch bei Zeilenumbruch und Diktat). Notieren: Sitzt die violette Fläche exakt hinter dem Wort?
5. **Heute:** zeigt „N Karten warten heute“, „+N Karten angelegt“ und die Rechtsgebiete.
6. **Bearbeiten und Löschen:** Karte im Stapel antippen, ändern, speichern. „Karte löschen“ und bestätigen. Stapel über „⋯“ umbenennen und löschen.
7. **Rechtsgebiete:** Stift-Chip → „Rechtsgebiet anlegen“; ein Rechtsgebiet mit Stapel löschen versuchen (gesperrt).
8. **Suche:** „Gewahrsam“ eintippen; Treffer öffnen die Karte. Umlaute tippen („Verjährung“).
9. **iPad:** Liste links, Stapel rechts. Hochkant und Split View: Liste und Stapel nacheinander.
10. **Backup:** Karten anlegen, Backup erstellen, App löschen, neu installieren, einspielen: Stapel, Karten und Lücken sind wieder da.

## Updates (pro Gerät, ab Version 0.4.1)

1. Nach einem neuen Deploy die App im App-Umschalter schließen und neu öffnen, dann etwa 20 Sekunden auf Heute bleiben: Unten erscheint „Neue Version verfügbar“. „Neu laden“ tippen, unter Einstellungen steht die neue Versionsnummer.
2. Die App im Hintergrund lassen, während ein neuer Deploy läuft, dann zurück in die App wechseln: Der Hinweis erscheint auch ohne Neustart (höchstens einmal pro Minute wird nachgefragt).
3. Ohne Netz öffnen: kein Fehler, kein Hinweis.
   Version 0.3.0 und 0.4.0 fragen nicht aktiv nach; dort entscheidet allein der Browser, wann er eine neue Version bemerkt.
