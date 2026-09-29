/**
 * Leitner-Kasten mit vier Knöpfen (Annahme A6): Nochmal setzt in Fach 1 zurück, Schwer lässt das
 * Fach, Gut und Leicht rücken ein Fach vor. Eine neue Abfrage zählt als Fach 1. Fällig ist sie
 * zu Beginn des Lerntags (04:00), der die Tage des Fachs nach heute liegt.
 */
import { addDays, dayStart, learningDay } from '../calendar/day';
import type { LeitnerState } from '../model/records';
import type { RatingValue } from './rating';
import { LEITNER_BOXES, type LearningSettings } from './settings';

/** Fach nach der Bewertung. */
export function nextBox(current: number | undefined, rating: RatingValue): number {
  const box = current ?? 1;
  if (rating === 1) return 1;
  if (rating === 2) return box;
  return Math.min(LEITNER_BOXES, box + 1);
}

/** Tage bis zur nächsten Abfrage in einem Fach (1 bis 5). */
export function boxDays(settings: Pick<LearningSettings, 'leitnerDays'>, box: number): number {
  return settings.leitnerDays[box - 1] ?? settings.leitnerDays[0];
}

export function leitnerReview(
  state: LeitnerState | undefined,
  rating: RatingValue,
  now: number,
  settings: Pick<LearningSettings, 'leitnerDays'>,
): LeitnerState {
  const box = nextBox(state?.box, rating);
  const start = learningDay(new Date(now));
  return { box, due: dayStart(addDays(start, boxDays(settings, box))).getTime() };
}

/** Tage bis zur nächsten Abfrage nach jeder Bewertung (für die Vorschau auf den Knöpfen). */
export function leitnerPreviewDays(
  state: LeitnerState | undefined,
  settings: Pick<LearningSettings, 'leitnerDays'>,
): Record<RatingValue, number> {
  const days = (rating: RatingValue) => boxDays(settings, nextBox(state?.box, rating));
  return { 1: days(1), 2: days(2), 3: days(3), 4: days(4) };
}
