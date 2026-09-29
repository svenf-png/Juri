/**
 * Der Lernzustand einer Abfrage und seine Übergänge (ADR-004): FSRS und Leitner laufen parallel,
 * jede Bewertung aktualisiert beide, `due` ist der Index des aktiven Algorithmus. Alle Funktionen
 * sind rein; die Uhr kommt als Parameter.
 */
import type { ItemSnapshot, NewReviewLogEntry, ReviewItem } from '../model/records';
import { fsrsPreview, fsrsReview, FSRS_STATE } from './fsrs';
import { formatInterval } from './intervals';
import { boxDays, leitnerPreviewDays, leitnerReview } from './leitner';
import type { RatingKey, RatingValue } from './rating';
import type { Algorithm, LearningSettings } from './settings';

/** Fälligkeit des Algorithmus; `undefined` bei einer neuen Abfrage. */
export function dueOf(item: ReviewItem, algorithm: Algorithm): number | undefined {
  return algorithm === 'fsrs' ? item.fsrs?.due : item.leitner?.due;
}

/** Neue Abfrage: noch nie bewertet. */
export function isNewItem(item: ReviewItem): boolean {
  return item.fsrs === undefined && item.leitner === undefined;
}

/**
 * Setzt den `due`-Index auf den Algorithmus. Beim Wechsel ist das die einzige Änderung
 * (ADR-004): Beide Zustände bleiben erhalten.
 */
export function withActiveDue(item: ReviewItem, algorithm: Algorithm): ReviewItem {
  const next: ReviewItem = { ...item };
  delete next.due;
  const due = dueOf(item, algorithm);
  return due === undefined ? next : { ...next, due };
}

/** Lernzustand als Momentaufnahme für Undo. */
export function snapshotOf(item: ReviewItem): ItemSnapshot {
  return {
    ...(item.fsrs ? { fsrs: item.fsrs } : {}),
    ...(item.leitner ? { leitner: item.leitner } : {}),
    ...(item.due === undefined ? {} : { due: item.due }),
    ...(item.lastReviewedAt === undefined ? {} : { lastReviewedAt: item.lastReviewedAt }),
  };
}

/** Stellt den Lernzustand aus einer Momentaufnahme her; nicht gesetzte Felder entfallen. */
export function restoreItem(item: ReviewItem, before: ItemSnapshot): ReviewItem {
  const base: ReviewItem = { ...item };
  delete base.fsrs;
  delete base.leitner;
  delete base.due;
  delete base.lastReviewedAt;
  return { ...base, ...before };
}

export interface ReviewOutcome {
  readonly item: ReviewItem;
  readonly log: NewReviewLogEntry;
}

/** Wendet eine Bewertung an: beide Algorithmen rechnen, der aktive bestimmt `due`. */
export function reviewItem(
  item: ReviewItem,
  rating: RatingValue,
  now: number,
  settings: LearningSettings,
): ReviewOutcome {
  const fsrs = fsrsReview(item.fsrs, rating, now, settings);
  const leitner = leitnerReview(item.leitner, rating, now, settings);
  const next: ReviewItem = {
    ...item,
    fsrs: fsrs.state,
    leitner,
    lastReviewedAt: now,
    due: settings.algorithm === 'fsrs' ? fsrs.state.due : leitner.due,
  };
  return {
    item: next,
    log: {
      at: now,
      itemId: item.id,
      cardId: item.cardId,
      deckId: item.deckId,
      rating,
      algorithm: settings.algorithm,
      wasNew: isNewItem(item),
      fsrs: fsrs.log,
      before: snapshotOf(item),
    },
  };
}

export type IntervalPreview = Readonly<Record<RatingKey, string>>;
type Spans = Record<RatingValue, number>;

const DAY_MS = 86_400_000;

/** Abstände in Millisekunden bis zur nächsten Abfrage nach jeder der vier Bewertungen. */
function previewSpans(item: ReviewItem, now: number, settings: LearningSettings): Spans {
  if (settings.algorithm === 'leitner') {
    const days = leitnerPreviewDays(item.leitner, settings);
    return { 1: days[1] * DAY_MS, 2: days[2] * DAY_MS, 3: days[3] * DAY_MS, 4: days[4] * DAY_MS };
  }
  const out = fsrsPreview(item.fsrs, now, settings);
  return {
    1: out[1].state.due - now,
    2: out[2].state.due - now,
    3: out[3].state.due - now,
    4: out[4].state.due - now,
  };
}

/**
 * Texte für die vier Knöpfe: der Abstand, der nach der jeweiligen Bewertung gilt. Bei mehreren
 * Abfragen (gebündelte Lücken) zählt der kürzeste, denn er bestimmt, wann die Karte wiederkommt.
 */
export function previewIntervals(
  items: readonly ReviewItem[],
  now: number,
  settings: LearningSettings,
): IntervalPreview {
  const spans = items.map((item) => previewSpans(item, now, settings));
  const shortest = (r: RatingValue) => Math.min(...spans.map((s) => s[r]));
  return {
    again: formatInterval(shortest(1)),
    hard: formatInterval(shortest(2)),
    good: formatInterval(shortest(3)),
    easy: formatInterval(shortest(4)),
  };
}

export type Maturity = 'fresh' | 'learning' | 'secure';

/** Ab diesem Abstand in Tagen gilt eine Abfrage als sicher (wie „reif“ in Anki). */
export const SECURE_DAYS = 21;

/** Einordnung für die Fortschrittsleiste im Stapel-Detail: neu, im Lernen oder sicher. */
export function maturityOf(item: ReviewItem, settings: LearningSettings): Maturity {
  if (isNewItem(item)) return 'fresh';
  if (settings.algorithm === 'leitner') {
    const box = item.leitner?.box ?? 1;
    return boxDays(settings, box) >= SECURE_DAYS ? 'secure' : 'learning';
  }
  const f = item.fsrs;
  return f?.state === FSRS_STATE.review && f.scheduledDays >= SECURE_DAYS ? 'secure' : 'learning';
}
