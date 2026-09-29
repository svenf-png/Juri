import { describe, expect, it } from 'vitest';
import { decodeBackup } from '@/domain/backup/codec';
import { checkCard, type CardFields } from '@/domain/cards/card';
import { dueSummary } from '@/domain/scheduler/queue';
import { DEFAULT_LEARNING } from '@/domain/scheduler/settings';
import { exportBackup, restoreBackup } from '../backup';
import { testDb } from '../testDb';
import { createArea } from './areas';
import { createCard, deleteCard } from './cards';
import { createDeck } from './decks';
import { readTodaySnapshot } from './library';
import { writeProfileName } from './profile';
import {
  rateItems,
  readCardsById,
  readSettings,
  readStudy,
  reviewedSince,
  startedSince,
  undoRating,
  writeSettings,
} from './study';

const T = new Date(2026, 8, 28, 10).getTime();
const DAY = 86_400_000;
const app = { instance: 'app', version: '0.5.0' } as const;

function fields(form: Partial<Parameters<typeof checkCard>[0]> = {}): CardFields {
  const result = checkCard({
    type: 'qa',
    front: 'Frage?',
    back: 'Antwort.',
    text: '',
    norm: '',
    tags: '',
    note: '',
    ...form,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.fields;
}

async function setup() {
  const { db, reopen } = testDb();
  await writeProfileName(db, 'Sven', T);
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
  await createDeck(db, { id: 'd1', name: 'Deck', norm: '', areaIds: ['zr'] }, T);
  await createCard(db, { id: 'k1', deckId: 'd1', fields: fields() }, T);
  await createCard(
    db,
    { id: 'k2', deckId: 'd1', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
    T,
  );
  return { db, reopen };
}

describe('Einstellungen', () => {
  it('haben Voreinstellungen und bleiben gespeichert', async () => {
    const { db, reopen } = await setup();
    expect(await readSettings(db)).toEqual(DEFAULT_LEARNING);
    await writeSettings(db, { ...DEFAULT_LEARNING, retention: 95, newPerDay: 5 });
    db.close();
    expect(await readSettings(reopen())).toMatchObject({ retention: 95, newPerDay: 5 });
  });

  it('Algorithmuswechsel schreibt nur den Index neu und verliert keinen Zustand', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1', 'k2:c1'], 'good', T);
    const before = await db.reviewItems.toArray();
    await writeSettings(db, { ...DEFAULT_LEARNING, algorithm: 'leitner' });
    const after = await db.reviewItems.toArray();
    for (const item of after) {
      const old = before.find((b) => b.id === item.id)!;
      expect(item.fsrs).toEqual(old.fsrs);
      expect(item.leitner).toEqual(old.leitner);
      expect(item.due).toBe(old.leitner?.due ?? undefined);
    }
    expect(after.find((i) => i.id === 'k1')?.due).toBe(new Date(2026, 8, 28 + 3, 4).getTime());
    await writeSettings(db, DEFAULT_LEARNING);
    expect(await db.reviewItems.toArray()).toEqual(before);
  });
});

describe('Bewerten', () => {
  it('schreibt Zustand, Lernlog und Ereignis in einer Transaktion', async () => {
    const { db } = await setup();
    await rateItems(db, ['k2:c1', 'k2:c2'], 'good', T);
    const items = await db.reviewItems.bulkGet(['k2:c1', 'k2:c2', 'k1']);
    expect(items[0]?.fsrs?.reps).toBe(1);
    expect(items[1]?.due).toBe(items[1]?.fsrs?.due);
    expect(items[2]?.fsrs).toBeUndefined();
    const log = await db.reviewLog.toArray();
    expect(log.map((l) => [l.itemId, l.rating, l.wasNew])).toEqual([
      ['k2:c1', 3, true],
      ['k2:c2', 3, true],
    ]);
    const events = (await db.events.toArray()).filter((e) => e.type === 'reviewed');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ cardId: 'k2', deckId: 'd1', rating: 3, first: true });
  });

  it('eine gelöschte Abfrage wird übersprungen', async () => {
    const { db } = await setup();
    await rateItems(db, ['gibt-es-nicht', 'k1'], 'easy', T);
    expect(await db.reviewLog.count()).toBe(1);
  });

  it('zählt heute begonnene neue Abfragen und bewertete Abfragen getrennt', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'again', T);
    await rateItems(db, ['k1'], 'good', T + 1000);
    await rateItems(db, ['k2:c1'], 'good', T + 2000);
    expect(await startedSince(db, T - 1000)).toBe(2);
    expect(await reviewedSince(db, T - 1000)).toBe(2);
    expect(await startedSince(db, T + 5000)).toBe(0);
    const snapshot = await readTodaySnapshot(db, T - 1000, T - 1000);
    expect(snapshot).toMatchObject({ startedToday: 2 });
    // Das Tagesziel „Lernen“ liest Heute aus den Tagesaggregaten, in derselben Transaktion geschrieben.
    expect(snapshot.days.at(-1)).toMatchObject({ learned: 2 });
  });

  it('das Tageslimit für neue Abfragen wirkt auf die Fälligkeit', async () => {
    const { db } = await setup();
    await writeSettings(db, { ...DEFAULT_LEARNING, newPerDay: 2 });
    await rateItems(db, ['k1'], 'good', T);
    const study = await readStudy(db, T - 1000);
    const summary = dueSummary(study.items, {
      now: T,
      endOfDay: new Date(2026, 8, 29, 4).getTime(),
      newRemaining: study.settings.newPerDay - study.startedToday,
    });
    // k1 wartet im Lernschritt (10 Minuten, noch heute), von den zwei Lücken darf nur eine beginnen.
    expect(summary).toMatchObject({ reviews: 1, fresh: 1, total: 2 });
  });
});

