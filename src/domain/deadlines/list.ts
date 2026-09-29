/**
 * Die Fristen-Liste als reine Funktion (Fristen.dc.html): Rohdaten rein, fertige Texte raus.
 * Die nächste Frist mit Datum ist die große Karte mit Fortschritt, weitere mit Datum sind
 * Umrisskarten, Fristen ohne Datum gestrichelt, abgelaufene ganz unten und gedämpft.
 */
import { daysBetween, parseDayKey, type Day } from '../calendar/day';
import { shortDate } from '../format/date';
import { sortAreas } from '../library/areas';
import type { Area, Deadline, DeadlineScope, Deck, ReviewItem } from '../model/records';
import { KIND_LABELS } from './form';
import { deadlineStatus, type DeadlineStatus } from './status';
import type { ScopeWorld } from './scope';

export type Tone = 'hero' | 'plain' | 'undated' | 'expired';

export interface DeadlineCard {
  readonly id: string;
  readonly tone: Tone;
  /** „Klausur“, „LL.M.“ */
  readonly eyebrow: string;
  readonly name: string;
  /** „Fr, 9.10. · ZR · 3 Stapel · 101 Karten“ */
  readonly detail: string;
  /** Zahl rechts, z. B. „11“ mit „Tage“; „Heute“ ohne Einheit; `null` ohne Datum oder abgelaufen. */
  readonly count: { readonly big: string; readonly unit: string } | null;
  /** Fortschrittsleiste der großen Karte. */
  readonly progress: { readonly percent: number; readonly label: string } | null;
  /** „Endspurt ab Fr, 2.10.“ oder „Endspurt läuft“; `null` ohne Endspurt. */
  readonly sprint: string | null;
  readonly status: DeadlineStatus;
}

export interface DeadlinesModel {
  readonly cards: readonly DeadlineCard[];
  readonly empty: boolean;
}

export interface DeadlinesInput {
  readonly deadlines: readonly Deadline[];
  readonly items: readonly ReviewItem[];
  readonly world: ScopeWorld;
  readonly areas: readonly Area[];
  readonly decks: readonly Deck[];
  readonly today: Day;
}

const plural = (n: number, one: string, many: string) => `${String(n)} ${n === 1 ? one : many}`;

/** Umfang in Worten: „ZR, ÖR“, „Tag #LLM“, „Alle Rechtsgebiete“. */
export function scopeLabel(
  scope: DeadlineScope,
  areas: readonly Area[],
  decks: readonly Deck[],
): string {
  if (scope.all) return 'Alle Rechtsgebiete';
  const parts: string[] = [];
  const codes = sortAreas(areas)
    .filter((a) => scope.areaIds.includes(a.id))
    .map((a) => a.code);
  if (codes.length) parts.push(codes.join(', '));
  const names = decks.filter((d) => scope.deckIds.includes(d.id)).map((d) => d.name);
  if (names.length === 1) parts.push(names[0] ?? '');
  else if (names.length > 1) parts.push(`${String(names.length)} Stapel gewählt`);
  if (scope.tags.length) {
    parts.push(
      `${scope.tags.length === 1 ? 'Tag' : 'Tags'} ${scope.tags.map((t) => `#${t}`).join(', ')}`,
    );
  }
  return parts.length ? parts.join(', ') : 'Kein Umfang gewählt';
}

function countOf(status: DeadlineStatus): DeadlineCard['count'] {
  const n = status.daysLeft;
  if (n === null || n < 0) return null;
  if (n === 0) return { big: 'Heute', unit: '' };
  return { big: String(n), unit: n === 1 ? 'Tag' : 'Tage' };
}

function detailOf(deadline: Deadline, status: DeadlineStatus, input: DeadlinesInput): string {
  const label = scopeLabel(deadline.scope, input.areas, input.decks);
  if (deadline.date === undefined) return label;
  const parts = [shortDate(parseDayKey(deadline.date), input.today), label];
  if (status.phase === 'expired') return parts.join(' · ');
  const viaAreas = deadline.scope.all || deadline.scope.areaIds.length > 0;
  if (viaAreas) parts.push(plural(status.decks, 'Stapel', 'Stapel'));
  parts.push(plural(status.cards, 'Karte', 'Karten'));
  return parts.join(' · ');
}

function sprintText(status: DeadlineStatus, today: Day): string | null {
  if (!status.sprintFrom || status.phase === 'expired') return null;
  return status.phase === 'sprint'
    ? 'Endspurt läuft'
    : `Endspurt ab ${shortDate(status.sprintFrom, today)}`;
}

/** Reihenfolge: bevorstehende nach Datum, dann ohne Datum, dann abgelaufene (jüngste zuerst). */
function rank(status: DeadlineStatus): number {
  if (status.phase === 'expired') return 2;
  return status.phase === 'undated' ? 1 : 0;
}

export function deadlinesModel(input: DeadlinesInput): DeadlinesModel {
  const rows = input.deadlines
    .map((deadline) => ({
      deadline,
      status: deadlineStatus(deadline, input.items, input.world, input.today),
    }))
    .sort((a, b) => {
      const byRank = rank(a.status) - rank(b.status);
      if (byRank) return byRank;
      const x = a.deadline.date ?? '';
      const y = b.deadline.date ?? '';
      const byDate = a.status.phase === 'expired' ? y.localeCompare(x) : x.localeCompare(y);
      return (
        byDate ||
        a.deadline.name.localeCompare(b.deadline.name, 'de') ||
        a.deadline.id.localeCompare(b.deadline.id)
      );
    });
  let heroTaken = false;
  const cards = rows.map(({ deadline, status }): DeadlineCard => {
    const dated = status.phase === 'upcoming' || status.phase === 'sprint';
    const hero = dated && !heroTaken;
    if (hero) heroTaken = true;
    let tone: Tone = 'plain';
    if (hero) tone = 'hero';
    else if (status.phase === 'undated') tone = 'undated';
    else if (status.phase === 'expired') tone = 'expired';
    return {
      id: deadline.id,
      tone,
      eyebrow: KIND_LABELS[deadline.kind],
      name: deadline.name,
      detail: detailOf(deadline, status, input),
      count: countOf(status),
      progress:
        hero && status.secure !== null
          ? { percent: status.secure, label: `${String(status.secure)}\u00A0% sitzen sicher` }
          : null,
      sprint: hero ? sprintText(status, input.today) : null,
      status,
    };
  });
  return { cards, empty: cards.length === 0 };
}

/** Kommende Fristen für Heute: mit Datum ab heute, samt Sicherheitsquote. */
export function todayDeadlines(input: DeadlinesInput) {
  return input.deadlines
    .filter((d) => d.date !== undefined && daysBetween(input.today, parseDayKey(d.date)) >= 0)
    .map((d) => {
      const status = deadlineStatus(d, input.items, input.world, input.today);
      return {
        id: d.id,
        title: d.name,
        date: d.date ?? '',
        secureShare: status.secure ?? undefined,
      };
    });
}

/** Angaben für die Löschbestätigung: Datum und Umfang in Worten. */
export function deadlineFacts(
  deadline: Deadline,
  status: DeadlineStatus,
  areas: readonly Area[],
  decks: readonly Deck[],
  today: Day,
): { readonly date: string; readonly scope: string } {
  const scope = scopeLabel(deadline.scope, areas, decks);
  return {
    date: deadline.date === undefined ? 'Ohne Datum' : shortDate(parseDayKey(deadline.date), today),
    scope: status.items > 0 ? `${scope}, ${plural(status.decks, 'Stapel', 'Stapel')}` : scope,
  };
}
