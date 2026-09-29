/**
 * Adapter um ts-fsrs 5.x (ADR-004). Nur diese Datei kennt die Bibliothek; ein Wechsel der
 * Hauptversion betrifft nur sie. Gespeichert wird ein eigener Zustand (records.ts, `FsrsState`)
 * mit Zeiten in Millisekunden, nicht das Kartenobjekt der Bibliothek.
 *
 * Streuung (fuzz) ist aus: Die Vorschau auf den Knöpfen zeigt genau den Abstand, der danach gilt.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS,
  type Grade,
  type RecordLogItem,
} from 'ts-fsrs';
import type { FsrsState, NewReviewLogEntry } from '../model/records';
import type { RatingValue } from './rating';
import {
  LEARNING_STEPS,
  MAX_INTERVAL_DAYS,
  RELEARNING_STEPS,
  type LearningSettings,
} from './settings';

/** Zustände von ts-fsrs (`State`), als Zahl gespeichert. */
export const FSRS_STATE = { new: 0, learning: 1, review: 2, relearning: 3 } as const;

const STATES: readonly State[] = [State.New, State.Learning, State.Review, State.Relearning];
const GRADES: Readonly<Record<RatingValue, Grade>> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

const instances = new Map<number, FSRS>();

/** Ein Rechner je Behaltensquote; Neuanlegen ist billig, aber die Vorschau ruft ihn oft. */
function engine(retention: number): FSRS {
  let instance = instances.get(retention);
  if (!instance) {
    instance = fsrs(
      generatorParameters({
        request_retention: retention / 100,
        maximum_interval: MAX_INTERVAL_DAYS,
        enable_fuzz: false,
        enable_short_term: true,
        learning_steps: [...LEARNING_STEPS],
        relearning_steps: [...RELEARNING_STEPS],
      }),
    );
    instances.set(retention, instance);
  }
  return instance;
}

function toCard(state: FsrsState | undefined, now: number): Card {
  if (!state) return createEmptyCard(new Date(now));
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    // In ts-fsrs 5 veraltet und ungenutzt (die Abstände folgen aus `last_review`).
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: STATES[state.state] ?? State.New,
    ...(state.lastReview === undefined ? {} : { last_review: new Date(state.lastReview) }),
  };
}

const DAY_MS = 86_400_000;

/**
 * ts-fsrs hält den längsten Abstand nicht auf den Tag genau ein: „Leicht“ liegt mindestens einen
 * Tag über „Gut“, auch wenn „Gut“ schon am Limit ist. Juri kappt den Abstand selbst.
 */
function fromCard(card: Card): FsrsState {
  const excess = Math.max(0, card.scheduled_days - MAX_INTERVAL_DAYS);
  return {
    due: card.due.getTime() - excess * DAY_MS,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days - excess,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    ...(card.last_review ? { lastReview: card.last_review.getTime() } : {}),
  };
}

type FsrsLog = NewReviewLogEntry['fsrs'];

/** Ganze Tage seit der letzten Bewertung (0 bei einer neuen Abfrage). */
function elapsedDays(state: FsrsState | undefined, now: number): number {
  return state?.lastReview === undefined
    ? 0
    : Math.max(0, Math.floor((now - state.lastReview) / DAY_MS));
}

function toLog(item: RecordLogItem, elapsed: number): FsrsLog {
  const { log } = item;
  return {
    state: log.state,
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: elapsed,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
  };
}

export interface FsrsOutcome {
  readonly state: FsrsState;
  readonly log: FsrsLog;
}

/** Ergebnis einer Bewertung; `state` ist `undefined` bei einer neuen Abfrage. */
export function fsrsReview(
  state: FsrsState | undefined,
  rating: RatingValue,
  now: number,
  settings: Pick<LearningSettings, 'retention'>,
): FsrsOutcome {
  const result = engine(settings.retention).next(toCard(state, now), new Date(now), GRADES[rating]);
  return { state: fromCard(result.card), log: toLog(result, elapsedDays(state, now)) };
}

/** Alle vier möglichen Ergebnisse, z. B. für die Intervallvorschau. */
export function fsrsPreview(
  state: FsrsState | undefined,
  now: number,
  settings: Pick<LearningSettings, 'retention'>,
): Record<RatingValue, FsrsOutcome> {
  const all = engine(settings.retention).repeat(toCard(state, now), new Date(now));
  const outcome = (rating: RatingValue): FsrsOutcome => {
    const result = all[GRADES[rating]];
    return { state: fromCard(result.card), log: toLog(result, elapsedDays(state, now)) };
  };
  return { 1: outcome(1), 2: outcome(2), 3: outcome(3), 4: outcome(4) };
}

/**
 * Behaltene Abstände bei durchgehend „Gut“ (Einstellungen.dc.html, „Beispiel: immer Gut“): die
 * Abstände der ersten fünf Wiederholungen in Tagen, ab dem ersten Tag im Rhythmus „Wiederholen“.
 */
export function goodStreak(
  settings: Pick<LearningSettings, 'retention'>,
  steps = 5,
  start = 0,
): number[] {
  let state: FsrsState | undefined;
  let now = start;
  const days: number[] = [];
  // Erst durch die Lernschritte, bis die Abfrage im Zustand „Wiederholen“ ist.
  for (let guard = 0; guard < 20 && days.length < steps; guard += 1) {
    const out = fsrsReview(state, 3, now, settings);
    const wait = out.state.due - now;
    if (out.state.state === FSRS_STATE.review) days.push(wait / 86_400_000);
    state = out.state;
    now = out.state.due;
  }
  return days;
}
