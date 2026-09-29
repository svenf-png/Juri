import type { DayRow } from '../model/records';
import { metGoal, type Goals } from './goals';
import { dayStats, EMPTY_STATS, type DayStats, type StatEvent } from './stats';

/** Ein Datensatz je Lerntag mit Aktivität; `met` nach den Zielen `goals`. */
export function rowOf(day: string, stats: DayStats, goals: Goals): DayRow {
  return { day, ...stats, met: metGoal(stats, goals) };
}

/**
 * Alle Tagesdatensätze neu aus dem Ereignis-Log, z. B. beim ersten Start nach dem Update oder
 * beim Einspielen eines älteren Backups. Es gelten die Ziele `goals` für jeden Tag.
 */
export function dayRows(events: readonly StatEvent[], goals: Goals): DayRow[] {
  const valid = events.filter((event) => Number.isFinite(event.at));
  return [...dayStats(valid)]
    .filter(([, stats]) => stats.reviews > 0 || stats.created > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, stats]) => rowOf(day, stats, goals));
}

/** Die Zahlen eines Tages; ohne Datensatz null. */
export function statsOf(row: DayRow | undefined): DayStats {
  return row ? { reviews: row.reviews, learned: row.learned, created: row.created } : EMPTY_STATS;
}
