/**
 * Effektive Fälligkeit (Entscheidung „Fristen ändern keine gespeicherten Daten“, ADR-012): Aus dem
 * gespeicherten `due` des Lernalgorithmus und den aktiven Fristen wird zur Laufzeit ein früheres
 * Datum, nie ein späteres. Gespeichert wird nichts; nach Ablauf gilt wieder der normale Rhythmus.
 *
 * Deckelung: Eine Abfrage im Umfang wird spätestens am letzten Lerntag vor der Frist fällig, es
 * sei denn, sie wurde an diesem Tag schon gesehen. Endspurt: In den letzten 7 Tagen kommt jede
 * Abfrage noch einmal, verteilt nach ihrer ID auf die Tage, bis sie im Endspurt gesehen wurde.
 * Neue Abfragen (ohne `due`) bleiben unberührt, für sie gilt das Tageslimit.
 */
import { addDays, dayStart, daysBetween, parseDayKey, type Day } from '../calendar/day';
import type { Deadline, ReviewItem } from '../model/records';
import { scopeMatcher, type ScopeWorld } from './scope';

/** Länge des Endspurts in Tagen; er beginnt 7 Tage vor der Frist. */
export const SPRINT_DAYS = 7;

/** Fristen mit Datum am Lerntag `today` oder später (am Tag der Frist selbst noch aktiv). */
export function activeDeadlines(
  deadlines: readonly Deadline[],
  today: Day,
): (Deadline & { date: string })[] {
  return deadlines.filter(
    (d): d is Deadline & { date: string } =>
      d.date !== undefined && daysBetween(today, parseDayKey(d.date)) >= 0,
  );
}

/** Erster Tag des Endspurts. */
export function sprintStart(date: Day): Day {
  return addDays(date, -SPRINT_DAYS);
}

/** FNV-1a über die ID: stabil, ohne Zufall, gleichmäßig genug für 7 Tage. */
export function idHash(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Tag im Endspurt, an dem die Abfrage `id` an der Reihe ist (0 bis 6 nach Beginn). */
export function sprintOffset(id: string): number {
  return idHash(id) % SPRINT_DAYS;
}

interface Prepared {
  readonly matches: (item: ReviewItem) => boolean;
  readonly sprint: boolean;
  /** 04:00 am letzten Lerntag vor der Frist. */
  readonly capMs: number;
  /** 04:00 am ersten Endspurt-Tag. */
  readonly windowMs: number;
  readonly firstSprintDay: Day;
}

function prepare(deadline: Deadline & { date: string }, world: ScopeWorld): Prepared {
  const date = parseDayKey(deadline.date);
  const first = sprintStart(date);
  return {
    matches: scopeMatcher(deadline.scope, world),
    sprint: deadline.sprint,
    capMs: dayStart(addDays(date, -1)).getTime(),
    windowMs: dayStart(first).getTime(),
    firstSprintDay: first,
  };
}

function lastSeen(item: ReviewItem): number | undefined {
  return item.lastReviewedAt ?? item.fsrs?.lastReview;
}

/** Früheste Fälligkeit, die eine Frist für die Abfrage verlangt; `undefined`, wenn sie nichts verlangt. */
function pull(item: ReviewItem, p: Prepared): number | undefined {
  const seen = lastSeen(item);
  const since = p.sprint ? p.windowMs : p.capMs;
  if (seen !== undefined && seen >= since) return undefined;
  return p.sprint ? dayStart(addDays(p.firstSprintDay, sprintOffset(item.id))).getTime() : p.capMs;
}

/**
 * Abfragen mit effektiver Fälligkeit. Die Eingabe bleibt unverändert; Abfragen, die keine Frist
 * betrifft, werden unverändert übernommen (gleiches Objekt).
 */
export function applyDeadlines(
  items: readonly ReviewItem[],
  deadlines: readonly Deadline[],
  world: ScopeWorld,
  today: Day,
): ReviewItem[] {
  const prepared = activeDeadlines(deadlines, today).map((d) => prepare(d, world));
  if (prepared.length === 0) return [...items];
  return items.map((item) => {
    if (item.due === undefined) return item;
    let due = item.due;
    for (const p of prepared) {
      if (!p.matches(item)) continue;
      const wanted = pull(item, p);
      if (wanted !== undefined && wanted < due) due = wanted;
    }
    return due === item.due ? item : { ...item, due };
  });
}
