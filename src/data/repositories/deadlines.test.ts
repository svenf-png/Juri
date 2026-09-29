import { describe, expect, it } from 'vitest';
import { decodeBackup } from '@/domain/backup/codec';
import { checkCard, type CardFields } from '@/domain/cards/card';
import { parseDayKey } from '@/domain/calendar/day';
import { deadlineSchema } from '@/domain/model/records';
import { exportBackup, prepareRestore, restoreBackup } from '../backup';
import { testDb } from '../testDb';
import { createArea, deleteArea } from './areas';
import { createCard } from './cards';
import {
  createDeadline,
  deleteDeadline,
  readDeadlines,
  readOverlay,
  readScopeWorld,
  updateDeadline,
} from './deadlines';
import { createDeck, deleteDeck } from './decks';
import { readDeckDetail, readTodaySnapshot } from './library';
import { writeProfileName } from './profile';
import { rateItems, readStudy } from './study';

const T = new Date(2026, 8, 28, 10).getTime();
const DAY = 86_400_000;
const START = new Date(2026, 8, 28, 4).getTime();
const at = (key: string, hour = 4) => {
  const d = parseDayKey(key);
  return new Date(d.year, d.month - 1, d.day, hour).getTime();
};

function fields(tags = ''): CardFields {
  const result = checkCard({
    type: 'qa',
    front: 'Was ist Gewahrsam?',
    back: 'Sachherrschaft.',
    text: '',
    norm: '',
    tags,
    note: '',
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.fields;
}

const input = (over: Partial<Parameters<typeof createDeadline>[2]> = {}) => ({
  kind: 'klausur' as const,
  name: 'Klausur ZR',
  date: '2026-10-09',
  scope: { all: false, areaIds: ['zr'], deckIds: [], tags: [] },
  sprint: false,
  ...over,
});

async function setup() {
  const { db, reopen } = testDb();
  await writeProfileName(db, 'Sven', T);
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
  await createArea(db, { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht' }, T);
  await createDeck(db, { id: 'sach', name: 'Sachenrecht', norm: '', areaIds: ['zr'] }, T);
  await createDeck(db, { id: 'amt', name: 'Amtshaftung', norm: '', areaIds: ['oer'] }, T);
  await createCard(db, { id: 'k1', deckId: 'sach', fields: fields('LLM') }, T);
  await createCard(db, { id: 'k2', deckId: 'amt', fields: fields() }, T);
  return { db, reopen };
}

describe('Fristen (Repository)', () => {
  it('legen an, ändern und löschen; das Datum bleibt beim Ändern gültig', async () => {
    const { db } = await setup();
    const made = await createDeadline(db, 'f1', input(), T);
    expect(deadlineSchema.safeParse(made).success).toBe(true);
    expect(await readDeadlines(db)).toHaveLength(1);

    const changed = await updateDeadline(
      db,
      'f1',
      input({ name: 'Klausur ZR 2', sprint: true }),
      T + 5,
    );
    expect(changed).toMatchObject({
      name: 'Klausur ZR 2',
      sprint: true,
      createdAt: T,
      updatedAt: T + 5,
    });
    expect(await updateDeadline(db, 'fehlt', input(), T)).toBeNull();

    expect(await deleteDeadline(db, 'f1')).toBe(true);
    expect(await deleteDeadline(db, 'f1')).toBe(false);
    expect(await readDeadlines(db)).toEqual([]);
  });

  it('löschen einer Frist lässt Karten und Lernstand unberührt', async () => {
    const { db } = await setup();
    await createDeadline(db, 'f1', input(), T);
    const before = await db.reviewItems.toArray();
    await deleteDeadline(db, 'f1');
    expect(await db.reviewItems.toArray()).toEqual(before);
    expect(await db.cards.count()).toBe(2);
  });

  it('bereinigt beim Löschen eines Stapels oder Rechtsgebiets den Umfang in derselben Transaktion', async () => {
    const { db } = await setup();
    await createDeadline(
      db,
      'f1',
      input({ scope: { all: false, areaIds: ['oer'], deckIds: ['sach', 'amt'], tags: ['LLM'] } }),
      T,
    );
    await createDeadline(
      db,
      'f2',
      input({ scope: { all: true, areaIds: [], deckIds: [], tags: [] } }),
      T,
    );
    await deleteDeck(db, 'sach');
    expect((await db.deadlines.get('f1'))?.scope.deckIds).toEqual(['amt']);
    expect((await db.deadlines.get('f2'))?.scope.all).toBe(true);
    // „amt“ liegt nur in ÖR, das Rechtsgebiet lässt sich erst ohne den Stapel löschen.
    await deleteDeck(db, 'amt');
    expect(await deleteArea(db, 'oer', T + 1)).toEqual({ ok: true });
    const f1 = await db.deadlines.get('f1');
    expect(f1?.scope).toEqual({ all: false, areaIds: [], deckIds: [], tags: ['LLM'] });
    expect(f1?.updatedAt).toBeGreaterThan(T);
  });

  it('lesen nur die Karten mit den gesuchten Tags', async () => {
    const { db } = await setup();
    const withTag = await readScopeWorld(db, [
      {
        ...(await createDeadline(
          db,
          'f1',
          input({ scope: { all: false, areaIds: [], deckIds: [], tags: ['LLM'] } }),
          T,
        )),
      },
    ]);
    expect([...withTag.cardTags.keys()]).toEqual(['k1']);
    expect((await readScopeWorld(db, [])).cardTags.size).toBe(0);
  });

  it('gehen mit ins Backup und wieder heraus', async () => {
    const { db, reopen } = await setup();
    await createDeadline(db, 'f1', input({ sprint: true }), T);
    const bytes = await exportBackup(db, T, { instance: 'app', version: '0.9.0' });
    const content = decodeBackup(bytes);
    expect(content.tables.deadlines).toHaveLength(1);
    expect(prepareRestore(content).deadlines).toHaveLength(1);
    await db.deadlines.clear();
    await restoreBackup(db, content);
    expect(await readDeadlines(reopen())).toMatchObject([{ id: 'f1', sprint: true }]);
  });
});

describe('effektive Fälligkeit (Datenschicht)', () => {
  async function rated() {
    const s = await setup();
    // Beide Abfragen einmal bewerten: „Leicht“ setzt die Fälligkeit weit nach hinten.
    await rateItems(s.db, ['k1', 'k2'], 'easy', START + 1000);
    return s;
  }

  it('zieht Abfragen im Umfang vor, ohne etwas zu speichern', async () => {
    const { db } = await rated();
    const stored = await db.reviewItems.toArray();
    await createDeadline(db, 'f1', input({ date: '2026-10-02' }), T);
    const study = await readStudy(db, START);
    const byId = new Map(study.items.map((i) => [i.id, i]));
    expect(byId.get('k1')?.due).toBe(at('2026-10-01'));
    // Ohne Frist im Umfang bleibt es beim gespeicherten Termin.
    expect(byId.get('k2')?.due).toBe(stored.find((i) => i.id === 'k2')?.due);
    expect(await db.reviewItems.toArray()).toEqual(stored);
    expect(study.stored).toEqual(stored);
  });

  it('gilt für Stapel-Detail und Heute, und Heute zeigt die Frist mit Quote', async () => {
    const { db } = await rated();
    await createDeadline(db, 'f1', input({ date: '2026-10-02' }), T);
    const detail = await readDeckDetail(db, 'sach', START);
    expect(detail?.items[0]?.due).toBe(at('2026-10-01'));
    const today = await readTodaySnapshot(db, START - 6 * DAY, START);
    expect(today.deadlines).toEqual([
      { id: 'f1', title: 'Klausur ZR', date: '2026-10-02', secureShare: 100 },
    ]);
  });

  it('ist ohne aktive Frist die Identität und ignoriert abgelaufene', async () => {
    const { db } = await rated();
    const stored = await db.reviewItems.toArray();
    expect((await readOverlay(db, START))(stored)).toEqual(stored);
    await createDeadline(db, 'f1', input({ date: '2026-09-20' }), T);
    expect((await readOverlay(db, START))(stored)).toEqual(stored);
  });

  it('nimmt den Tag der Frist noch mit und danach nicht mehr', async () => {
    const { db } = await rated();
    await db.reviewItems.update('k1', { due: at('2027-01-01'), lastReviewedAt: at('2026-09-20') });
    await createDeadline(db, 'f1', input({ date: '2026-09-28' }), T);
    const items = await db.reviewItems.toArray();
    const today = (await readOverlay(db, START))(items);
    expect(today.find((i) => i.id === 'k1')?.due).toBe(at('2026-09-27'));
    const tomorrow = (await readOverlay(db, START + DAY))(items);
    expect(tomorrow).toEqual(items);
  });
});
