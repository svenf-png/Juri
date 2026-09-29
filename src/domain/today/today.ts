/**
 * Der Heute-Bildschirm als reine Funktion: Rohdaten des Tages rein, fertige Texte und Listen
 * raus (Main.dc.html, iPadHeute.dc.html). Die Oberfläche rechnet nichts mehr selbst.
 *
 * Stand M2: Karten, Fristen, Tagesziele und High fives gibt es noch nicht; die Eingaben sind
 * so geschnitten, dass M3 (Karten), M4 (Fälligkeit), M8 (Fristen), M9 (Ziele, Stufen) und
 * M11 (High fives) sie nur noch befüllen.
 */
import { addDays, daysBetween, dayKey, parseDayKey, type Day } from '../calendar/day';
import { countdown, longDate, relativeDays, shortDate, weekdayShort } from '../format/date';
import type { Level } from '../progress/levels';

/** Tagesziel, bis M9 es einstellbar macht (Main.dc.html: 24). */
export const DEFAULT_DAILY_GOAL = 24;
/** Höchstzahl der Segmente in der Tagesziel-Leiste (Main.dc.html: 24 Spalten). */
export const GOAL_SEGMENTS_MAX = 24;
/** Fristen in der iPad-Spalte „Nächste Fristen“. */
export const DEADLINES_SHOWN = 2;
/** Tage in „Letzte 7 Tage“. */
export const WEEK_DAYS = 7;

export type { Level };

export interface AreaDue {
  readonly id: string;
  /** Kürzel, z. B. „ZR“. */
  readonly code: string;
  readonly name: string;
  readonly due: number;
}

export interface DeadlineInput {
  readonly id: string;
  readonly title: string;
  /** „JJJJ-MM-TT“. */
  readonly date: string;
  /** Anteil der Karten, die bis zur Frist sicher sitzen, 0 bis 100 (M8). */
  readonly secureShare?: number | undefined;
}

export interface HighFiveInput {
  readonly id: string;
  readonly name: string;
  /** Anlass ohne Namen, z. B. „hat 12 Tage in Folge geschafft“. */
  readonly text: string;
}

export interface TodayInput {
  readonly today: Day;
  /** Karten insgesamt; 0 heißt: noch keine angelegt. */
  readonly totalCards: number;
  /** Heute fällige Abfragen. */
  readonly due: number;
  readonly dueByArea: readonly AreaDue[];
  readonly goal: { readonly done: number; readonly target: number };
  /** Stufe je Tag (Schlüssel „JJJJ-MM-TT“); fehlende Tage haben Stufe 0. */
  readonly levels: Readonly<Record<string, Level>>;
  /** Rekordtag („JJJJ-MM-TT“), markiert, wenn er in der Woche liegt. */
  readonly recordDay: string | null;
  /** In den letzten 7 Tagen angelegte Karten. */
  readonly createdThisWeek: number;
  readonly deadlines: readonly DeadlineInput[];
  readonly highFive: HighFiveInput | null;
}

export interface WeekDay {
  readonly key: string;
  /** „Mo“, „Di“ … */
  readonly label: string;
  readonly level: Level;
  readonly today: boolean;
  readonly record: boolean;
}

export interface DeadlineRow {
  readonly id: string;
  readonly title: string;
  /** „Fr, 9.10. · 64 % sitzen sicher“ */
  readonly detail: string;
  /** „11 T“ */
  readonly countdown: string;
}

export interface TodayModel {
  /** „Montag, 28. September“ */
  readonly date: string;
  /** Zweizeilige Überschrift, `accent` in Veilchen: „18 Karten“ / „warten heute.“ */
  readonly headline: { readonly accent: string; readonly rest: string };
  /** Hauptknopf: Lernen, oder Karte anlegen, wenn nichts fällig ist. */
  readonly action: 'learn' | 'create';
  /** Nächste Frist als Chip: „Klausur Zivilrecht“ + „in 11 Tagen“. */
  readonly chip: { readonly title: string; readonly when: string } | null;
  readonly goal: {
    readonly done: number;
    readonly target: number;
    /** Ein Eintrag je Segment, `true` = erreicht. */
    readonly segments: readonly boolean[];
  };
  readonly week: readonly WeekDay[];
  /** „+3 Karten angelegt“, `null` ohne neue Karten. */
  readonly created: string | null;
  readonly areas: readonly AreaDue[];
  readonly deadlines: readonly DeadlineRow[];
  readonly highFive: HighFiveInput | null;
}

