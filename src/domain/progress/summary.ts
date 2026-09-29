/**
 * Verlauf für Anzeige: Aktivitätsstufen und Rekord aus den Tagesaggregaten. „Gelernt“ misst die
 * Wiederholungen (der Rekord in Erfolge.dc.html: „86 Wiederholungen“), „Angelegt“ die neuen Karten.
 */
import type { DayRow } from '../model/records';
import { levelOf, recordOf, thresholds, type Level } from './levels';

export type Mode = 'learn' | 'make';

export function metricOf(row: Pick<DayRow, 'reviews' | 'created'>, mode: Mode): number {
  return mode === 'learn' ? row.reviews : row.created;
}

export interface Activity {
  /** Wert je Tag (nur Tage mit Aktivität). */
  readonly values: ReadonlyMap<string, number>;
  readonly level: (key: string) => Level;
  readonly record: { readonly day: string; readonly value: number } | null;
}

export function activity(rows: readonly DayRow[], mode: Mode): Activity {
  const values = new Map<string, number>();
  for (const row of rows) {
    const value = metricOf(row, mode);
    if (value > 0) values.set(row.day, value);
  }
  const t = thresholds(values.values());
  return {
    values,
    level: (key) => levelOf(values.get(key) ?? 0, t),
    record: recordOf(values),
  };
}

/** Stufe je Tag und Rekordtag für Heute: Tage mit nur angelegten Karten sind mindestens Stufe 1. */
export function weekActivity(rows: readonly DayRow[]): {
  levels: Record<string, Level>;
  recordDay: string | null;
} {
  const learn = activity(rows, 'learn');
  const levels: Record<string, Level> = {};
  for (const row of rows) {
    const level = learn.level(row.day);
    if (level > 0) levels[row.day] = level;
    else if (row.created > 0) levels[row.day] = 1;
  }
  return { levels, recordDay: learn.record?.day ?? null };
}

/** Rang eines Tages unter allen Tagen mit Wiederholungen: 1 = Rekord, Gleichstand teilt den Rang. */
export function rankOf(rows: readonly DayRow[], key: string): number | null {
  const mine = rows.find((row) => row.day === key)?.reviews ?? 0;
  if (mine <= 0) return null;
  return 1 + rows.filter((row) => row.reviews > mine).length;
}
