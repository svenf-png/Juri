# ADR-004: Zustände des Lernalgorithmus

Status: angenommen · 28.09.2026 (Umsetzung in M4 (ADR-008) und M7)

## Kontext

Juri bietet FSRS (ts-fsrs) und Leitner. Ein Wechsel darf keine Daten verlieren. Fristen sollen Abstände deckeln und einen Endspurt planen, danach gilt wieder der normale Rhythmus.

## Entscheidung

- Jedes reviewItem führt **FSRS-Zustand und Leitner-Fach samt eigener Fälligkeit parallel**; jede Bewertung aktualisiert beide.
- `due` ist ein denormalisierter Index des aktiven Algorithmus; ein Wechsel schreibt nur diesen Index neu.
- **Fristen verändern keine gespeicherten Daten.** Das effektive Fälligkeitsdatum (Deckelung, Endspurt) wird zur Laufzeit aus Algorithmus-Fälligkeit und aktiven Fristen berechnet (reine Funktion in `domain/`).
- **Undo** stellt den vollständigen Vorzustand aus dem reviewLog wieder her, nicht nur über `rollback()`.
- ts-fsrs bleibt auf 5.x gepinnt, Zugriff nur über einen eigenen Adapter; das reviewLog enthält ab Tag 1 alle Felder für eine spätere Parameter-Optimierung.

## Konsequenzen

- Der Algorithmuswechsel ist verlustfrei und sofort wirksam.
- Nach Ablauf einer Frist ist nichts zurückzurechnen.
- Die Warteschlange fragt zusätzlich die Abfragen im Umfang aktiver Fristen ab.
