import { describe, expect, it } from 'vitest';
import { checkCard, type CardFields } from '@/domain/cards/card';
import { learningDay } from '@/domain/calendar/day';
import { DEFAULT_GOALS } from '@/domain/progress/goals';
import { exportBackup, prepareRestore, restoreBackup } from '../backup';
import { decodeBackup } from '@/domain/backup/codec';
import { MIGRATIONS, schemaVersion } from '../migrations';
import { testDb } from '../testDb';
import { createArea } from './areas';
import { createCard } from './cards';
import { createDeck } from './decks';
import { writeProfileName } from './profile';
import {
  markSeen,
  readCelebration,
  readErfolge,
  readGoalStart,
  readGoals,
  readStreak,
  refreshDays,
  syncMilestones,
  writeGoals,
} from './progress';
import { rateItems, undoRating } from './study';

const at = (day: number, hour = 10, month = 8) => new Date(2026, month, day, hour).getTime();
const T = at(28);
const app = { instance: 'app', version: '0.10.0' } as const;

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

async function setup(cards = 2, when = T) {
  const { db, reopen } = testDb();
  await writeProfileName(db, 'Sven', when);
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, when);
  await createDeck(db, { id: 'd1', name: 'Deck', norm: '', areaIds: ['zr'] }, when);
  for (let i = 1; i <= cards; i++) {
    await createCard(db, { id: `k${String(i)}`, deckId: 'd1', fields: fields() }, when);
  }
  return { db, reopen };
}

const stats = async (db: Awaited<ReturnType<typeof setup>>['db']) =>
  Object.fromEntries((await db.dayStats.toArray()).map((r) => [r.day, r]));

describe('Tagesaggregate in der Transaktion', () => {
  it('eine neue Karte zählt am Tag und schaltet „Erste Karte“ frei', async () => {
    const { db } = await setup(1);
    expect(await stats(db)).toEqual({
      '2026-09-28': { day: '2026-09-28', reviews: 0, learned: 0, created: 1, met: false },
    });
    expect((await db.milestones.toArray()).map((m) => m.id)).toEqual(['erste-karte']);
  });

  it('scheitert die Transaktion, bleibt auch das Aggregat unverändert', async () => {
    const { db } = await setup(1);
    await expect(createCard(db, { id: 'k1', deckId: 'd1', fields: fields() }, T)).rejects.toThrow();
    expect((await stats(db))['2026-09-28']?.created).toBe(1);
    expect(await db.events.count()).toBe(1);
  });

  it('Bewertungen zählen je Bewertung und je Abfrage, Undo hebt sie im Aggregat auf', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'good', at(28, 11));
    await rateItems(db, ['k1', 'k2'], 'again', at(28, 12));
    expect((await stats(db))['2026-09-28']).toMatchObject({ reviews: 3, learned: 2, created: 2 });
    await undoRating(db, ['k2'], at(28, 13));
    expect((await stats(db))['2026-09-28']).toMatchObject({ reviews: 2, learned: 1 });
    await undoRating(db, ['k1'], at(28, 13));
    await undoRating(db, ['k1'], at(28, 14));
    expect((await stats(db))['2026-09-28']).toMatchObject({ reviews: 0, learned: 0, created: 2 });
  });

  it('Undo nach dem Tageswechsel korrigiert den Tag der Bewertung', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1', 'k2'], 'good', at(28, 23));
    await undoRating(db, ['k1'], at(29, 5));
    const rows = await stats(db);
    expect(rows['2026-09-28']).toMatchObject({ reviews: 1, learned: 1 });
    expect(rows['2026-09-29']).toBeUndefined();
  });

  it('Bewertung vor 04:00 zählt zum Vortag', async () => {
    const { db } = await setup();
    await rateItems(db, ['k1'], 'good', at(29, 3));
    expect((await stats(db))['2026-09-28']?.reviews).toBe(1);
    expect((await stats(db))['2026-09-29']).toBeUndefined();
  });

  it('das Tagesziel setzt met; Ziele danach ändern nur den heutigen Tag', async () => {
    const { db } = await setup(3, at(20));
    // 20.9.: drei Karten angelegt, Ziel Anlegen 5 nicht erreicht.
    await writeGoals(db, { ...DEFAULT_GOALS, learn: 2 }, at(28));
    await rateItems(db, ['k1', 'k2'], 'good', at(28, 11));
    expect((await stats(db))['2026-09-28']).toMatchObject({ learned: 2, met: true });
    await writeGoals(db, { ...DEFAULT_GOALS, learn: 3 }, at(28, 12));
    expect((await stats(db))['2026-09-28']?.met).toBe(false);
    // Der frühere Tag behält sein Ergebnis.
    expect((await stats(db))['2026-09-20']?.met).toBe(false);
    await writeGoals(db, { ...DEFAULT_GOALS, create: 3, learn: 24 }, at(28, 13));
    expect((await stats(db))['2026-09-20']?.met).toBe(false);
    expect(await readGoals(db)).toEqual({ learn: 24, create: 3, pause: true });
  });

  it('Anlegen-Ziel erreicht: Tag zählt', async () => {
    const { db } = await setup(5);
    expect((await stats(db))['2026-09-28']?.met).toBe(true);
  });

  it('refreshDays baut Tage aus dem Log neu und löscht Tage ohne Aktivität', async () => {
    const { db } = await setup();
    await db.dayStats.clear();
    await db.dayStats.put({ day: '2026-09-01', reviews: 9, learned: 9, created: 0, met: false });
    await db.transaction('rw', [db.events, db.dayStats, db.meta], () =>
      refreshDays(db, ['2026-09-01', '2026-09-28']),
    );
    const rows = await stats(db);
    expect(rows['2026-09-01']).toBeUndefined();
    expect(rows['2026-09-28']).toMatchObject({ created: 2 });
    expect(
      await db.transaction('rw', db.events, db.dayStats, db.meta, () => refreshDays(db, [])),
    ).toEqual([]);
  });
});

