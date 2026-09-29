import { describe, expect, it } from 'vitest';
import { decodeBackup } from '@/domain/backup/codec';
import { checkCard, type CardFields } from '@/domain/cards/card';
import { buildPackage } from '@/domain/juri/build';
import { decodeJuri, encodeJuri } from '@/domain/juri/codec';
import { contentHash } from '@/domain/juri/hash';
import { planMerge, type MergeMode, type Resolution } from '@/domain/juri/merge';
import { image } from '@/domain/juri/testkit';
import { exportBackup, prepareRestore } from '../backup';
import { testDb } from '../testDb';
import { createArea } from './areas';
import { createCard, deleteCard, updateCard } from './cards';
import { createDeck } from './decks';
import { applyMerge, readExportSource, readMergeLocal, recordShared } from './juri';
import { readErfolge } from './progress';
import { rateItems } from './study';
import { learningDay } from '@/domain/calendar/day';
import { readCounter, writeProfileName } from './profile';

const T = new Date(2026, 8, 28, 10).getTime();
const LATER = T + 3 * 86_400_000;
const app = { instance: 'test', version: '0.11.0' } as const;

type Db = ReturnType<typeof testDb>['db'];

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

/** Absender mit einem Stapel: Frage, Lückentext, Schema mit Verknüpfung, Abdeckung mit Bild. */
async function sender(): Promise<Db> {
  const { db } = testDb();
  await createArea(db, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
  await createDeck(
    db,
    { id: 'deck-a', name: 'Amtshaftung', norm: '§ 839 BGB', areaIds: ['zr'] },
    T,
  );
  await createCard(db, { id: 'c1', deckId: 'deck-a', fields: fields({ note: 'privat' }) }, T);
  await createCard(
    db,
    {
      id: 'c2',
      deckId: 'deck-a',
      fields: fields({ type: 'cloze', text: '{{c1::A}} und {{c2::B}}' }),
    },
    T,
  );
  await createCard(
    db,
    {
      id: 's1',
      deckId: 'deck-a',
      fields: fields({
        type: 'schema',
        title: 'Schema',
        points: [
          { id: 'p1', level: 1, text: 'Erster', norm: '', content: '', link: 'c1' },
          { id: 'p2', level: 1, text: 'Zweiter', norm: '', content: '', link: '' },
        ],
      }),
    },
    T,
  );
  const img = image('img1');
  await createCard(
    db,
    {
      id: 'm1',
      deckId: 'deck-a',
      fields: fields({
        type: 'cover',
        mediaId: 'img1',
        masks: [{ n: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
      }),
      media: [img],
    },
    T,
  );
  return db;
}

async function shareFrom(db: Db, deckIds = ['deck-a'], notes = false) {
  const source = await readExportSource(db, deckIds);
  const { pack } = buildPackage(source, {
    deckIds,
    notes,
    achievements: null,
    senderName: 'Mara',
    now: T,
    appVersion: '0.11.0',
  });
  return decodeJuri(encodeJuri(pack));
}

let ids = 0;
const newId = () => `gen-${String(++ids)}`;

async function importInto(
  db: Db,
  pack: Awaited<ReturnType<typeof shareFrom>>,
  mode: MergeMode = 'update',
  now = LATER,
  decisions?: ReadonlyMap<string, Resolution>,
) {
  const local = await readMergeLocal(db, pack);
  const plan = planMerge({ pack, local, mode, now, newId, ...(decisions ? { decisions } : {}) });
  await applyMerge(db, plan, now);
  return plan;
}

const recipient = async () => {
  const { db } = testDb();
  // Für die Prüfung wie beim Einspielen eines Backups braucht die Datenbank ein Profil.
  await writeProfileName(db, 'Sven', T);
  return db;
};

/** Alle Tabellen prüfen wie beim Einspielen eines Backups: Schemas und Verweise. */
async function expectConsistent(db: Db) {
  const bytes = await exportBackup(db, T, app);
  expect(() => prepareRestore(decodeBackup(bytes), undefined)).not.toThrow();
}

describe('Export lesen', () => {
  it('liest Stapel, Karten und nur die genutzten Medien', async () => {
    const db = await sender();
    await db.media.put(image('unbenutzt'));
    const source = await readExportSource(db, ['deck-a']);
    expect(source.cards).toHaveLength(4);
    expect(source.media.map((m) => m.id)).toEqual(['img1']);
  });
});

describe('Import in einer Transaktion', () => {
  it('bringt Stapel, Karten, Abfragen, Medien und Ereignisse mit und bleibt konsistent', async () => {
    const from = await sender();
    const db = await recipient();
    const plan = await importInto(db, await shareFrom(from));
    expect(plan.summary.cardsNew).toBe(4);
    expect(await db.decks.count()).toBe(1);
    expect(await db.cards.count()).toBe(4);
    expect((await db.reviewItems.toArray()).map((i) => i.id).sort()).toEqual(
      ['c1', 'c2:c1', 'c2:c2', 'm1:m1', 's1'].sort(),
    );
    expect((await db.media.toArray()).map((m) => m.id)).toEqual(['img1']);
    expect(await db.events.where('type').equals('cardImported').count()).toBe(4);
    expect(await readCounter(db, 'newCardsSinceBackup')).toBe(4);
    const c1 = await db.cards.get('c1');
    expect(c1?.originHash).toBe(contentHash(c1!));
    expect(c1?.note).toBeUndefined();
    await expectConsistent(db);
  });

  it('zählt Importe nicht als angelegt: kein Tagesziel, keine „Erste Karte“', async () => {
    const db = await recipient();
    await importInto(db, await shareFrom(await sender()));
    expect(await db.dayStats.count()).toBe(0);
    const snapshot = await readErfolge(db, learningDay(new Date(LATER)));
    expect(snapshot.metrics.created).toBe(0);
    expect(snapshot.unlocked.has('erste-karte')).toBe(false);
  });

  it('schaltet einen Meilenstein genau einmal frei, auch bei doppeltem Import', async () => {
    const from = testDb().db;
    await createArea(from, { id: 'zr', code: 'ZR', name: 'Zivilrecht' }, T);
    await createDeck(from, { id: 'd', name: 'Schemata', norm: '', areaIds: ['zr'] }, T);
    for (let i = 1; i <= 10; i += 1) {
      await createCard(
        from,
        {
          id: `s${String(i)}`,
          deckId: 'd',
          fields: fields({
            type: 'schema',
            title: `Schema ${String(i)}`,
            points: [{ id: 'p1', level: 1, text: 'Punkt', norm: '', content: '', link: '' }],
          }),
        },
        T,
      );
    }
    const pack = await shareFrom(from, ['d']);
    const db = await recipient();
    await importInto(db, pack);
    const first = await db.milestones.get('schema-baumeister');
    expect(first?.seen).toBe(false);
    await importInto(db, pack, 'update', LATER + 1000);
    expect(await db.milestones.where('id').equals('schema-baumeister').count()).toBe(1);
    expect((await db.milestones.get('schema-baumeister'))?.unlockedAt).toBe(first?.unlockedAt);
  });

  it('ändert bei doppeltem Import nichts', async () => {
    const pack = await shareFrom(await sender());
    const db = await recipient();
    await importInto(db, pack);
    const before = JSON.stringify([
      await db.cards.toArray(),
      await db.reviewItems.toArray(),
      await db.events.toArray(),
      await db.meta.toArray(),
    ]);
    const again = await importInto(db, pack, 'update', LATER + 5000);
    expect(again.empty).toBe(true);
    const after = JSON.stringify([
      await db.cards.toArray(),
      await db.reviewItems.toArray(),
      await db.events.toArray(),
      await db.meta.toArray(),
    ]);
    expect(after).toBe(before);
  });

  it('behält den Lernfortschritt beim Aktualisieren und übernimmt die Änderung des Absenders', async () => {
    const from = await sender();
    const db = await recipient();
    await importInto(db, await shareFrom(from));
    await rateItems(db, ['c1'], 'good', LATER);
    const learned = await db.reviewItems.get('c1');
    expect(learned?.due).toBeDefined();
    await updateCard(
      from,
      'c1',
      { deckId: 'deck-a', fields: fields({ front: 'Neu formuliert?' }) },
      LATER,
    );
    const plan = await importInto(db, await shareFrom(from), 'update', LATER + 1000);
    expect(plan.summary.cardsUpdated).toBe(1);
    const card = await db.cards.get('c1');
    expect(card?.type === 'qa' && card.front).toBe('Neu formuliert?');
    expect(await db.reviewItems.get('c1')).toEqual(learned);
    await expectConsistent(db);
  });

  async function conflicting() {
    const from = await sender();
    const db = await recipient();
    await importInto(db, await shareFrom(from));
    await updateCard(
      db,
      'c1',
      { deckId: 'deck-a', fields: fields({ front: 'Meine Fassung?' }) },
      LATER,
    );
    await updateCard(
      from,
      'c1',
      { deckId: 'deck-a', fields: fields({ front: 'Ihre Fassung?' }) },
      LATER,
    );
    return { db, pack: await shareFrom(from) };
  }
  const front = async (db: Db) => {
    const card = await db.cards.get('c1');
    return card?.type === 'qa' ? card.front : undefined;
  };

  it('meldet einen Konflikt, wenn beide geändert haben; standardmäßig bleibt deine Karte', async () => {
    const { db, pack } = await conflicting();
    const plan = await importInto(db, pack, 'update', LATER + 1000);
    expect(plan.conflicts).toMatchObject([{ cardId: 'c1', kind: 'changed', resolution: 'mine' }]);
    expect(await front(db)).toBe('Meine Fassung?');
    // Der Stand der Datei ist vermerkt: derselbe Import fragt nicht noch einmal.
    expect((await importInto(db, pack, 'update', LATER + 2000)).conflicts).toEqual([]);
    expect(await front(db)).toBe('Meine Fassung?');
  });

  it('übernimmt die Fassung des Absenders, wenn du sie wählst, mit Fortschritt', async () => {
    const { db, pack } = await conflicting();
    await rateItems(db, ['c1'], 'good', LATER);
    const learned = await db.reviewItems.get('c1');
    await importInto(db, pack, 'update', LATER + 1000, new Map([['c1', 'theirs']]));
    expect(await front(db)).toBe('Ihre Fassung?');
    expect(await db.reviewItems.get('c1')).toEqual(learned);
  });

  it('erkennt eine lokal gelöschte Karte über das Ereignis-Log', async () => {
    const pack = await shareFrom(await sender());
    const db = await recipient();
    await importInto(db, pack);
    await deleteCard(db, 'c1', LATER);
    const local = await readMergeLocal(db, pack);
    expect(local.knownCardIds.has('c1')).toBe(true);
    const plan = await importInto(db, pack, 'update', LATER + 1000, new Map([['c1', 'theirs']]));
    expect(plan.conflicts).toMatchObject([{ cardId: 'c1', kind: 'deleted', resolution: 'theirs' }]);
    expect(await db.cards.get('c1')).toBeDefined();
    await expectConsistent(db);
  });

  it('legt eine Kopie unabhängig an, mit neuen IDs und konsistenten Verweisen', async () => {
    const pack = await shareFrom(await sender());
    const db = await recipient();
    await importInto(db, pack);
    const plan = await importInto(db, pack, 'copy', LATER + 1000);
    expect(plan.summary.cardsNew).toBe(4);
    expect(await db.decks.count()).toBe(2);
    expect(await db.cards.count()).toBe(8);
    expect((await db.decks.toArray()).map((d) => d.name).sort()).toEqual([
      'Amtshaftung',
      'Amtshaftung (Kopie)',
    ]);
    // Bild wurde für die Kopie neu angelegt (Löschen einer Seite lässt die andere unberührt).
    expect(await db.media.count()).toBe(2);
    await expectConsistent(db);
  });

  it('bricht ab und ändert nichts, wenn ein Schreibauftrag scheitert', async () => {
    const from = await sender();
    const db = await recipient();
    await importInto(db, await shareFrom(from));
    await createDeck(from, { id: 'deck-b', name: 'Sachenrecht', norm: '', areaIds: ['zr'] }, T);
    await createCard(from, { id: 'c9', deckId: 'deck-b', fields: fields() }, T);
    const pack = await shareFrom(from, ['deck-b']);
    const plan = planMerge({
      pack,
      local: await readMergeLocal(db, pack),
      mode: 'update',
      now: LATER,
      newId,
    });
    // Ein doppelter Schlüssel als letzter Schreibauftrag lässt die ganze Transaktion scheitern.
    const broken = {
      ...plan,
      writes: { ...plan.writes, itemsAdd: [...plan.writes.itemsAdd, ...plan.writes.itemsAdd] },
    };
    const before = [await db.decks.count(), await db.cards.count(), await db.events.count()];
    await expect(applyMerge(db, broken, LATER)).rejects.toThrow();
    expect([await db.decks.count(), await db.cards.count(), await db.events.count()]).toEqual(
      before,
    );
    expect(await db.cards.get('c9')).toBeUndefined();
    expect(await readCounter(db, 'newCardsSinceBackup')).toBe(4);
  });
});

describe('Teilen vermerken', () => {
  it('setzt den gemeinsamen Stand und schaltet „Teamplayer“ nach drei Stapeln frei', async () => {
    const db = await sender();
    for (const id of ['b', 'c']) {
      await createDeck(
        db,
        { id: `deck-${id}`, name: `Stapel ${id}`, norm: '', areaIds: ['zr'] },
        T,
      );
    }
    const share = async (decks: string[], at: number) => {
      const pack = await shareFrom(db, decks);
      await recordShared(
        db,
        { decks, hashes: new Map(pack.cards.map((c) => [c.id, contentHash(c)])) },
        at,
      );
    };
    await share(['deck-a'], T);
    expect((await db.cards.get('c1'))?.originHash).toBe(contentHash((await db.cards.get('c1'))!));
    await share(['deck-a'], T + 1);
    expect(await db.milestones.get('teamplayer')).toBeUndefined();
    await share(['deck-b'], T + 2);
    expect(await db.milestones.get('teamplayer')).toBeUndefined();
    await share(['deck-c'], T + 3);
    expect((await db.milestones.get('teamplayer'))?.unlockedAt).toBe(T + 3);
    const snapshot = await readErfolge(db, learningDay(new Date(T + 3)));
    expect(snapshot.metrics.shared).toBe(3);
  });

  it('nachher gilt eine eigene Änderung als „lokal geändert“, eine unveränderte nicht', async () => {
    const db = await sender();
    const pack = await shareFrom(db);
    await recordShared(
      db,
      { decks: ['deck-a'], hashes: new Map(pack.cards.map((c) => [c.id, contentHash(c)])) },
      T,
    );
    await updateCard(db, 'c1', { deckId: 'deck-a', fields: fields({ front: 'Geändert?' }) }, LATER);
    const card = await db.cards.get('c1');
    // Die Bearbeitung behält den gemeinsamen Stand (updateCard), der Hash des Inhalts weicht ab.
    expect(card?.originHash).toBeDefined();
    expect(card?.originHash).not.toBe(contentHash(card!));
  });
});
