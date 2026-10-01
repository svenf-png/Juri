/**
 * Wann eine Karte das nächste Mal dran ist, als kurzer Text für die Kartenliste: „heute fällig“,
 * „morgen“, „in 5 Tagen“, „Neu, heute“. Rein und ohne Uhr: `DueContext` liefert Jetzt, Ende des
 * Lerntags und den Rest des Tageslimits für Neue (Regeln in `queue.ts`).
 */
import { daysBetween, learningDay } from '../calendar/day';
import type { ReviewItem } from '../model/records';
import { newToStart, type DueContext } from './queue';
import { isNewItem } from './schedule';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Abstand in ganzen Lerntagen als Text: „morgen“, „in 5 Tagen“, „in 2 Monaten“, „in 1 Jahr“. */
export function inDays(days: number): string {
  if (days <= 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days <= 45) return `in ${days} Tagen`;
  if (days < 365) return `in ${plural(Math.round(days / 30), 'Monat', 'Monaten')}`;
  return `in ${plural(Math.round(days / 365), 'Jahr', 'Jahren')}`;
}

/** Text für die früheste Fälligkeit `due` (Millisekunden) zu Lerntag von `ctx.now`. */
export function dueText(due: number, ctx: DueContext): string {
  const days = daysBetween(learningDay(new Date(ctx.now)), learningDay(new Date(due)));
  if (days < 0) return `überfällig seit ${plural(-days, 'Tag', 'Tagen')}`;
  if (days === 0) return 'heute fällig';
  return `fällig ${inDays(days)}`;
}

/**
 * Ein Text je Karte-ID aus deren Abfragen. Mit Lernzustand zählt die früheste Fälligkeit. Ganz
 * neue Karten kommen bis zum Tageslimit heute dran (die ältesten zuerst), die übrigen später. Die
 * Reihenfolge der Neuen kennt nur die übergebene Menge, in der Stapelansicht also den Stapel.
 */
export function dueLabels(items: readonly ReviewItem[], ctx: DueContext): Map<string, string> {
  const today = new Set(newToStart(items, ctx.newRemaining).map((i) => i.id));
  const earliest = new Map<string, number>();
  const fresh = new Map<string, boolean>();
  for (const item of items) {
    if (isNewItem(item) || item.due === undefined) {
      fresh.set(item.cardId, (fresh.get(item.cardId) ?? false) || today.has(item.id));
    } else {
      earliest.set(item.cardId, Math.min(earliest.get(item.cardId) ?? Infinity, item.due));
    }
  }
  const labels = new Map<string, string>();
  for (const [cardId, due] of earliest) labels.set(cardId, dueText(due, ctx));
  for (const [cardId, comesToday] of fresh) {
    if (!labels.has(cardId))
      labels.set(cardId, comesToday ? 'Neu, heute dran' : 'Neu, kommt später');
  }
  return labels;
}
