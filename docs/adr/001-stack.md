# ADR-001: Technologie-Stack

Status: angenommen · 28.09.2026

## Kontext

Juri ist eine PWA für iPhone und iPad (Safari/WebKit), offline-first, ohne Server für Nutzerdaten. Das Design ist pixelgenau vorgegeben (design/), inklusive exakter Animationskurven.

## Entscheidung

- **Vite 8, React 19, TypeScript 6 (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)**. TypeScript 7 wird erst übernommen, wenn typescript-eslint es unterstützt (aktuell `<6.1`).
- **React Router 8** im Browser-Modus mit `basename` = Basis-Pfad inklusive Schrägstrich (sonst läge die Startseite „/Juri“ außerhalb des Manifest-Scopes „/Juri/“).
- **CSS Modules plus Design-Tokens als CSS-Variablen.** Einzige Quelle ist `src/ui/tokens/tokens.ts`; `tokens.css` wird daraus erzeugt, ein Test sichert den Gleichstand.
- **Keine Animationsbibliothek** (Abweichung vom Briefing-Vorschlag motion): Alle Bewegungen im Design sind CSS-Keyframes und -Transitions mit festen Kurven und Dauern. Sie werden 1:1 als CSS übernommen, reduzierte Bewegung schaltet sie zentral ab (`global.css`).
- **vite-plugin-pwa (Workbox, generateSW)** für Manifest, Precache und Update-Hinweis.
- **Vitest** (jsdom) für Unit-Tests, **Playwright** für E2E (WebKit in der CI, Chromium lokal und für Service-Worker-Tests).
- Später: Dexie (M1), ts-fsrs 5.x (M4), pdfjs-dist (M6), fflate (bereits für Testdateien), zod (M10), date-fns (bei Bedarf).
- **Schriften** über Fontsource-Pakete gebündelt, nur Latein und Latein-Erweitert; Bricolage Grotesque mit opsz-Achse (12 bis 96), wie im Design über Google Fonts genutzt.

## Konsequenzen

- Keine Laufzeit-Abhängigkeit für Animationen; Bewegungen sind in CSS lesbar und testbar.
- Tokens liegen typisiert in TypeScript vor und sind in Tests (Kontrast, Gleichstand) nutzbar.
- Schichtregeln (domain, data, platform, features, ui) werden per ESLint erzwungen.
