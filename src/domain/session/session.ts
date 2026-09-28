/**
 * Lernsession als Zustandsmaschine (Architektur, Entscheidungen 3 und 4; Annahme A4). Rein:
 * jede Funktion nimmt einen Zustand und gibt den nächsten zurück. Die Oberfläche zeigt den
 * Zustand und ruft die Übergänge auf; Speichern und Undo in der Datenbank sind Sache der
 * Anwendungsschicht, die Maschine sagt nur, welche Abfragen betroffen sind.
 *
 * Eine Station ist eine Ansicht: eine Frage, ein einzelner Lückentext oder mehrere fällige Lücken
 * derselben Karte gebündelt (Luecke.dc.html). Eine Bewertung gilt für jede Abfrage der Station.
 */
import { clozeNumbers, gapSub } from '../cards/cloze';
import type { ReviewItem } from '../model/records';
import type { RatingKey } from '../scheduler/rating';
import { RATING_KEYS } from '../scheduler/rating';

export interface Station {
  /** Die Karten-ID, eindeutig in der Session. */
  readonly key: string;
  readonly cardId: string;
  /** Abfragen dieser Station, Lücken nach Nummer. Mehr als eine heißt: gebündelte Lücken. */
  readonly itemIds: readonly string[];
}

/** Nummer aus einer Abfrage-Kennung: `c3` → 3; die ganze Karte (`''`) ist 0. */
function gapNumber(sub: string): number {
  return sub === '' ? 0 : Number(sub.slice(1));
}

/**
 * Stationen aus den Abfragen einer Session (in Reihenfolge). Lücken derselben Karte kommen an die
 * Stelle der ersten in eine Station (Entscheidung 3), jede andere Abfrage bildet eine eigene.
 */
