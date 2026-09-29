/**
 * Serie (Entscheidung 6): aufeinanderfolgende Tage, an denen das Tagesziel erreicht wurde.
 * - Das Anlegen-Ziel zählt wie das Lernen-Ziel (das steckt in `met`).
 * - Ein Tag, an dem keine Karten verfügbar waren, bricht die Serie nicht und zählt nicht mit.
 * - Pausentag: Der erste verpasste Tag einer Woche (Montag bis Sonntag) bricht die Serie nicht,
 *   der zweite schon. Er zählt nicht mit; die Serie bleibt stehen.
 * - Der heutige Tag ist offen: Ohne erreichtes Ziel zählt er weder mit noch bricht er.
 */
import { addDays, dayKey, daysBetween, parseDayKey, weekday, type Day } from '../calendar/day';

export interface StreakInput {
  /** Tage mit Aktivität und ob das Ziel erreicht wurde (Schlüssel „JJJJ-MM-TT“). */
  readonly met: ReadonlyMap<string, boolean>;
  readonly today: Day;
  readonly pause: boolean;
  /** Lagen an diesem Tag Karten zum Lernen bereit? Wird nur für verpasste Tage gefragt. */
  readonly available: (day: string) => boolean;
}

export interface StreakResult {
  /** Tage in Folge bis heute. */
  readonly current: number;
  /** Längste Serie im Verlauf. */
  readonly best: number;
  /** Heutiges Ziel erreicht. */
  readonly todayMet: boolean;
  /** In der laufenden Woche wurde der Pausentag schon gebraucht. */
  readonly pauseUsedThisWeek: boolean;
}

/** Montag der Woche, in der `d` liegt. */
export function weekStart(d: Day): Day {
  return addDays(d, -((weekday(d) + 6) % 7));
}

export const NO_STREAK: StreakResult = {
  current: 0,
  best: 0,
  todayMet: false,
  pauseUsedThisWeek: false,
};

export function streak(input: StreakInput): StreakResult {
  const { met, today } = input;
  const firstKey = [...met.keys()].sort()[0];
  const todayKey = dayKey(today);
  const todayMet = met.get(todayKey) === true;
  if (firstKey === undefined || firstKey > todayKey) return { ...NO_STREAK, todayMet };

  const first = parseDayKey(firstKey);
  let current = 0;
  let best = 0;
  let pauseWeek = '';
  const span = daysBetween(first, today);
  for (let i = 0; i < span; i++) {
    const day = addDays(first, i);
    const key = dayKey(day);
    if (met.get(key) === true) {
      current += 1;
      best = Math.max(best, current);
    } else if (!input.available(key)) {
      continue;
    } else if (input.pause && pauseWeek !== dayKey(weekStart(day))) {
      pauseWeek = dayKey(weekStart(day));
    } else {
      current = 0;
    }
  }
  if (todayMet) {
    current += 1;
    best = Math.max(best, current);
  }
  return {
    current,
    best,
    todayMet,
    pauseUsedThisWeek: pauseWeek === dayKey(weekStart(today)),
  };
}
