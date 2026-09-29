import { useMemo } from 'react';
import { parseDayKey } from '@/domain/calendar/day';
import { readDeadlinesSnapshot } from '@/data/repositories/deadlines';
import { deadlinesModel } from '@/domain/deadlines/list';
import { useLearningDayKey } from '../today/useToday';
import { useLive } from '../library/useLive';

/** Fristen mit Anzeige-Texten; `failed`, wenn die Datenbank nicht antwortet. */
export function useDeadlines() {
  const key = useLearningDayKey();
  const data = useLive('deadlines', readDeadlinesSnapshot);
  const model = useMemo(() => {
    if (data.status !== 'ready') return null;
    const { deadlines, items, world, areas, decks } = data.value;
    return deadlinesModel({ deadlines, items, world, areas, decks, today: parseDayKey(key) });
  }, [data, key]);
  return {
    model,
    snapshot: data.status === 'ready' ? data.value : null,
    today: parseDayKey(key),
    failed: data.status === 'error',
  };
}

/** Anzahl der Fristen, z. B. für die Zeile unter Lernrhythmus; `undefined`, bis sie gelesen ist. */
export function useDeadlineCount(): number | undefined {
  const data = useLive('deadline-count', (db) => db.deadlines.count());
  return data.status === 'ready' ? data.value : undefined;
}
