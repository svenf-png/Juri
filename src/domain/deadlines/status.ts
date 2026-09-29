/**
 * Stand einer Frist: Phase, Countdown, Umfang in Zahlen und „x % sitzen sicher“. Rein aus den
 * gespeicherten Abfragen gerechnet (nicht aus der effektiven Fälligkeit).
 */
import { dayStart, daysBetween, parseDayKey, type Day } from '../calendar/day';
import type { Deadline, ReviewItem } from '../model/records';
import { sprintStart } from './effective';
import { scopeMatcher, type ScopeWorld } from './scope';

export type Phase =
  /** Ohne Datum: ändert nichts. */
  | 'undated'
  | 'upcoming'
  /** Endspurt eingeschaltet und begonnen. */
  | 'sprint'
  | 'expired';

export interface DeadlineStatus {
  readonly phase: Phase;
  /** Tage bis zur Frist (0 = heute, negativ = vorbei); `null` ohne Datum. */
  readonly daysLeft: number | null;
  /** Erster Tag des Endspurts; `null` ohne Datum oder ohne Endspurt. */
  readonly sprintFrom: Day | null;
  /** Karten im Umfang. */
  readonly cards: number;
  /** Stapel mit Karten im Umfang. */
  readonly decks: number;
  /** Abfragen im Umfang. */
  readonly items: number;
  /** Anteil der Abfragen, die bis zur Frist sicher sitzen, ganze Prozent abgerundet; `null` ohne Abfragen. */
  readonly secure: number | null;
}

/**
 * Eine Abfrage sitzt bis zur Frist sicher, wenn sie gelernt ist und ihre gespeicherte Fälligkeit
 * nicht vor dem Tag der Frist liegt: Ihr Abstand trägt bis zum Termin.
 */
export function sitsSecurely(item: ReviewItem, date: Day): boolean {
  return item.due !== undefined && item.due >= dayStart(date).getTime();
}

/** Anteil in ganzen Prozent, abgerundet: 100 heißt wirklich alle. */
export function percent(part: number, total: number): number | null {
  return total > 0 ? Math.floor((part * 100) / total) : null;
}

export function deadlineStatus(
  deadline: Deadline,
  items: readonly ReviewItem[],
  world: ScopeWorld,
  today: Day,
): DeadlineStatus {
  const matches = scopeMatcher(deadline.scope, world);
  const inScope = items.filter(matches);
  const date = deadline.date === undefined ? null : parseDayKey(deadline.date);
  const daysLeft = date ? daysBetween(today, date) : null;
  const from = date && deadline.sprint ? sprintStart(date) : null;
  let phase: Phase = 'upcoming';
  if (date === null) phase = 'undated';
  else if ((daysLeft ?? 0) < 0) phase = 'expired';
  else if (from && daysBetween(from, today) >= 0) phase = 'sprint';
  return {
    phase,
    daysLeft,
    sprintFrom: from,
    cards: new Set(inScope.map((i) => i.cardId)).size,
    decks: new Set(inScope.map((i) => i.deckId)).size,
    items: inScope.length,
    secure: date
      ? percent(inScope.filter((i) => sitsSecurely(i, date)).length, inScope.length)
      : null,
  };
}
