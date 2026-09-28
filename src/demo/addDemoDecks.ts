import type { JuriDb } from '@/data/db';
import { demoDecks } from './demoDecks';

/**
 * Fügt die Demo-Stapel zu den vorhandenen Daten hinzu, ohne etwas zu ändern oder zu ersetzen.
 * Vorhandene Stapel (feste IDs) werden übersprungen, vorhandene Rechtsgebiete mitbenutzt.
 * Liefert die Zahl der neuen Stapel und Karten.
 */
export async function addDemoDecks(
  db: JuriDb,
  now: number,
): Promise<{ decks: number; cards: number }> {
  return db.transaction(
    'rw',
    [db.areas, db.decks, db.cards, db.reviewItems, db.events, db.meta],
    async () => {
      const [areas, deckIds] = await Promise.all([
        db.areas.toArray(),
        db.decks.toCollection().primaryKeys(),
      ]);
      const demo = demoDecks(now, { areas, deckIds: new Set(deckIds) });
      await db.areas.bulkAdd(demo.areas);
      await db.decks.bulkAdd(demo.decks);
      await db.cards.bulkAdd(demo.cards);
      await db.reviewItems.bulkAdd(demo.items);
      await db.events.bulkAdd(demo.events);
      if (demo.cards.length > 0) {
        const counter = await db.meta.get('newCardsSinceBackup');
        await db.meta.put({
          key: 'newCardsSinceBackup',
          value: (counter?.value ?? 0) + demo.cards.length,
        });
      }
      return { decks: demo.decks.length, cards: demo.cards.length };
    },
  );
}
