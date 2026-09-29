import { buildCard, buildItems, type CardFields } from '@/domain/cards/card';
import { linksTo, withoutLinks } from '@/domain/cards/schema';
import type { Card, NewEvent } from '@/domain/model/records';
import type { JuriDb } from '../db';
import { readCounter, writeMeta } from './profile';

/**
 * Legt eine Karte an: Karte, ihre Abfragen (ein Lückentext mit drei Lücken ergibt drei),
 * Ereignis „Karte angelegt“ und der Zähler für die Backup-Erinnerung in einer Transaktion.
 */
export async function createCard(
  db: JuriDb,
  input: { id: string; deckId: string; fields: CardFields },
  now: number,
): Promise<Card> {
  const card = buildCard(input.id, input.deckId, input.fields, now, now);
  await db.transaction('rw', db.cards, db.reviewItems, db.events, db.meta, async () => {
    await db.cards.add(card);
    await db.reviewItems.bulkAdd(buildItems(card, now));
    const event: NewEvent = { at: now, type: 'cardCreated', cardId: card.id, deckId: card.deckId };
    await db.events.add(event);
    await writeMeta(db, 'newCardsSinceBackup', (await readCounter(db, 'newCardsSinceBackup')) + 1);
  });
  return card;
}

/**
 * Ändert eine Karte und gleicht ihre Abfragen an: Neue Lücken bekommen eine Abfrage, entfernte
 * verlieren sie samt Lernfortschritt, die übrigen bleiben unangetastet (auch beim Verschieben
 * in einen anderen Stapel).
 */
export async function updateCard(
  db: JuriDb,
  id: string,
  input: { deckId: string; fields: CardFields },
  now: number,
): Promise<Card | null> {
  return db.transaction('rw', db.cards, db.reviewItems, async () => {
    const current = await db.cards.get(id);
    if (!current) return null;
    const card = buildCard(id, input.deckId, input.fields, current.createdAt, now);
    await db.cards.put(card);
    const have = await db.reviewItems.where('cardId').equals(id).toArray();
    const want = buildItems(card, now);
    const wanted = new Set(want.map((w) => w.id));
    const existing = new Map(have.map((h) => [h.id, h]));
    await db.reviewItems.bulkDelete(have.filter((h) => !wanted.has(h.id)).map((h) => h.id));
    await db.reviewItems.bulkPut([
      ...want.filter((w) => !existing.has(w.id)),
      ...have
        .filter((h) => wanted.has(h.id) && h.deckId !== card.deckId)
        .map((h) => ({ ...h, deckId: card.deckId })),
    ]);
    return card;
  });
}

/**
 * Entfernt die Verknüpfungen zu `targets` aus allen Schemas außerhalb von `except` (den ebenfalls
 * gelöschten Karten). Die Punkte bleiben, nur der Verweis fällt weg; das Schema gilt als geändert.
 * Läuft in der Transaktion des Löschens, damit kein Verweis ins Leere zeigt (ADR-009).
 */
export async function unlinkCards(
  db: JuriDb,
  targets: ReadonlySet<string>,
  except: ReadonlySet<string>,
  now: number,
): Promise<number> {
  const schemas = await db.cards.where('type').equals('schema').toArray();
  const changed = [];
  let removed = 0;
  for (const use of linksTo(schemas, targets, except)) {
    const next = withoutLinks(use.card, targets);
    if (!next) continue;
    removed += use.points;
    changed.push({ ...next, updatedAt: now });
  }
  await db.cards.bulkPut(changed);
  return removed;
}

/**
 * Löscht eine Karte mit ihren Abfragen; das Ereignis „angelegt“ bleibt im Log. Schemas, die auf
 * die Karte verwiesen, verlieren nur diesen Verweis (ADR-009).
 */
export async function deleteCard(
  db: JuriDb,
  id: string,
  now: number = Date.now(),
): Promise<number> {
  return db.transaction('rw', db.cards, db.reviewItems, async () => {
    const items = await db.reviewItems.where('cardId').equals(id).primaryKeys();
    await db.reviewItems.bulkDelete(items);
    await db.cards.delete(id);
    await unlinkCards(db, new Set([id]), new Set([id]), now);
    return items.length;
  });
}

/** Schema-Karten und Karten insgesamt für die Auswahl beim Verknüpfen und das Löschen. */
export async function readSchemasLinkingTo(
  db: JuriDb,
  targets: ReadonlySet<string>,
  except: ReadonlySet<string> = new Set(),
) {
  return linksTo(await db.cards.where('type').equals('schema').toArray(), targets, except);
}

export async function readCard(db: JuriDb, id: string): Promise<Card | null> {
  return (await db.cards.get(id)) ?? null;
}

export async function readCards(db: JuriDb): Promise<Card[]> {
  return db.cards.toArray();
}
