/**
 * Eingaben für Heute aus den Daten der Bibliothek (ab M3). Fälligkeit und Ziele kommen
 * mit M4 und M8; bis dahin zählt jede neue Abfrage als fällig (Annahme A19).
 */
import { addDays, dayKey, learningDay, type Day } from '../calendar/day';
import { sortAreas } from '../library/areas';
import type { Area, Deck } from '../model/records';
import { DEFAULT_DAILY_GOAL, WEEK_DAYS, type TodayInput } from './today';

export interface TodayData {
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  /** Karten insgesamt. */
  readonly cardTotal: number;
  /** Heute fällige Abfragen je Stapel-ID. */
  readonly dueByDeck: Readonly<Record<string, number>>;
  /** Zeitpunkte der Ereignisse „Karte angelegt“ (mindestens die letzten 7 Lerntage). */
  readonly createdAt: readonly number[];
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
  return {
    today,
    totalCards: data.cardTotal,
    due: Object.values(data.dueByDeck).reduce((a, b) => a + b, 0),
    dueByArea: dueByArea(data.areas, data.decks, data.dueByDeck),
    goal: { done: 0, target: DEFAULT_DAILY_GOAL },
    levels: {},
    recordDay: null,
    createdThisWeek: createdWithin(today, data.createdAt, WEEK_DAYS),
    deadlines: [],
    highFive: null,
  };
}
