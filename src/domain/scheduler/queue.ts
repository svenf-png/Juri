/**
 * Was heute fällig ist und in welcher Reihenfolge gelernt wird. Fällig ist eine Abfrage, deren
 * `due` vor dem Ende des Lerntags liegt (Lernschritte am selben Tag zählen also mit). Neue
 * Abfragen kommen bis zum Tageslimit „Neue Karten pro Tag“ dazu. Uhr und Zufall sind Parameter.
 */
import { addDays, dayKey, dayStart, learningDay } from '../calendar/day';
import type { ReviewItem } from '../model/records';
import { FSRS_STATE } from './fsrs';
import { isNewItem } from './schedule';

export interface DueContext {
  /** Jetzt, in Millisekunden. */
  readonly now: number;
  /** Beginn des nächsten Lerntags (04:00), in Millisekunden. */
  readonly endOfDay: number;
  /** Wie viele neue Abfragen heute noch dazukommen dürfen. */
  readonly newRemaining: number;
}

/** Ende des Lerntags zu `now`: 04:00 des nächsten Tages, in Millisekunden. */
export function endOfLearningDay(now: number): number {
  return dayStart(addDays(learningDay(new Date(now)), 1)).getTime();
}

/** Wie viele neue Abfragen heute noch dazukommen: Tageslimit minus heute begonnene. */
export function newRemaining(newPerDay: number, startedToday: number): number {
  return Math.max(0, newPerDay - startedToday);
}

export function isDue(item: ReviewItem, endOfDay: number): boolean {
  return item.due !== undefined && item.due < endOfDay;
}

function byNewest(a: ReviewItem, b: ReviewItem): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

/** Fällige Wiederholungen, ohne neue Abfragen. */
export function dueReviews(items: readonly ReviewItem[], endOfDay: number): ReviewItem[] {
  return items.filter((item) => isDue(item, endOfDay));
}

/** Neue Abfragen, die heute noch begonnen werden dürfen (die ältesten zuerst). */
export function newToStart(items: readonly ReviewItem[], remaining: number): ReviewItem[] {
  return items.filter(isNewItem).sort(byNewest).slice(0, Math.max(0, remaining));
}

export interface DueSummary {
  /** Fällige Abfragen insgesamt. */
  readonly total: number;
  /** Fällige Abfragen je Stapel-ID; das Tageslimit für Neue gilt je Stapel für sich. */
  readonly byDeck: Readonly<Record<string, number>>;
  /** Fällige Wiederholungen, ohne Neue. */
  readonly reviews: number;
  /** Neue Abfragen, die heute noch begonnen werden. */
  readonly fresh: number;
}

/**
 * Zählung für Heute und die Stapel. Ein Stapel zählt seine Wiederholungen und höchstens
 * `newRemaining` neue; die Gesamtzahl wendet das Limit einmal über alle Stapel an.
 */
export function dueSummary(items: readonly ReviewItem[], ctx: DueContext): DueSummary {
  const reviews = dueReviews(items, ctx.endOfDay);
  const fresh = newToStart(items, ctx.newRemaining);
  const byDeck: Record<string, number> = {};
  const decks = new Set(items.map((i) => i.deckId));
  for (const deckId of decks) {
    const own = items.filter((i) => i.deckId === deckId);
    byDeck[deckId] =
      dueReviews(own, ctx.endOfDay).length + newToStart(own, ctx.newRemaining).length;
  }
  return {
    total: reviews.length + fresh.length,
    byDeck,
    reviews: reviews.length,
    fresh: fresh.length,
  };
}

/** Mischt in-place (Fisher-Yates); `random` liefert Werte in [0, 1). */
export function shuffle<T>(list: T[], random: () => number): T[] {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j] as T, list[i] as T];
  }
  return list;
}

function isLearningState(item: ReviewItem): boolean {
  const state = item.fsrs?.state;
  return state === FSRS_STATE.learning || state === FSRS_STATE.relearning;
}

/**
 * Reihenfolge einer Lernsession: zuerst fällige Lernschritte (nach Zeit), dann fällige
 * Wiederholungen (überfällige Tage zuerst, innerhalb eines Tages gemischt), danach Lernschritte
 * und Wiederholungen, die erst später am Tag fällig werden, zuletzt neue Abfragen.
 */
export function sessionItems(
  items: readonly ReviewItem[],
  ctx: DueContext,
  random: () => number,
): ReviewItem[] {
  const due = dueReviews(items, ctx.endOfDay);
  const dueNow = due.filter((i) => (i.due ?? 0) <= ctx.now);
  const later = due
    .filter((i) => (i.due ?? 0) > ctx.now)
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  const byTime = (a: ReviewItem, b: ReviewItem) =>
    (a.due ?? 0) - (b.due ?? 0) || a.id.localeCompare(b.id);
  const learning = dueNow.filter(isLearningState).sort(byTime);
  const reviews = dueNow.filter((i) => !isLearningState(i)).sort(byTime);
  // Nach Lerntag bündeln, den ältesten zuerst; innerhalb eines Tages mischen.
  const days = new Map<string, ReviewItem[]>();
  for (const item of reviews) {
    const key = dayKey(learningDay(new Date(item.due ?? 0)));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  const mixed = [...days.keys()]
    .sort()
    .flatMap((key) => shuffle([...(days.get(key) ?? [])], random));
  return [...learning, ...mixed, ...later, ...newToStart(items, ctx.newRemaining)];
}
