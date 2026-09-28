import { useEffect, useMemo, useState } from 'react';
import { dayKey, learningDay, nextDayStart, parseDayKey } from '@/domain/calendar/day';
import { todayInputFrom } from '@/domain/today/build';
import { todayModel, type TodayModel } from '@/domain/today/today';
import { useTodayData } from '../library/queries';

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
 * Daten für Heute aus der Datenbank: Karten, Rechtsgebiete, fällige Abfragen und in der letzten
 * Woche angelegte Karten. Fristen, Ziele und Verlauf kommen mit M7 und M8. Bis die Datenbank
 * geantwortet hat, gibt es kein Modell (`null`), damit kein falscher Leerzustand aufblitzt.
 */
export function useToday(): TodayModel | null {
  const key = useLearningDayKey();
  const data = useTodayData(key);
  return useMemo(() => {
    if (data.status !== 'ready') return null;
    const { itemCounts, ...rest } = data.value;
    // Bis M4 (Lern-Engine) ist jede neue Abfrage fällig (Annahme A19).
    return todayModel(todayInputFrom(parseDayKey(key), { ...rest, dueByDeck: itemCounts }));
  }, [data, key]);
}
