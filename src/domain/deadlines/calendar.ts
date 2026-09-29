/**
 * Fristen als Kalenderdatei (.ics, RFC 5545): je Frist ein ganztägiger Termin mit Erinnerung am
 * Vortag um 09:00, dazu ein Termin für den Beginn des Endspurts. Die UID bleibt je Frist gleich,
 * damit ein erneuter Import den Termin aktualisiert statt ihn zu verdoppeln.
 */
import { buildIcsCalendar, type IcsDayEvent } from '../calendar/ics';
import { dayKey, daysBetween, parseDayKey, type Day } from '../calendar/day';
import type { Deadline } from '../model/records';
import { activeDeadlines, sprintStart } from './effective';
import { KIND_LABELS } from './form';

/** Erinnerung am Vortag um 09:00, gerechnet ab 00:00 des Fristtags. */
export const ALARM_DAY_BEFORE_MINUTES = 15 * 60;
/** Erinnerung am Morgen des Endspurt-Beginns um 09:00. */
export const ALARM_SAME_DAY_MINUTES = -9 * 60;

export function deadlineEvents(
  deadlines: readonly Deadline[],
  today: Day,
  now: Date,
): IcsDayEvent[] {
  return activeDeadlines(deadlines, today).flatMap((d) => {
    const date = parseDayKey(d.date);
    const events: IcsDayEvent[] = [
      {
        uid: `frist-${d.id}@juri`,
        title: d.name,
        description: `${KIND_LABELS[d.kind]} in Juri`,
        day: date,
        alarmMinutesBefore: ALARM_DAY_BEFORE_MINUTES,
        now,
      },
    ];
    const from = sprintStart(date);
    if (d.sprint && daysBetween(today, from) >= 0) {
      events.push({
        uid: `frist-${d.id}-endspurt@juri`,
        title: `Endspurt: ${d.name}`,
        description: `Ab heute kommt jede Karte noch einmal, bis zur Frist am ${dayKey(date)}.`,
        day: from,
        alarmMinutesBefore: ALARM_SAME_DAY_MINUTES,
        now,
      });
    }
    return events;
  });
}

/** Kalenderdatei aller kommenden Fristen mit Datum; `null`, wenn es keine gibt. */
export function deadlinesIcs(deadlines: readonly Deadline[], today: Day, now: Date): string | null {
  const events = deadlineEvents(deadlines, today, now);
  return events.length ? buildIcsCalendar(events) : null;
}

export function icsFileName(today: Day): string {
  return `juri-fristen-${dayKey(today)}.ics`;
}
