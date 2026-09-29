/**
 * Tagesziele (A17, seit M9 einstellbar). Ein Tag zählt für die Serie, wenn eines der beiden Ziele
 * erreicht ist (Entscheidung 6: Anlegen belohnt ausdrücklich).
 */
import type { DayStats } from './stats';

export interface Goals {
  /** Abfragen, die am Tag mindestens einmal bewertet werden sollen. */
  readonly learn: number;
  /** Karten, die am Tag angelegt werden sollen. */
  readonly create: number;
  /** Ein Pausentag pro Woche unterbricht die Serie nicht. */
  readonly pause: boolean;
}

export const DEFAULT_GOALS: Goals = { learn: 24, create: 5, pause: true };

export const LEARN_GOAL_MIN = 1;
/** Wie „Neue Karten pro Tag“ höchstens 100: Das Limit liegt nie unter dem Ziel (`dailyLimits.ts`). */
export const LEARN_GOAL_MAX = 100;
export const CREATE_GOAL_MIN = 1;
export const CREATE_GOAL_MAX = 50;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export const clampLearnGoal = (n: number) => clamp(n, LEARN_GOAL_MIN, LEARN_GOAL_MAX);
export const clampCreateGoal = (n: number) => clamp(n, CREATE_GOAL_MIN, CREATE_GOAL_MAX);

/** Schrittweite des Reglers „Lernen“: bis 24 in Einern, darüber in Vierern (24, 28, 32 …). */
export function learnStep(n: number, direction: 1 | -1): number {
  if (direction === 1) return clampLearnGoal(n < 24 ? n + 1 : n + 4);
  return clampLearnGoal(n <= 24 ? n - 1 : n - 4);
}

export function withDefaultGoals(value: Partial<Goals> | undefined): Goals {
  return {
    learn: clampLearnGoal(value?.learn ?? DEFAULT_GOALS.learn),
    create: clampCreateGoal(value?.create ?? DEFAULT_GOALS.create),
    pause: value?.pause ?? DEFAULT_GOALS.pause,
  };
}

/** Hat der Tag mit diesen Zahlen mindestens eines der Ziele erreicht? */
export function metGoal(stats: Pick<DayStats, 'learned' | 'created'>, goals: Goals): boolean {
  return stats.learned >= goals.learn || stats.created >= goals.create;
}

/** Ist das Lernen-Ziel im Lauf einer Session neu erreicht worden (vorher darunter, jetzt darauf)? */
export function crossedLearnGoal(before: number, after: number, goals: Goals): boolean {
  return before < goals.learn && after >= goals.learn;
}
