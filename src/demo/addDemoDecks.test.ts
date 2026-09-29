import { describe, expect, it } from 'vitest';
import { testDb } from '@/data/testDb';
import { deleteDeck } from '@/data/repositories/decks';
import { readMeta } from '@/data/repositories/profile';
import { addDemoDecks } from './addDemoDecks';

const now = new Date(2026, 8, 28, 12).getTime();

describe('Demo-Stapel hinzufügen', () => {
  it('legt Rechtsgebiete, Stapel, Karten und Abfragen an', async () => {
    const { db } = testDb();
    expect(await addDemoDecks(db, now)).toEqual({ decks: 6, cards: 40 });
    expect(await db.areas.count()).toBe(3);
    expect(await db.decks.count()).toBe(6);
    expect(await db.cards.count()).toBe(40);
    expect(await db.reviewItems.count()).toBeGreaterThan(40);
    expect(await db.events.count()).toBe(40);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(40);
  });

  it('ist wiederholbar, ohne etwas doppelt anzulegen, und lässt Vorhandenes in Ruhe', async () => {
    const { db } = testDb();
    await db.areas.add({ id: 'meins', code: 'ZR', name: 'Zivilrecht', createdAt: 1, updatedAt: 1 });
    await addDemoDecks(db, now);
    expect(await addDemoDecks(db, now + 1)).toEqual({ decks: 0, cards: 0 });
    expect(await db.areas.count()).toBe(3);
    expect((await db.decks.get('demo-amtshaftung'))?.areaIds).toEqual(['meins', 'demo-oer']);
    expect(await db.cards.count()).toBe(40);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(40);
  });

  it('lässt einzeln gelöschte Stapel beim erneuten Laden zurückkommen', async () => {
    const { db } = testDb();
    await addDemoDecks(db, now);
    await deleteDeck(db, 'demo-diebstahl-betrug');
    expect(await addDemoDecks(db, now)).toEqual({ decks: 1, cards: 8 });
  });

  it('übersteht ein umbenanntes Demo-Rechtsgebiet und verschobene Karten ohne Fehler', async () => {
    const { db } = testDb();
    await addDemoDecks(db, now);
    await db.areas.update('demo-zr', { code: 'ZIV' });
    await db.cards.update('demo-deliktsrecht-01', { deckId: 'demo-amtshaftung' });
    await db.reviewItems.update('demo-deliktsrecht-01', { deckId: 'demo-amtshaftung' });
    await deleteDeck(db, 'demo-deliktsrecht');
    expect(await addDemoDecks(db, now + 1)).toEqual({ decks: 1, cards: 6 });
    expect(await db.areas.count()).toBe(3);
    expect((await db.cards.get('demo-deliktsrecht-01'))?.deckId).toBe('demo-amtshaftung');
  });
});
