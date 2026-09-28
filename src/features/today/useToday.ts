import { useEffect, useMemo, useState } from 'react';
import { dayKey, learningDay, nextDayStart, parseDayKey } from '@/domain/calendar/day';
import { emptyToday, todayModel, type TodayModel } from '@/domain/today/today';

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
 * Daten für Heute. Stand M2 gibt es weder Karten noch Fristen, Ziele oder Verlauf in der
 * Datenbank: Das Modell zeigt den Leerzustand mit dem heutigen Datum. Ab M3 kommen die
 * Eingaben aus den Repositories.
 */
export function useToday(): TodayModel {
  const key = useLearningDayKey();
  return useMemo(() => todayModel(emptyToday(parseDayKey(key))), [key]);
}
