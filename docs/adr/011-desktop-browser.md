# ADR-011: Desktop-Browser

Status: angenommen · 29.09.2026 (Umsetzung in M7, Entscheidung 12)

## Kontext

Juri soll zusätzlich in Chrome, Safari und Firefox auf dem Desktop laufen. Die Plattformgrenzen bleiben (ADR-002): kein Server, kein Sync, die Daten liegen lokal pro Browser und wandern nur per Backup-Datei. Eigene Desktop-Gestaltung ist Sache von M13; M7 macht die vorhandenen Abläufe desktoptauglich.

## Entscheidung

- **Umgebung als reine Logik:** `domain/device/environment.ts` bildet die Plattform (iPhone, iPad, Mac, Android, Andere) auf iOS, Desktop oder Android ab. Das Sperrbild „Erst installieren“ (A13) gilt nur für `ios` ohne Standalone-Modus. Die Erkennung des Browsers bleibt in `platform/device.ts`.
- **Sichern als Download:** Auf dem Desktop nutzt Juri kein Web Share, sondern den Download; das Einspielen läuft über den Datei-Dialog. iOS und Android behalten das Teilen-Menü. Gleiche Regel wird für spätere Dateien (Teilen, M10) gelten.
- **Kürzel:** Regeln in `domain/device/shortcuts.ts` (rein, getestet), Anbindung über `ui/useKeys.ts`, das in Feldern und bei offenem `<dialog>` schweigt.
- **Zoom:** `wheelPixels`, `wheelZoomFactor` und `gestureZoomFactor` in `domain/media/viewport.ts`; Strg+Rad und Zwicken, Zeilen aus Firefox werden in Pixel umgerechnet, ein Ereignis ist auf 100 Pixel begrenzt.
- **Tests:** Desktop-Projekte für Chromium, WebKit und Firefox bei 1440 × 900 ohne Touch; Bildvergleiche mit dem Design nur auf Touch-Geräten.
- **Installierbarkeit:** Manifest (Standalone, Umfang, 192 und 512 Pixel, maskierbares Symbol) und Service Worker erfüllen die Kriterien von Chromium; `desktop.spec.ts` prüft sie einschließlich `Page.getInstallabilityErrors`.

## Konsequenzen

- Vorhandene Layouts bleiben: unter 768 px Tab-Bar, ab 768 px Sidebar, ab 1100 px iPad-Designs. Bei 1440 × 900 tragen sie ohne Abschneiden, sind aber nicht für den Desktop gestaltet (M13).
- Der Speicher gehört dem Browser und Profil. Wer zwischen Rechnern wechselt, nimmt ein Backup mit. Wie sich Speicher von Tab und installiertem Fenster in Chrome, Edge und Safari verhalten, ist nicht geprüft (Testliste M7).
- Firefox und WebKit laufen nur in der CI; die Cloud-Umgebung hat nur Chromium.
