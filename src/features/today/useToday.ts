import { useEffect, useMemo, useState } from 'react';
import { dayKey, learningDay, nextDayStart, parseDayKey } from '@/domain/calendar/day';
import { dueSummary } from '@/domain/scheduler/queue';
import { todayInputFrom } from '@/domain/today/build';
import { todayModel, type TodayModel } from '@/domain/today/today';
import { useTodayData } from '../library/queries';
import { dueContext } from '../study/due';

/**
 * Aktueller Lerntag („JJJJ-MM-TT“). Wechselt um 04:00 von selbst und prüft neu, wenn Juri aus
 * dem Hintergrund zurückkommt (iOS hält Zeitgeber im Hintergrund an).
 */
export function useLearningDayKey(): string {
  const [key, setKey] = useState(() => dayKey(learningDay(new Date())));
  useEffect(() => {
    const refresh = () => {
      setKey(dayKey(learningDay(new Date())));
    };
    const timer = window.setTimeout(
      refresh,
      nextDayStart(new Date()).getTime() - Date.now() + 1000,
    );
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [key]);
  return key;
}

/**
 * Daten für Heute aus der Datenbank: Karten, Rechtsgebiete, fällige Abfragen, heute bewertete
 * Abfragen und in der letzten Woche angelegte Karten. Fristen und Verlauf kommen mit M7 und M8. Bis die Datenbank
 * geantwortet hat, gibt es kein Modell (`model: null`), damit kein falscher Leerzustand aufblitzt;
 * scheitert die Datenbank, ist `failed` gesetzt.
 */
export function useToday(): { model: TodayModel | null; failed: boolean } {
  const key = useLearningDayKey();
  const data = useTodayData(key);
  const model = useMemo(() => {
    if (data.status !== 'ready') return null;
    const { items, settings, startedToday, ...rest } = data.value;
    const due = dueSummary(items, dueContext(key, { settings, startedToday }));
    return todayModel(
      todayInputFrom(parseDayKey(key), { ...rest, dueByDeck: due.byDeck, dueTotal: due.total }),
    );
  }, [data, key]);
  return { model, failed: data.status === 'error' };
}
