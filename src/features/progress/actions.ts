import {
  markSeen,
  readCelebration,
  readErfolge,
  syncMilestones,
  writeGoals,
} from '@/data/repositories/progress';
import { dayKey, learningDay } from '@/domain/calendar/day';
import { fertigModel, type FertigModel } from '@/domain/progress/celebrate';
import { crossedLearnGoal, type Goals } from '@/domain/progress/goals';
import { badges } from '@/domain/progress/milestones';
import { database } from '../app/database';

/** Speichert die Tagesziele; der heutige Tag wird nach den neuen Zielen bewertet. */
export function saveGoals(goals: Goals): Promise<void> {
  return writeGoals(database(), goals, Date.now());
}

/** Markiert Meilensteine als gefeiert. */
export function acknowledgeMilestones(ids: readonly string[]): Promise<void> {
  return markSeen(database(), ids);
}

/** Holt Meilensteine nach, die der Verlauf schon erreicht hat (nach einem Update oder Backup). */
export function catchUpMilestones(): Promise<string[]> {
  return syncMilestones(database(), Date.now());
}

/**
 * Feier am Ende einer Session: `null`, wenn das Lernen-Ziel in dieser Session nicht neu erreicht
 * wurde. `milestones` sind die Meilensteine mit ausstehender Feier; der Aufrufer markiert sie mit
 * `acknowledgeMilestones`, sobald die Feier zu sehen war.
 */
export async function celebrationAfterSession(start: {
  learned: number;
  goals: Goals;
}): Promise<{ model: FertigModel; milestones: string[] } | null> {
  const now = new Date();
  const today = learningDay(now);
  const snap = await readCelebration(database(), today);
  const key = dayKey(today);
  const learned = snap.rows.find((row) => row.day === key)?.learned ?? 0;
  if (!crossedLearnGoal(start.learned, learned, start.goals)) return null;
  const erfolge = await readErfolge(database(), today);
  const fresh = badges(erfolge.metrics, erfolge.unlocked).filter((b) => snap.fresh.includes(b.id));
  const model = fertigModel({
    today,
    rows: snap.rows,
    target: start.goals.learn,
    streak: snap.streak,
    fresh,
  });
  return { model, milestones: snap.fresh };
}
