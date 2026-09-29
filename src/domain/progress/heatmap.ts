/**
 * Heatmap in Wochen (Erfolge.dc.html, iPadErfolge.dc.html): eine Spalte je Woche, Montag oben,
 * die letzte Spalte ist die laufende Woche; Tage nach heute sind leer.
 */
import { addDays, daysBetween, dayKey, type Day } from '../calendar/day';
import { shortDate, MONTH_NAMES } from '../format/date';
import type { Level } from './levels';
import { weekStart } from './streak';

/** Wochen der Heatmap auf dem iPhone und ab 1100 px Breite. */
export const WEEKS_PHONE = 12;
export const WEEKS_WIDE = 26;
/** Ein Monat bekommt eine Beschriftung, wenn mindestens so viele seiner Tage zu sehen sind. */
const MONTH_MIN_DAYS = 7;

export interface HeatCell {
  readonly key: string;
  /** `null`: liegt nach heute, wird nicht gezeichnet. */
  readonly level: Level | null;
  readonly record: boolean;
  /** Text für Tooltip und Vorlesen, z. B. „Mi, 23.9.: 86 Wiederholungen“. */
  readonly tip: string;
}

export interface Heatmap {
  readonly weeks: number;
  /** Spaltenweise: 7 Zellen je Woche, älteste Woche zuerst. */
  readonly cells: readonly HeatCell[];
  /** Beschriftete Monate von links nach rechts. */
  readonly months: readonly string[];
}

export interface HeatmapInput {
  readonly today: Day;
  readonly weeks: number;
  readonly level: (key: string) => Level;
  readonly record: string | null;
  /** Text zu einem Tag ohne Aktivität und mit Aktivität. */
  readonly tip: (key: string, day: Day) => string;
}

export function heatmap(input: HeatmapInput): Heatmap {
  const { today, weeks } = input;
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cells: HeatCell[] = [];
  const monthDays = new Map<number, number>();
  const order: number[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(start, i);
    const key = dayKey(day);
    if (daysBetween(today, day) > 0) {
      cells.push({ key, level: null, record: false, tip: '' });
      continue;
    }
    const month = day.year * 12 + day.month - 1;
    if (!monthDays.has(month)) order.push(month);
    monthDays.set(month, (monthDays.get(month) ?? 0) + 1);
    cells.push({
      key,
      level: input.level(key),
      record: key === input.record,
      tip: input.tip(key, day),
    });
  }
  const months = order
    .filter((m) => (monthDays.get(m) ?? 0) >= MONTH_MIN_DAYS)
    .map((m) => MONTH_NAMES[m % 12] ?? '');
  return { weeks, cells, months };
}

/** „Mi, 23.9.“ für den Rekord und die Tooltips. */
export function dayLabel(day: Day, today: Day): string {
  return shortDate(day, today);
}
