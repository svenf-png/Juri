/**
 * Tagesaggregate aus dem Ereignis-Log (M9, ADR-013). Ein Lerntag beginnt um 04:00 in der
 * Gerätezeitzone (Entscheidung 6). Die Funktion ist die einzige Quelle der Zahlen: Die Datenschicht
 * speichert ihr Ergebnis je Tag (`dayStats`), und ein Neuaufbau aus dem Log liefert dasselbe.
 */
import { dayKey, learningDay } from '../calendar/day';

/** Zahlen eines Lerntags. */
export interface DayStats {
  /** Bewertungen (jede zählt, „Wiederholungen“ in Erfolge). */
  readonly reviews: number;
  /** Abfragen mit mindestens einer Bewertung an diesem Tag (Tagesziel „Lernen“, Annahme A5). */
  readonly learned: number;
  /** Angelegte Karten (Tagesziel „Anlegen“). */
  readonly created: number;
}

export const EMPTY_STATS: DayStats = { reviews: 0, learned: 0, created: 0 };

/** Das, was die Aggregate vom Ereignis-Log brauchen; ein `AppEvent` passt strukturell. */
export interface StatEvent {
  readonly at: number;
  readonly type: string;
  readonly itemId?: string | undefined;
}

/** Lerntag („JJJJ-MM-TT“) eines Zeitpunkts. */
export function dayOfTime(at: number): string {
  return dayKey(learningDay(new Date(at)));
}

/**
 * Aggregate je Lerntag. `events` in der Reihenfolge des Logs: Ein `reviewUndone` hebt die letzte
 * noch gültige Bewertung derselben Abfrage auf, und zwar an dem Tag, an dem sie geschah, auch wenn
 * das Zurücknehmen erst nach dem Tageswechsel kam. Tage ohne Ereignis fehlen im Ergebnis.
 */
export function dayStats(events: readonly StatEvent[]): Map<string, DayStats> {
  const created = new Map<string, number>();
  const active = new Map<string, string[]>();
  for (const event of events) {
    const day = dayOfTime(event.at);
    if (event.type === 'cardCreated') {
      created.set(day, (created.get(day) ?? 0) + 1);
    } else if (event.type === 'reviewed' && event.itemId !== undefined) {
      const stack = active.get(event.itemId) ?? [];
      stack.push(day);
      active.set(event.itemId, stack);
    } else if (event.type === 'reviewUndone' && event.itemId !== undefined) {
      active.get(event.itemId)?.pop();
    }
  }
  const reviews = new Map<string, number>();
  const learned = new Map<string, Set<string>>();
  for (const [itemId, days] of active) {
    for (const day of days) {
      reviews.set(day, (reviews.get(day) ?? 0) + 1);
      const set = learned.get(day) ?? new Set<string>();
      set.add(itemId);
      learned.set(day, set);
    }
  }
  const result = new Map<string, DayStats>();
  for (const day of new Set([...created.keys(), ...reviews.keys()])) {
    result.set(day, {
      reviews: reviews.get(day) ?? 0,
      learned: learned.get(day)?.size ?? 0,
      created: created.get(day) ?? 0,
    });
  }
  return result;
}

/** Summe über alle Tage, z. B. „1.284 Wiederholungen“. */
export function totals(rows: Iterable<DayStats>): DayStats {
  let reviews = 0;
  let learned = 0;
  let created = 0;
  for (const row of rows) {
    reviews += row.reviews;
    learned += row.learned;
    created += row.created;
  }
  return { reviews, learned, created };
}
