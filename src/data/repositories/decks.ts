import { toggleArea } from '@/domain/library/deckRules';
import type { Deck } from '@/domain/model/records';
import type { JuriDb } from '../db';

export async function readDecks(db: JuriDb): Promise<Deck[]> {
  return db.decks.toArray();
}

export async function readDeck(db: JuriDb, id: string): Promise<Deck | null> {
  return (await db.decks.get(id)) ?? null;
}

/**
 * Legt einen Stapel an. `newAreas` sind Rechtsgebiete, die es noch nicht gibt (Vorschläge beim
 * ersten Stapel); sie entstehen in derselben Transaktion, ihre IDs stehen in `areaIds`.
 */
export async function createDeck(
  db: JuriDb,
  input: {
    id: string;
    name: string;
    norm: string;
    areaIds: readonly string[];
    newAreas?: readonly { id: string; code: string; name: string }[];
  },
  now: number,
): Promise<Deck> {
  const deck: Deck = {
    id: input.id,
    name: input.name,
    norm: input.norm,
    areaIds: [...input.areaIds],
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction('rw', db.areas, db.decks, async () => {
    for (const area of input.newAreas ?? []) {
      await db.areas.add({ ...area, createdAt: now, updatedAt: now });
    }
    await db.decks.add(deck);
  });
  return deck;
}

export async function updateDeck(
  db: JuriDb,
  id: string,
  changes: Partial<Pick<Deck, 'name' | 'norm' | 'areaIds'>>,
  now: number,
): Promise<Deck | null> {
  return db.transaction('rw', db.decks, async () => {
    const current = await db.decks.get(id);
    if (!current) return null;
    const deck: Deck = { ...current, ...changes, updatedAt: now };
    await db.decks.put(deck);
    return deck;
  });
}

/** Löscht den Stapel samt Karten und Abfragen (mit Lernfortschritt) und meldet die Mengen. */
export async function deleteDeck(
  db: JuriDb,
  id: string,
): Promise<{ cards: number; items: number }> {
  return db.transaction('rw', db.decks, db.cards, db.reviewItems, async () => {
    const cards = await db.cards.where('deckId').equals(id).primaryKeys();
    const items = await db.reviewItems.where('deckId').equals(id).primaryKeys();
    await db.reviewItems.bulkDelete(items);
    await db.cards.bulkDelete(cards);
    await db.decks.delete(id);
    return { cards: cards.length, items: items.length };
  });
}

/**
 * Schaltet ein Rechtsgebiet des Stapels um, gerechnet auf dem gespeicherten Stand innerhalb der
 * Transaktion (zwei schnelle Antippen überschreiben sich so nicht). Das letzte Rechtsgebiet bleibt.
 */
export async function toggleDeckArea(
  db: JuriDb,
  id: string,
  areaId: string,
  now: number,
): Promise<'ok' | 'last' | 'missing'> {
  return db.transaction('rw', db.decks, async () => {
    const deck = await db.decks.get(id);
    if (!deck) return 'missing';
    const areaIds = toggleArea(deck.areaIds, areaId);
    if (areaIds === null) return 'last';
    await db.decks.put({ ...deck, areaIds, updatedAt: now });
    return 'ok';
  });
}
