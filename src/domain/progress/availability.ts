/**
 * Tage, an denen Karten zum Lernen bereitlagen (Entscheidung 6b): Wer an einem solchen Tag nichts
 * lernt, verpasst ihn; ein Tag, an dem nichts fällig und nichts Neues da war, bricht die Serie nicht.
 *
 * Rekonstruiert wird aus dem Lernlog: Eine Abfrage war von ihrer Fälligkeit (neu: vom Anlegen) bis
 * zur nächsten Bewertung „offen“. Fristen (ADR-012) bleiben außen vor, sie ziehen nur vor.
 */
import { daysBetween, dayKey, addDays, learningDay, type Day } from '../calendar/day';

/** Ein Zeitraum in Millisekunden, in dem eine Abfrage offen war; `to` = null: noch offen. */
export interface Span {
  readonly from: number;
  readonly to: number | null;
}

/** Eine Bewertung aus dem Lernlog: Zeitpunkt und Fälligkeit der Abfrage davor (neu: keine). */
export interface LogPoint {
  readonly at: number;
  readonly dueBefore: number | undefined;
}

export interface ItemHistory {
  readonly createdAt: number;
  /** Aktuelle Fälligkeit; fehlt bei einer nie bewerteten Abfrage. */
  readonly due: number | undefined;
  /** Bewertungen, älteste zuerst. */
  readonly log: readonly LogPoint[];
}

/** Zeiträume, in denen die Abfrage offen war. Eine zu früh bewertete Abfrage war nie offen. */
export function openSpans(item: ItemHistory): Span[] {
  const spans: Span[] = [];
  const add = (from: number | undefined, to: number | null) => {
    if (from === undefined || (to !== null && from > to)) return;
    spans.push({ from, to });
  };
  const [first] = item.log;
  if (!first) {
    add(item.createdAt, null);
    return spans;
  }
  add(first.dueBefore ?? item.createdAt, first.at);
  for (let i = 0; i < item.log.length; i++) {
    const next = item.log[i + 1];
    if (next) add(next.dueBefore, next.at);
    else add(item.due, null);
  }
  return spans;
}

/**
 * Lerntage von `first` bis `last`, an denen mindestens ein Zeitraum lag. Ein Zeitraum gilt ab dem
 * Lerntag seines Beginns (fällig ist, was vor dem Ende des Lerntags fällig wird, A26).
 */
export function availableDays(spans: readonly Span[], first: Day, last: Day): Set<string> {
  const count = daysBetween(first, last) + 1;
  if (count <= 0) return new Set();
  const diff = new Array<number>(count + 1).fill(0);
  const index = (ms: number) => daysBetween(first, learningDay(new Date(ms)));
  for (const span of spans) {
    const from = Math.max(0, index(span.from));
    const to = Math.min(count - 1, span.to === null ? count - 1 : index(span.to));
    if (to < from) continue;
    diff[from] = (diff[from] ?? 0) + 1;
    diff[to + 1] = (diff[to + 1] ?? 0) - 1;
  }
  const days = new Set<string>();
  let running = 0;
  for (let i = 0; i < count; i++) {
    running += diff[i] ?? 0;
    if (running > 0) days.add(dayKey(addDays(first, i)));
  }
  return days;
}
