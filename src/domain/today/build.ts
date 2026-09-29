/**
 * Eingaben für Heute aus den Daten der Bibliothek (ab M3) und dem Lernzustand (ab M4). Ziele
 * kommen mit M9.
 */
import { addDays, dayKey, learningDay, type Day } from '../calendar/day';
import { sortAreas } from '../library/areas';
import type { Area, Deck } from '../model/records';
import { DEFAULT_DAILY_GOAL, emptyToday, WEEK_DAYS, type TodayInput } from './today';

export interface TodayData {
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  /** Karten insgesamt. */
  readonly cardTotal: number;
  /** Heute fällige Abfragen je Stapel-ID. */
  readonly dueByDeck: Readonly<Record<string, number>>;
  /** Heute fällige Abfragen insgesamt (das Limit für neue gilt hier einmal, nicht je Stapel). */
  readonly dueTotal: number;
  /** Abfragen, die heute mindestens einmal bewertet wurden (Tagesziel „Lernen“, Annahme A5). */
  readonly reviewedToday: number;
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
  // Ziele, Verlauf, Fristen und High five kommen mit M8, M9 und M11; bis dahin gilt der Leerwert.
  return {
    ...emptyToday(today),
    totalCards: data.cardTotal,
    due: data.dueTotal,
    dueByArea: dueByArea(data.areas, data.decks, data.dueByDeck),
    createdThisWeek: createdWithin(today, data.createdAt, WEEK_DAYS),
    goal: { done: data.reviewedToday, target: DEFAULT_DAILY_GOAL },
  };
}
