import { describe, expect, it } from 'vitest';
import { testDb } from '@/data/testDb';
import { deleteDeck } from '@/data/repositories/decks';
import { readMeta } from '@/data/repositories/profile';
import { addDemoDecks } from './addDemoDecks';

const now = new Date(2026, 8, 28, 12).getTime();

describe('Demo-Stapel hinzufügen', () => {
  it('legt Rechtsgebiete, Stapel, Karten und Abfragen an', async () => {
    const { db } = testDb();
    expect(await addDemoDecks(db, now)).toEqual({ decks: 5, cards: 35 });
    expect(await db.areas.count()).toBe(3);
    expect(await db.decks.count()).toBe(5);
    expect(await db.cards.count()).toBe(35);
    expect(await db.reviewItems.count()).toBeGreaterThan(35);
    expect(await db.events.count()).toBe(35);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(35);
  });

  it('ist wiederholbar, ohne etwas doppelt anzulegen, und lässt Vorhandenes in Ruhe', async () => {
    const { db } = testDb();
    await db.areas.add({ id: 'meins', code: 'ZR', name: 'Zivilrecht', createdAt: 1, updatedAt: 1 });
    await addDemoDecks(db, now);
    expect(await addDemoDecks(db, now + 1)).toEqual({ decks: 0, cards: 0 });
    expect(await db.areas.count()).toBe(3);
    expect((await db.decks.get('demo-amtshaftung'))?.areaIds).toEqual(['meins', 'demo-oer']);
    expect(await db.cards.count()).toBe(35);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(35);
  });

  it('lässt einzeln gelöschte Stapel beim erneuten Laden zurückkommen', async () => {
    const { db } = testDb();
    await addDemoDecks(db, now);
    await deleteDeck(db, 'demo-diebstahl-betrug');
    expect(await addDemoDecks(db, now)).toEqual({ decks: 1, cards: 8 });
  });
});