describe('Meilensteine', () => {
  it('werden genau einmal freigeschaltet und behalten Zeitpunkt und Feierstand', async () => {
    const { db } = await setup(1);
    const first = (await db.milestones.get('erste-karte'))!;
    await createCard(db, { id: 'k9', deckId: 'd1', fields: fields() }, at(29, 12));
    await syncMilestones(db, at(30));
    await syncMilestones(db, at(30));
    expect(await db.milestones.toArray()).toEqual([first]);
    await markSeen(db, ['erste-karte']);
    await syncMilestones(db, at(31));
    expect((await db.milestones.get('erste-karte'))?.seen).toBe(true);
    expect((await db.milestones.get('erste-karte'))?.unlockedAt).toBe(first.unlockedAt);
  });

  it('die Serie schaltet „7 Tage am Stück“ frei, sobald der siebte Tag zählt', async () => {
    const { db } = await setup(1, at(15));
    for (let d = 20; d <= 26; d++) {
      await rateItems(db, ['k1'], 'good', at(d, 11));
      await db.dayStats.update(`2026-09-${String(d)}`, { met: true });
    }
    expect(await db.milestones.get('serie-7')).toBeUndefined();
    await writeGoals(db, { ...DEFAULT_GOALS, learn: 1 }, at(27, 9));
    await rateItems(db, ['k1'], 'good', at(27, 11));
    expect(await db.milestones.get('serie-7')).toMatchObject({
      seen: false,
      unlockedAt: at(27, 11),
    });
  });

  it('nach einem Update holt Erfolge Erreichtes nach (Sync)', async () => {
    const { db } = await setup(1);
    await db.milestones.clear();
    expect(await syncMilestones(db, at(29))).toEqual(['erste-karte']);
    expect(await syncMilestones(db, at(29))).toEqual([]);
  });
});

describe('Serie aus der Datenbank', () => {
  it('Tage ohne fällige oder neue Karten brechen die Serie nicht', async () => {
    const { db } = await setup(1, at(20));
    // Lernen am 20., 21. und 24.: 22. und 23. war nichts fällig (nächste Fälligkeit am 24.).
    await writeGoals(db, { ...DEFAULT_GOALS, learn: 1, pause: false }, at(20));
    await rateItems(db, ['k1'], 'good', at(20, 11));
    const item = (await db.reviewItems.get('k1'))!;
    await db.reviewItems.put({ ...item, due: at(24, 9) });
    await db.reviewLog.clear();
    await db.reviewLog.add({
      at: at(20, 11),
      itemId: 'k1',
      cardId: 'k1',
      deckId: 'd1',
      rating: 3,
      algorithm: 'fsrs',
      wasNew: true,
      fsrs: {
        state: 0,
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
      },
      before: {},
    });
    await rateItems(db, ['k1'], 'good', at(24, 11));
    const today = learningDay(new Date(at(24, 12)));
    const result = await readStreak(db, today, { ...DEFAULT_GOALS, learn: 1, pause: false });
    expect(result).toMatchObject({ current: 2, todayMet: true });
  });

  it('war eine Karte offen und der Tag verpasst, bricht die Serie ohne Pausentag', async () => {
    const { db } = await setup(2, at(20));
    await writeGoals(db, { ...DEFAULT_GOALS, learn: 1, pause: false }, at(20));
    await rateItems(db, ['k1'], 'good', at(20, 11));
    await rateItems(db, ['k1'], 'good', at(22, 11));
    // k2 wurde nie bewertet: seit dem 20. offen, also war der 21. ein verpasster Tag.
    const today = learningDay(new Date(at(22, 12)));
    const result = await readStreak(db, today, { ...DEFAULT_GOALS, learn: 1, pause: false });
    expect(result.current).toBe(1);
    const withPause = await readStreak(db, today, { ...DEFAULT_GOALS, learn: 1, pause: true });
    expect(withPause.current).toBe(2);
    expect(withPause.pauseUsedThisWeek).toBe(true);
  });

  it('Erfolge liest Verlauf, Kennzahlen und Freischaltungen', async () => {
    const { db } = await setup(2);
    await rateItems(db, ['k1', 'k2'], 'good', at(28, 11));
    const snap = await readErfolge(db, learningDay(new Date(at(28, 12))));
    expect(snap.rows).toHaveLength(1);
    expect(snap.metrics).toMatchObject({ created: 2, reviews: 2, schemas: 0 });
    expect([...snap.unlocked.keys()]).toEqual(['erste-karte']);
    expect(snap.goals).toEqual(DEFAULT_GOALS);
  });
});

