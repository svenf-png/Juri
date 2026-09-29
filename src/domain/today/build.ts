/**
 * Eingaben für Heute aus den Daten der Bibliothek (ab M3), dem Lernzustand (ab M4), den Fristen
 * (M8) sowie Zielen und Verlauf (M9).
 */
import { addDays, dayKey, learningDay, type Day } from '../calendar/day';
import { sortAreas } from '../library/areas';
import type { Area, DayRow, Deck } from '../model/records';
import type { Goals } from '../progress/goals';
import { weekActivity } from '../progress/summary';
import { emptyToday, WEEK_DAYS, type DeadlineInput, type TodayInput } from './today';

export interface TodayData {
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  /** Karten insgesamt. */
  readonly cardTotal: number;
  /** Heute fällige Abfragen je Stapel-ID. */
  readonly dueByDeck: Readonly<Record<string, number>>;
  /** Heute fällige Abfragen insgesamt (das Limit für neue gilt hier einmal, nicht je Stapel). */
  readonly dueTotal: number;
  /** Zeitpunkte der Ereignisse „Karte angelegt“ (mindestens die letzten 7 Lerntage). */
  readonly createdAt: readonly number[];
  /** Kommende Fristen mit Sicherheitsquote (M8). */
  readonly deadlines: readonly DeadlineInput[];
  /** Tagesaggregate des gesamten Verlaufs (M9): Stufen und Rekordtag. */
  readonly days: readonly DayRow[];
  /** Tagesziele (M9). */
  readonly goals: Goals;
}

/** Karten, die an einem der letzten `days` Lerntage angelegt wurden (Tag `today` eingeschlossen). */
export function createdWithin(today: Day, at: readonly number[], days: number): number {
  const first = dayKey(addDays(today, 1 - days));
  const last = dayKey(today);
  return at.filter((ms) => {
    const key = dayKey(learningDay(new Date(ms)));
    return key >= first && key <= last;
  }).length;
}

/** Heute fällige Abfragen je Rechtsgebiet. Ein Stapel in zwei Rechtsgebieten zählt in beiden. */
export function dueByArea(
  areas: readonly Area[],
  decks: readonly Deck[],
  dueByDeck: TodayData['dueByDeck'],
) {
  return sortAreas(areas).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    due: decks
      .filter((d) => d.areaIds.includes(a.id))
      .reduce((sum, d) => sum + (dueByDeck[d.id] ?? 0), 0),
  }));
}

export function todayInputFrom(today: Day, data: TodayData): TodayInput {
  // Die High fives kommen mit M11; bis dahin gilt der Leerwert.
  const { levels, recordDay } = weekActivity(data.days);
  return {
    ...emptyToday(today),
    totalCards: data.cardTotal,
    due: data.dueTotal,
    dueByArea: dueByArea(data.areas, data.decks, data.dueByDeck),
    createdThisWeek: createdWithin(today, data.createdAt, WEEK_DAYS),
    goal: {
      done: data.days.find((row) => row.day === dayKey(today))?.learned ?? 0,
      target: data.goals.learn,
    },
    levels,
    recordDay,
    deadlines: data.deadlines,
  };
}
