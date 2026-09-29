/**
 * Umfang einer Frist: welche Abfragen zu ihr gehören. Ein Umfang ist alles (`all`) oder die
 * Vereinigung aus Rechtsgebieten (über die Stapel), einzelnen Stapeln und Tags der Karten.
 */
import type { Deadline, DeadlineScope, Deck, ReviewItem } from '../model/records';

/** Was der Umfang zum Auflösen braucht. Tags kennen nur die Karten, nicht die Abfragen. */
export interface ScopeWorld {
  readonly decks: readonly Pick<Deck, 'id' | 'areaIds'>[];
  /** Tags je Karten-ID; nötig sind nur die Karten mit einem Tag aus `scopeTags`. */
  readonly cardTags: ReadonlyMap<string, readonly string[]>;
}

export const ALL_CARDS: DeadlineScope = { all: true, areaIds: [], deckIds: [], tags: [] };

/** Umfang ohne jede Angabe: erfasst keine Karte (entsteht, wenn Löschen Verweise entfernt). */
export function isEmptyScope(scope: DeadlineScope): boolean {
  return !scope.all && !scope.areaIds.length && !scope.deckIds.length && !scope.tags.length;
}

/** Alle Tags, nach denen die Umfänge suchen; nur deren Karten muss man laden. */
export function scopeTags(deadlines: readonly Deadline[]): string[] {
  return [...new Set(deadlines.flatMap((d) => d.scope.tags))].sort();
}

/** Prüft, ob eine Abfrage im Umfang liegt; löst die Stapel einmal auf. */
export function scopeMatcher(
  scope: DeadlineScope,
  world: ScopeWorld,
): (item: Pick<ReviewItem, 'cardId' | 'deckId'>) => boolean {
  if (scope.all) return () => true;
  const areas = new Set(scope.areaIds);
  const decks = new Set(scope.deckIds);
  for (const deck of world.decks) {
    if (deck.areaIds.some((a) => areas.has(a))) decks.add(deck.id);
  }
  const tags = new Set(scope.tags);
  return (item) =>
    decks.has(item.deckId) || (world.cardTags.get(item.cardId) ?? []).some((t) => tags.has(t));
}

/** Entfernt einen gelöschten Stapel aus den Umfängen; liefert nur die geänderten Fristen. */
export function withoutDeck(deadlines: readonly Deadline[], deckId: string, now: number) {
  return deadlines
    .filter((d) => d.scope.deckIds.includes(deckId))
    .map((d) => ({
      ...d,
      scope: { ...d.scope, deckIds: d.scope.deckIds.filter((id) => id !== deckId) },
      updatedAt: now,
    }));
}

/** Entfernt ein gelöschtes Rechtsgebiet aus den Umfängen; liefert nur die geänderten Fristen. */
export function withoutArea(deadlines: readonly Deadline[], areaId: string, now: number) {
  return deadlines
    .filter((d) => d.scope.areaIds.includes(areaId))
    .map((d) => ({
      ...d,
      scope: { ...d.scope, areaIds: d.scope.areaIds.filter((id) => id !== areaId) },
      updatedAt: now,
    }));
}
