/**
 * Verweise zwischen den Tabellen: Ein Backup mit ins Leere zeigenden Verweisen oder fehlenden
 * Abfragen würde beim Lernen oder Anzeigen scheitern. Geprüft wird vor dem Einspielen.
 */
import { reviewItemId, reviewSubs, contentOf } from '../cards/card';
import { linkedCardIds } from '../cards/schema';
import { cardSchema, type Card } from './records';

type Rows = Record<string, unknown>[] | undefined;

export function hasIntegrity(tables: {
  areas?: Rows;
  decks?: Rows;
  cards?: Rows;
  reviewItems?: Rows;
}): boolean {
  const areaIds = new Set((tables.areas ?? []).map((a) => a.id));
  const decks = new Map((tables.decks ?? []).map((d) => [d.id as string, d]));
  for (const deck of decks.values()) {
    if (!(deck.areaIds as string[]).every((id) => areaIds.has(id))) return false;
  }
  const expected = new Map<string, { cardId: string; deckId: string; sub: string }>();
  const cardIds = new Set((tables.cards ?? []).map((c) => c.id));
  for (const row of tables.cards ?? []) {
    const parsed = cardSchema.safeParse(row);
    if (!parsed.success) return false;
    const card: Card = parsed.data;
    if (!decks.has(card.deckId)) return false;
    // Verknüpfungen zeigen auf vorhandene andere Karten (ADR-009).
    if (linkedCardIds(card).some((id) => id === card.id || !cardIds.has(id))) return false;
    for (const sub of reviewSubs(contentOf(card))) {
      expected.set(reviewItemId(card.id, sub), { cardId: card.id, deckId: card.deckId, sub });
    }
  }
  const items = tables.reviewItems ?? [];
  if (items.length !== expected.size) return false;
  return items.every((item) => {
    const want = expected.get(item.id as string);
    return (
      want !== undefined &&
      want.cardId === item.cardId &&
      want.deckId === item.deckId &&
      want.sub === item.sub
    );
  });
}
