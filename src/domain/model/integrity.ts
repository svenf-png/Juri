/**
 * Verweise zwischen den Tabellen: Ein Backup mit ins Leere zeigenden Verweisen oder fehlenden
 * Abfragen würde beim Lernen oder Anzeigen scheitern. Geprüft wird vor dem Einspielen.
 */
import { reviewItemId, reviewSubs, contentOf, mediaIdsOf } from '../cards/card';
import { linkedCardIds } from '../cards/schema';
import { cardSchema, type Card } from './records';

type Rows = Record<string, unknown>[] | undefined;

export function hasIntegrity(tables: {
  areas?: Rows;
  decks?: Rows;
  cards?: Rows;
  reviewItems?: Rows;
  media?: Rows;
  deadlines?: Rows;
  contacts?: Rows;
  kudos?: Rows;
}): boolean {
  const areaIds = new Set((tables.areas ?? []).map((a) => a.id));
  const decks = new Map((tables.decks ?? []).map((d) => [d.id as string, d]));
  for (const deck of decks.values()) {
    if (!(deck.areaIds as string[]).every((id) => areaIds.has(id))) return false;
  }
  // Fristen verweisen auf vorhandene Rechtsgebiete und Stapel (M8).
  const deckIds = new Set(decks.keys());
  for (const row of tables.deadlines ?? []) {
    const scope = row.scope as { areaIds: string[]; deckIds: string[] };
    if (!scope.areaIds.every((a) => areaIds.has(a))) return false;
    if (!scope.deckIds.every((d) => deckIds.has(d))) return false;
  }
  // High fives gehören zu einem vorhandenen Kontakt (M11).
  const contactIds = new Set((tables.contacts ?? []).map((c) => c.id));
  for (const row of tables.kudos ?? []) {
    if (!contactIds.has(row.contactId)) return false;
  }
  const expected = new Map<string, { cardId: string; deckId: string; sub: string }>();
  const cardIds = new Set((tables.cards ?? []).map((c) => c.id));
  const media = new Map((tables.media ?? []).map((m) => [m.id as string, m]));
  for (const row of tables.cards ?? []) {
    const parsed = cardSchema.safeParse(row);
    if (!parsed.success) return false;
    const card: Card = parsed.data;
    if (!decks.has(card.deckId)) return false;
    // Verknüpfungen zeigen auf vorhandene andere Karten (ADR-009).
    if (linkedCardIds(card).some((id) => id === card.id || !cardIds.has(id))) return false;
    // Bilder und PDFs, auf die eine Karte zeigt, liegen im Backup (M6).
    for (const mediaId of mediaIdsOf(card)) {
      const record = media.get(mediaId);
      if (!record) return false;
      // Abdeckung: ein Bild; Herkunft: ein PDF.
      if (card.type === 'cover' && mediaId === card.mediaId && record.kind !== 'image')
        return false;
      if (mediaId === card.source?.mediaId && record.kind !== 'pdf') return false;
    }
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