describe('Migration und Backup', () => {
  it('Version 7 baut die Aggregate aus dem Ereignis-Log der Vorversion auf', async () => {
    const v6 = MIGRATIONS.slice(0, 6);
    const { db, reopen } = testDb(v6);
    await db.table('events').bulkAdd([
      { at: at(27, 10), type: 'cardCreated', cardId: 'a', deckId: 'd' },
      {
        at: at(27, 11),
        type: 'reviewed',
        cardId: 'a',
        deckId: 'd',
        itemId: 'a',
        rating: 3,
        first: true,
      },
      {
        at: at(27, 12),
        type: 'reviewed',
        cardId: 'a',
        deckId: 'd',
        itemId: 'a',
        rating: 3,
        first: false,
      },
      {
        at: at(27, 13),
        type: 'reviewUndone',
        cardId: 'a',
        deckId: 'd',
        itemId: 'a',
        rating: 3,
        first: false,
      },
    ]);
    db.close();
    const upgraded = reopen(MIGRATIONS);
    expect(await upgraded.dayStats.toArray()).toEqual([
      { day: '2026-09-27', reviews: 1, learned: 1, created: 1, met: false },
    ]);
    expect(await upgraded.milestones.count()).toBe(0);
  });

  it('Backup-Roundtrip behält Aggregate, Meilensteine und Ziele', async () => {
    const { db, reopen } = await setup();
    await writeGoals(db, { learn: 10, create: 2, pause: false }, T);
    await rateItems(db, ['k1'], 'good', at(28, 11));
    const before = {
      days: await db.dayStats.toArray(),
      milestones: await db.milestones.toArray(),
    };
    const bytes = await exportBackup(db, T, app);
    const fresh = reopen();
    await fresh.delete();
    const other = testDb().db;
    await writeProfileName(other, 'Anderer', T);
    await restoreBackup(other, decodeBackup(bytes));
    expect(await other.dayStats.toArray()).toEqual(before.days);
    expect(await other.milestones.toArray()).toEqual(before.milestones);
    expect(await readGoals(other)).toEqual({ learn: 10, create: 2, pause: false });
  });

  it('ein Backup der Version 6 bekommt seine Aggregate beim Einspielen', () => {
    const tables = prepareRestore({
      schemaVersion: 6,
      createdAt: T,
      app,
      tables: {
        profile: [{ id: 'me', name: 'Sven', createdAt: 1, updatedAt: 1 }],
        events: [{ seq: 1, at: at(27), type: 'cardCreated', cardId: 'a', deckId: 'd' }],
      },
    });
    expect(tables.dayStats).toEqual([
      { day: '2026-09-27', reviews: 0, learned: 0, created: 1, met: false },
    ]);
    expect(schemaVersion()).toBe(8);
  });

  it('ein Backup mit ungültigem Aggregat wird abgelehnt', () => {
    expect(() =>
      prepareRestore({
        schemaVersion: 7,
        createdAt: T,
        app,
        tables: {
          profile: [{ id: 'me', name: 'Sven', createdAt: 1, updatedAt: 1 }],
          dayStats: [{ day: 'gestern', reviews: 1, learned: 1, created: 0, met: true }],
        },
      }),
    ).toThrow();
  });
});

describe('Feier', () => {
  it('liefert den Stand zum Start und danach die Aggregate samt offener Meilensteine', async () => {
    const { db } = await setup();
    const today = learningDay(new Date(at(28, 12)));
    expect(await readGoalStart(db, '2026-09-28')).toEqual({ learned: 0, goals: DEFAULT_GOALS });
    await rateItems(db, ['k1', 'k2'], 'good', at(28, 11));
    expect((await readGoalStart(db, '2026-09-28')).learned).toBe(2);
    const snap = await readCelebration(db, today);
    expect(snap.rows.find((r) => r.day === '2026-09-28')).toMatchObject({ learned: 2 });
    expect(snap.fresh).toEqual(['erste-karte']);
    expect(snap.streak).toBe(0);
    await markSeen(db, snap.fresh);
    expect((await readCelebration(db, today)).fresh).toEqual([]);
  });
});