/** Tausenderpunkte: 1234 → „1.234“. */
export function groupDigits(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** „1 Karte“, „18 Karten“. */
export function cardCount(n: number): string {
  return `${groupDigits(n)} ${n === 1 ? 'Karte' : 'Karten'}`;
}

export function headline(totalCards: number, due: number): TodayModel['headline'] {
  if (totalCards <= 0) return { accent: 'Noch keine Karten.', rest: 'Leg los.' };
  if (due <= 0) return { accent: 'Alles erledigt', rest: 'für heute.' };
  return { accent: cardCount(due), rest: due === 1 ? 'wartet heute.' : 'warten heute.' };
}

/**
 * Segmente der Tagesziel-Leiste: eins je Karte bis 24, darüber 24 Segmente mit anteiliger
 * Füllung. Ohne Ziel (0) gibt es keine Leiste.
 */
export function goalSegments(done: number, target: number, max = GOAL_SEGMENTS_MAX): boolean[] {
  if (target <= 0) return [];
  const count = Math.min(target, max);
  const filled = Math.min(count, Math.floor((Math.max(0, done) * count) / target));
  return Array.from({ length: count }, (_, i) => i < filled);
}

/** Die letzten 7 Lerntage bis einschließlich heute, ältester zuerst. */
export function lastWeek(
  today: Day,
  levels: TodayInput['levels'],
  recordDay: string | null,
): WeekDay[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => {
    const day = addDays(today, i - (WEEK_DAYS - 1));
    const key = dayKey(day);
    return {
      key,
      label: weekdayShort(day),
      level: levels[key] ?? 0,
      today: i === WEEK_DAYS - 1,
      record: key === recordDay,
    };
  });
}

/** Kommende Fristen ab heute, nach Datum; vergangene fallen weg. */
export function upcomingDeadlines(today: Day, deadlines: readonly DeadlineInput[]) {
  return deadlines
    .map((d) => ({ ...d, day: parseDayKey(d.date) }))
    .filter((d) => daysBetween(today, d.day) >= 0)
    .sort((a, b) => daysBetween(b.day, a.day) || a.title.localeCompare(b.title, 'de'));
}

export function todayModel(input: TodayInput): TodayModel {
  const { today } = input;
  const deadlines = upcomingDeadlines(today, input.deadlines);
  const next = deadlines[0];
  const created = input.createdThisWeek;

  return {
    date: longDate(today),
    headline: headline(input.totalCards, input.due),
    action: input.totalCards > 0 && input.due > 0 ? 'learn' : 'create',
    chip: next ? { title: next.title, when: relativeDays(today, next.day) } : null,
    goal: {
      done: input.goal.done,
      target: input.goal.target,
      segments: goalSegments(input.goal.done, input.goal.target),
    },
    week: lastWeek(today, input.levels, input.recordDay),
    created: created > 0 ? `+${cardCount(created)} angelegt` : null,
    // Array.prototype.sort ist stabil: Bei gleicher Zahl bleibt die Reihenfolge der Eingabe.
    areas: input.dueByArea.filter((a) => a.due > 0).sort((x, y) => y.due - x.due),
    deadlines: deadlines.slice(0, DEADLINES_SHOWN).map((d) => ({
      id: d.id,
      title: d.title,
      detail:
        shortDate(d.day, today) +
        (d.secureShare === undefined ? '' : ` · ${Math.round(d.secureShare)}\u00A0% sitzen sicher`),
      countdown: countdown(today, d.day),
    })),
    highFive: input.highFive,
  };
}

/** Eingaben für einen Tag ohne Karten, Fristen und Verlauf (Stand M2 in der echten App). */
export function emptyToday(today: Day): TodayInput {
  return {
    today,
    totalCards: 0,
    due: 0,
    dueByArea: [],
    goal: { done: 0, target: DEFAULT_DAILY_GOAL },
    levels: {},
    recordDay: null,
    createdThisWeek: 0,
    deadlines: [],
    highFive: null,
  };
}
