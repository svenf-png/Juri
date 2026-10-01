/**
 * Tageslimit für neue Karten und Tagesziel „Lernen“ hängen zusammen: Das Limit liegt nie unter dem
 * Ziel, sonst wäre ein Ziel allein mit neuen Karten nicht erreichbar und „Alles erledigt“ käme
 * vor dem Ziel. Das Ziel zählt Abfragen mit mindestens einer Bewertung, das Limit begrenzt nur die
 * ersten Bewertungen neuer Abfragen. Beide bleiben getrennte Werte; diese Regel verbindet sie.
 */
import { NEW_PER_DAY_MAX } from './settings';

/** Kleinstes erlaubtes Tageslimit für neue Karten bei diesem Tagesziel. */
export function minNewPerDay(learnGoal: number): number {
  return Math.min(Math.max(0, learnGoal), NEW_PER_DAY_MAX);
}

/** Das wirksame Tageslimit: der gespeicherte Wert, mindestens das Tagesziel. */
export function effectiveNewPerDay(newPerDay: number, learnGoal: number): number {
  return Math.max(newPerDay, minNewPerDay(learnGoal));
}