describe('Undo', () => {
  it('stellt den Zustand vor der Bewertung her und löscht den Logeintrag', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'good', T);
    const afterFirst = await db.reviewItems.get('k1');
    await rateItems(db, ['k1'], 'easy', T + 2 * DAY);
    await undoRating(db, ['k1'], T + 2 * DAY);
    expect(await db.reviewItems.get('k1')).toEqual(afterFirst);
    expect(await db.reviewLog.count()).toBe(1);
    await undoRating(db, ['k1'], T + 3 * DAY);
    const original = await db.reviewItems.get('k1');
    expect(original?.fsrs).toBeUndefined();
    expect(original?.due).toBeUndefined();
    expect(await db.reviewLog.count()).toBe(0);
    await undoRating(db, ['k1'], T);
    expect(await db.reviewLog.count()).toBe(0);
  });

  it('das Ereignis-Log bleibt anhängend: „bewertet“ und „zurückgenommen“ stehen beide da', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'hard', T);
    await undoRating(db, ['k1'], T + 5);
    const types = (await db.events.toArray()).map((e) => e.type);
    expect(types.filter((t) => t !== 'cardCreated')).toEqual(['reviewed', 'reviewUndone']);
  });

  it('nimmt eine Bündel-Bewertung für jede Lücke zurück', async () => {
    const { db } = await setup();
    await rateItems(db, ['k2:c1', 'k2:c2'], 'good', T);
    await undoRating(db, ['k2:c1', 'k2:c2'], T);
    expect(
      (await db.reviewItems.bulkGet(['k2:c1', 'k2:c2'])).every((i) => i?.fsrs === undefined),
    ).toBe(true);
  });

  it('bei gewechseltem Algorithmus gilt nach dem Undo der Index des aktiven', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'good', T);
    await rateItems(db, ['k1'], 'good', T + DAY);
    await writeSettings(db, { ...DEFAULT_LEARNING, algorithm: 'leitner' });
    await undoRating(db, ['k1'], T + DAY);
    const item = await db.reviewItems.get('k1');
    expect(item?.due).toBe(item?.leitner?.due);
  });
});

describe('Karten', () => {
  it('lesen nach ID; Unbekannte fehlen', async () => {
    const { db } = await setup();
    expect((await readCardsById(db, ['k2', 'weg', 'k1'])).map((c) => c.id)).toEqual(['k2', 'k1']);
  });

  it('Löschen einer Karte lässt das Lernlog stehen', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'good', T);
    await deleteCard(db, 'k1');
    expect(await db.reviewLog.count()).toBe(1);
    expect(await db.reviewItems.get('k1')).toBeUndefined();
  });
});

describe('Backup mit Lernzustand', () => {
  it('Roundtrip: Zustand, Lernlog, Ereignisse und Einstellungen bleiben byte-identisch', async () => {
    const { db } = await setup();
    await writeSettings(db, { ...DEFAULT_LEARNING, retention: 93, leitnerDays: [1, 2, 6, 10, 20] });
    await rateItems(db, ['k1', 'k2:c1'], 'good', T);
    await rateItems(db, ['k1'], 'hard', T + DAY);
    const first = await exportBackup(db, T, app);
    const target = testDb().db;
    await writeProfileName(target, 'Max', T);
    await restoreBackup(target, decodeBackup(first));
    expect(await exportBackup(target, T, app)).toEqual(first);
    expect(await target.reviewLog.count()).toBe(3);
    expect(await readSettings(target)).toMatchObject({
      retention: 93,
      leitnerDays: [1, 2, 6, 10, 20],
    });
    expect(await target.reviewItems.get('k1')).toEqual(await db.reviewItems.get('k1'));
  });

  it('ein Backup aus M3 ohne Lernzustand lässt sich einspielen; alle Abfragen sind neu', async () => {
    const { db } = await setup();
    const tables = { ...(await import('../backup').then((m) => m.readTables(db))) };
    delete tables.reviewLog;
    const target = testDb().db;
    await writeProfileName(target, 'Max', T);
    await restoreBackup(target, { schemaVersion: 2, createdAt: T, app, tables });
    expect((await target.reviewItems.toArray()).every((i) => i.fsrs === undefined)).toBe(true);
    expect(await readSettings(target)).toEqual(DEFAULT_LEARNING);
  });

  it('lehnt einen ungültigen Lernzustand ab und ändert nichts', async () => {
    const { db } = await setup();
    const tables = await import('../backup').then((m) => m.readTables(db));
    tables.reviewItems = tables.reviewItems!.map((i) => ({ ...i, fsrs: { due: 'morgen' } }));
    const target = testDb().db;
    await writeProfileName(target, 'Max', T);
    await expect(
      restoreBackup(target, { schemaVersion: 3, createdAt: T, app, tables }),
    ).rejects.toMatchObject({ code: 'beschaedigt' });
    expect((await target.profile.get('me'))?.name).toBe('Max');
  });
});
