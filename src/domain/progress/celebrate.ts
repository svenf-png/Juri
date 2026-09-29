/**
 * Feier „Tagesziel erreicht“ (Fertig.dc.html): Was am Ende einer Session gezeigt wird, wenn das
 * Lernen-Ziel im Lauf der Session neu erreicht wurde.
 */
import type { Day } from '../calendar/day';
import { dayKey } from '../calendar/day';
import type { DayRow } from '../model/records';
import { lastWeek, type WeekDay } from '../today/today';
import { weekActivity, rankOf } from './summary';
import type { Badge } from './milestones';

export interface FertigInput {
  readonly today: Day;
  readonly rows: readonly DayRow[];
  readonly target: number;
  /** Serie inklusive heute. */
  readonly streak: number;
  /** Meilensteine, deren Feier noch aussteht. */
  readonly fresh: readonly Badge[];
}

export interface FertigModel {
  /** „24 von 24 Karten · 13 Tage in Folge“ */
  readonly summary: string;
  readonly week: readonly WeekDay[];
  /** „Heute leuchtet voll: dein zweitstärkster Tag.“ */
  readonly caption: string;
  /** Höchstens ein Meilenstein wird groß gezeigt; weitere stehen in Erfolge. */
  readonly milestone: Badge | null;
  readonly moreMilestones: number;
}

const RANKS: Readonly<Record<number, string>> = {
  1: 'dein stärkster Tag',
  2: 'dein zweitstärkster Tag',
  3: 'dein drittstärkster Tag',
};

export function caption(rank: number | null, level: number): string {
  const named = rank === null ? undefined : RANKS[rank];
  if (named) return `Heute leuchtet voll: ${named}.`;
  if (level >= 4) return 'Heute leuchtet voll.';
  return 'Geschafft. Morgen geht es weiter.';
}

export function fertigModel(input: FertigInput): FertigModel {
  const key = dayKey(input.today);
  const { levels, recordDay } = weekActivity(input.rows);
  const done = input.rows.find((row) => row.day === key)?.learned ?? 0;
  const days = input.streak;
  const serie = days > 0 ? ` · ${days} ${days === 1 ? 'Tag' : 'Tage'} in Folge` : '';
  const [first, ...rest] = input.fresh;
  return {
    summary: `${done} von ${input.target} Karten${serie}`,
    week: lastWeek(input.today, levels, recordDay),
    caption: caption(rankOf(input.rows, key), levels[key] ?? 0),
    milestone: first ?? null,
    moreMilestones: rest.length,
  };
}