export function stationsFrom(items: readonly ReviewItem[]): Station[] {
  const stations: { key: string; cardId: string; items: ReviewItem[] }[] = [];
  const byCard = new Map<string, (typeof stations)[number]>();
  for (const item of items) {
    const existing = byCard.get(item.cardId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const station = { key: item.cardId, cardId: item.cardId, items: [item] };
    byCard.set(item.cardId, station);
    stations.push(station);
  }
  return stations.map((s) => ({
    key: s.key,
    cardId: s.cardId,
    itemIds: s.items.sort((a, b) => gapNumber(a.sub) - gapNumber(b.sub)).map((i) => i.id),
  }));
}

/** Wie viele Abfragen in der Session stecken (Bündel zählen mit allen Lücken). */
export function itemCount(stations: readonly Station[]): number {
  return stations.reduce((sum, s) => sum + s.itemIds.length, 0);
}

/** Nach einem „Nochmal“ kommt eine Station frühestens nach so vielen anderen wieder (A4). */
export const AGAIN_GAP = 3;

export interface HistoryEntry {
  readonly station: Station;
  readonly rating: RatingKey;
  /** Zustand vor der Bewertung, den Undo herstellt. */
  readonly before: {
    readonly queue: readonly Station[];
    readonly finished: number;
    readonly counts: Readonly<Record<RatingKey, number>>;
    readonly ratedItems: number;
  };
}

export interface SessionState {
  /** Noch offene Stationen; die erste ist die aktuelle. */
  readonly queue: readonly Station[];
  /** Stationen zu Beginn, Grundlage für Zähler und Leiste. */
  readonly total: number;
  /** Abgeschlossene Stationen (mindestens „Schwer“). */
  readonly finished: number;
  /** Die Antwort ist zu sehen, Bewerten möglich. */
  readonly flipped: boolean;
  /** Gebündelte Lücken: wie viele der Lücken schon aufgedeckt sind. */
  readonly revealed: number;
  /** Bewertungen je Stufe, jede Wiederholung zählt (auch wiederholte „Nochmal“). */
  readonly counts: Readonly<Record<RatingKey, number>>;
  /** Bewertete Abfragen insgesamt (Lücken einer Bündel-Station einzeln). */
  readonly ratedItems: number;
  readonly history: readonly HistoryEntry[];
  /** Nichts mehr offen. */
  readonly done: boolean;
}

const NO_COUNTS: Record<RatingKey, number> = { again: 0, hard: 0, good: 0, easy: 0 };

export function startSession(stations: readonly Station[]): SessionState {
  return {
    queue: stations,
    total: stations.length,
    finished: 0,
    flipped: false,
    revealed: 0,
    counts: NO_COUNTS,
    ratedItems: 0,
    history: [],
    done: stations.length === 0,
  };
}

export function current(state: SessionState): Station | undefined {
  return state.queue[0];
}

/** Eine Station mit mehreren fälligen Lücken wird schrittweise aufgedeckt. */
export function isBundle(station: Station | undefined): boolean {
  return (station?.itemIds.length ?? 0) > 1;
}

/** Zähler oben rechts: „9/24“, nie über die Gesamtzahl. */
export function counter(state: SessionState): string {
  return `${Math.min(state.finished + 1, state.total)}/${state.total}`;
}

/** Breite der Fortschrittsleiste in Prozent. */
export function progressPercent(state: SessionState): number {
  return state.total === 0 ? 0 : Math.round((state.finished / state.total) * 100);
}

/** Antwort zeigen (Tippen auf die Karte). Bei gebündelten Lücken deckt es alle auf. */
export function flip(state: SessionState): SessionState {
  const station = current(state);
  if (!station || state.flipped) return state;
  return { ...state, flipped: true, revealed: station.itemIds.length };
}

/** „Nächste Lücke“ (Luecke.dc.html): deckt die nächste Lücke auf, nach der letzten ist bewertbar. */
export function revealNext(state: SessionState): SessionState {
  const station = current(state);
  if (!station || state.flipped) return state;
  const revealed = Math.min(state.revealed + 1, station.itemIds.length);
  return { ...state, revealed, flipped: revealed === station.itemIds.length };
}

/** Stelle in der Warteschlange für eine Station, die „Nochmal“ bekam. */
export function againPosition(remaining: number): number {
  return Math.min(AGAIN_GAP, remaining);
}

export interface RateResult {
  readonly state: SessionState;
  /** Was zu speichern ist: diese Abfragen mit dieser Bewertung. */
  readonly effect: { readonly itemIds: readonly string[]; readonly rating: RatingKey };
}

/** Bewertet die aktuelle Station. Ohne aufgedeckte Antwort geschieht nichts (`null`). */
export function rate(state: SessionState, rating: RatingKey): RateResult | null {
  const station = current(state);
  if (!station || !state.flipped) return null;
  const rest = state.queue.slice(1);
  const again = rating === 'again';
  const queue = again
    ? [...rest.slice(0, againPosition(rest.length)), station, ...rest.slice(againPosition(rest.length))]
    : rest;
  const finished = again ? state.finished : state.finished + 1;
  const counts = { ...state.counts, [rating]: state.counts[rating] + 1 };
  const ratedItems = state.ratedItems + station.itemIds.length;
  const entry: HistoryEntry = {
    station,
    rating,
    before: {
      queue: state.queue,
      finished: state.finished,
      counts: state.counts,
      ratedItems: state.ratedItems,
    },
  };
  return {
    state: {
      ...state,
      queue,
      finished,
      counts,
      ratedItems,
      flipped: false,
      revealed: 0,
      history: [...state.history, entry],
      done: queue.length === 0,
    },
    effect: { itemIds: station.itemIds, rating },
  };
}

/** Letzte Bewertung zurücknehmen; die Station steht wieder mit aufgedeckter Antwort da. */
export function undo(
  state: SessionState,
): { state: SessionState; effect: { itemIds: readonly string[] } } | null {
  const last = state.history.at(-1);
  if (!last) return null;
  return {
    state: {
      ...state,
      queue: last.before.queue,
      finished: last.before.finished,
      counts: last.before.counts,
      ratedItems: last.before.ratedItems,
      flipped: true,
      revealed: last.station.itemIds.length,
      history: state.history.slice(0, -1),
      done: false,
    },
    effect: { itemIds: last.station.itemIds },
  };
}

export function canUndo(state: SessionState): boolean {
  return state.history.length > 0;
}

/** Bewertungen der Session als Zusammenfassung („24 Wiederholungen, davon 3 nochmal“). */
export function summary(state: SessionState): {
  reviews: number;
  again: number;
  counts: Readonly<Record<RatingKey, number>>;
} {
  const reviews = RATING_KEYS.reduce((sum, key) => sum + state.counts[key], 0);
  return { reviews, again: state.counts.again, counts: state.counts };
}

/** Nummern der Lücken einer Karte, aufsteigend, z. B. für die Anzeige „Lücke 3 von 4“. */
export function gapSubs(text: string): string[] {
  return clozeNumbers(text).map(gapSub);
}
