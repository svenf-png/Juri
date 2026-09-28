import { addDays, dayStart, parseDayKey } from '@/domain/calendar/day';
import { newRemaining, type DueContext } from '@/domain/scheduler/queue';
import type { LearningSettings } from '@/domain/scheduler/settings';

/** Fälligkeit für den Lerntag `dayKey`: bis zum Ende des Tages, mit Rest des Limits für Neue. */
export function dueContext(
  dayKey: string,
  study: { settings: LearningSettings; startedToday: number },
  now: number = Date.now(),
): DueContext {
  return {
    now,
    endOfDay: dayStart(addDays(parseDayKey(dayKey), 1)).getTime(),
    newRemaining: newRemaining(study.settings.newPerDay, study.startedToday),
  };
}
