/**
 * Erfolge als reine Funktion: Verlauf, Serie und Meilensteine rein, fertige Texte und Zellen raus
 * (Erfolge.dc.html, iPadErfolge.dc.html). Die Oberfläche rechnet nichts mehr selbst.
 */
import type { Day } from '../calendar/day';
import { dayKey, parseDayKey } from '../calendar/day';
import type { DayRow } from '../model/records';
import { groupDigits } from '../today/today';
import type { Goals } from './goals';
import { badges, type Badge, type Metrics, type Unlock } from './milestones';
import { dayLabel, heatmap, WEEKS_PHONE, WEEKS_WIDE, type Heatmap } from './heatmap';
import type { StreakResult } from './streak';
import { activity, metricOf, type Mode } from './summary';

export interface HighFivesInput {
  readonly count: number;
  /** „Mara und Jonas“ */
  readonly names: string;
}

export interface ErfolgeInput {
  readonly today: Day;
  readonly rows: readonly DayRow[];
  readonly goals: Goals;
  readonly streak: StreakResult;
  readonly metrics: Metrics;
  readonly unlocked: ReadonlyMap<string, Unlock>;
  /** Kommt mit M11; bis dahin `null`. */
  readonly highFives?: HighFivesInput | null;
}

export interface HeatView {
  readonly phone: Heatmap;
  readonly wide: Heatmap;
  /** „Rekord: Mi, 23.9. · 86 Wiederholungen“ oder ein Hinweis ohne Rekord. */
  readonly recordText: string;
}

export interface ErfolgeModel {
  /** Noch nie gelernt oder angelegt: Leerzustand. */
  readonly empty: boolean;
  readonly streak: {
    readonly days: number;
    readonly unit: string;
    readonly note: string;
    readonly noteShort: string;
  };
  readonly reviews: { readonly value: string; readonly label: string };
  readonly created: { readonly value: string; readonly label: string };
  readonly heat: Readonly<Record<Mode, HeatView>>;
  readonly badges: readonly Badge[];
  /** Frisch freigeschaltet, Feier steht aus. */
  readonly fresh: readonly Badge[];
  readonly highFives: { readonly title: string; readonly sub: string } | null;
}

const unit = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Text unter der Serie: erklärt den Pausentag oder wie die Serie startet. */
export function streakNotes(
  streak: StreakResult,
  goals: Goals,
): { note: string; noteShort: string } {
  if (streak.current === 0) {
    return {
      note: 'Erreiche heute dein Tagesziel, dann startet deine Serie.',
      noteShort: 'Heute starten',
    };
  }
  if (!goals.pause) {
    return {
      note: 'Jeder Tag zählt: Ein Tag ohne erreichtes Ziel beendet die Serie.',
      noteShort: 'Ohne Pausentag',
    };
  }
  if (streak.pauseUsedThisWeek) {
    return {
      note: 'Pausentag diese Woche genutzt. Die Serie bleibt stehen, nichts geht verloren.',
      noteShort: 'Pausentag genutzt',
    };
  }
  return {
    note: '1 Pausentag pro Woche ist frei. Die Serie bleibt stehen, nichts geht verloren.',
    noteShort: '1 Pausentag pro Woche frei',
  };
}

function recordText(mode: Mode, record: { day: string; value: number } | null, today: Day) {
  if (!record) return mode === 'learn' ? 'Noch kein Rekord' : 'Noch keine Karte angelegt';
  const label = dayLabel(parseDayKey(record.day), today);
  const what =
    mode === 'learn'
      ? `${groupDigits(record.value)} ${unit(record.value, 'Wiederholung', 'Wiederholungen')}`
      : `${groupDigits(record.value)} ${unit(record.value, 'Karte', 'Karten')} angelegt`;
  return `Rekord: ${label} · ${what}`;
}

function heatView(rows: readonly DayRow[], mode: Mode, today: Day): HeatView {
  const act = activity(rows, mode);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const tip = (key: string, day: Day) => {
    const row = byDay.get(key);
    const value = row ? metricOf(row, mode) : 0;
    const what =
      mode === 'learn'
        ? value === 1
          ? '1 Wiederholung'
          : `${groupDigits(value)} Wiederholungen`
        : value === 1
          ? '1 Karte angelegt'
          : `${groupDigits(value)} Karten angelegt`;
    return `${dayLabel(day, today)}: ${value > 0 ? what : mode === 'learn' ? 'nichts gelernt' : 'nichts angelegt'}`;
  };
  const common = { today, level: act.level, record: act.record?.day ?? null, tip };
  return {
    phone: heatmap({ ...common, weeks: WEEKS_PHONE }),
    wide: heatmap({ ...common, weeks: WEEKS_WIDE }),
    recordText: recordText(mode, act.record, today),
  };
}

export function erfolgeModel(input: ErfolgeInput): ErfolgeModel {
  const { rows, today } = input;
  const all = badges(input.metrics, input.unlocked);
  let reviews = 0;
  let created = 0;
  for (const row of rows) {
    reviews += row.reviews;
    created += row.created;
  }
  const highFives = input.highFives;
  return {
    empty: !rows.some((row) => row.reviews > 0 || row.created > 0),
    streak: {
      days: input.streak.current,
      unit: unit(input.streak.current, 'Tag in Folge', 'Tage in Folge'),
      ...streakNotes(input.streak, input.goals),
    },
    reviews: {
      value: groupDigits(reviews),
      label: unit(reviews, 'Wiederholung', 'Wiederholungen'),
    },
    created: {
      value: groupDigits(created),
      label: unit(created, 'Karte angelegt', 'Karten angelegt'),
    },
    heat: { learn: heatView(rows, 'learn', today), make: heatView(rows, 'make', today) },
    badges: all,
    fresh: all.filter((b) => b.fresh),
    highFives:
      highFives && highFives.count > 0
        ? {
            title: `${highFives.count} ${unit(highFives.count, 'High five', 'High fives')} bekommen`,
            sub: `${highFives.names} · ${highFives.count} ${unit(highFives.count, 'Erfolg', 'Erfolge')} zum Abklatschen`,
          }
        : null,
  };
}

/** Schlüssel des heutigen Tages für Aufrufer, die nur ein `Day` haben. */
export const todayKey = (today: Day) => dayKey(today);
