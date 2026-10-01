import { useCallback, useMemo } from 'react';
import { parseDayKey } from '@/domain/calendar/day';
import { readErfolge, readGoals } from '@/data/repositories/progress';
import { erfolgeHighFives } from '@/domain/highfive/view';
import { erfolgeModel } from '@/domain/progress/erfolge';
import type { Goals } from '@/domain/progress/goals';
import { useHighFives } from '../highfive/queries';
import { useLive, type Live } from '../library/useLive';
import { useLearningDayKey } from '../today/useToday';

/** Erfolge mit Verlauf, Serie und Meilensteinen; `failed`, wenn die Datenbank nicht antwortet. */
export function useErfolge() {
  const key = useLearningDayKey();
  const query = useCallback(
    (db: Parameters<typeof readErfolge>[0]) => readErfolge(db, parseDayKey(key)),
    [key],
  );
  const data = useLive(`erfolge:${key}`, query);
  const highFives = useHighFives();
  const model = useMemo(
    () =>
      data.status === 'ready' && (highFives.model || highFives.failed)
        ? erfolgeModel({
            ...data.value,
            today: parseDayKey(key),
            highFives: highFives.model ? erfolgeHighFives(highFives.model) : null,
          })
        : null,
    [data, key, highFives],
  );
  return {
    model,
    goals: data.status === 'ready' ? data.value.goals : null,
    failed: data.status === 'error',
  };
}

/** Tagesziele, live aus der Datenbank. */
export function useGoals(): Live<Goals> {
  const query = useCallback((db: Parameters<typeof readGoals>[0]) => readGoals(db), []);
  return useLive('goals', query);
}
