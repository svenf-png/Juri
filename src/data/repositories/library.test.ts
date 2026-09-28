import { describe, expect, it } from 'vitest';
import { checkCard, type CardFields } from '@/domain/cards/card';
import { decodeBackup } from '@/domain/backup/codec';
import { exportBackup, prepareRestore, readTables, restoreBackup } from '../backup';
import { testDb } from '../testDb';
import { createArea, deleteArea, readAreas, updateArea } from './areas';
import { createCard, deleteCard, readCard, readCards, updateCard } from './cards';
import { createDeck, deleteDeck, readDeck, readDecks, toggleDeckArea, updateDeck } from './decks';
import {
  readCreateSnapshot,
  readDeckDetail,
  readLibrary,
  readSearchSnapshot,
  readTodaySnapshot,
} from './library';
import { readMeta, writeProfileName } from './profile';

const T = new Date(2026, 8, 28, 10).getTime();

function fields(form: Partial<Parameters<typeof checkCard>[0]> = {}): CardFields {
  const result = checkCard({
    type: 'qa',
    front: 'Was ist Gewahrsam?',
    back: 'Sachherrschaft.',
    text: '',
    norm: '§ 242 StGB',
    tags: '#Klausur',
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
  await createArea(db, { id: 'oer', code: 'ÖR', name: 'Öffentliches Recht' }, T + 1);
  await createDeck(
    db,
    { id: 'amt', name: 'Amtshaftung', norm: '§ 839 BGB', areaIds: ['zr', 'oer'] },
    T,
  );
  await createDeck(db, { id: 'delikt', name: 'Deliktsrecht', norm: '', areaIds: ['zr'] }, T);
  return { db, reopen };
}

describe('Rechtsgebiete', () => {
  it('lassen sich anlegen, ändern und lesen', async () => {
    const { db } = await setup();
    expect((await readAreas(db)).map((a) => a.code).sort()).toEqual(['ZR', 'ÖR']);
    const changed = await updateArea(db, 'zr', { code: 'ZR', name: 'Zivilrecht neu' }, T + 5);
    expect(changed).toMatchObject({ name: 'Zivilrecht neu', createdAt: T, updatedAt: T + 5 });
    expect(await updateArea(db, 'gibt-es-nicht', { code: 'XX', name: 'X' }, T)).toBeNull();
  });

  it('löschen sich, wenn Stapel auch anderswo liegen, und nehmen die Zuordnung mit', async () => {
    const { db } = await setup();
    await createDeck(db, { id: 'nur-oer', name: 'Nur ÖR', norm: '', areaIds: ['oer'] }, T);
    expect(await deleteArea(db, 'zr', T)).toMatchObject({ ok: false });
    const blocked = await deleteArea(db, 'zr', T);
    expect(!blocked.ok && blocked.blockedBy.map((d) => d.id)).toEqual(['delikt']);
    expect(await readAreas(db)).toHaveLength(2);

    await deleteDeck(db, 'delikt');
    expect(await deleteArea(db, 'zr', T + 9)).toEqual({ ok: true });
    expect((await readAreas(db)).map((a) => a.id)).toEqual(['oer']);
    expect(await readDeck(db, 'amt')).toMatchObject({ areaIds: ['oer'], updatedAt: T + 9 });
  });
});

describe('Stapel', () => {
  it('entstehen mit neuen Rechtsgebieten in einer Transaktion', async () => {
    const { db } = testDb();
    await createDeck(
      db,
      {
        id: 'd',
        name: 'Sachenrecht',
        norm: '',
        areaIds: ['neu'],
        newAreas: [{ id: 'neu', code: 'ZR', name: 'Zivilrecht' }],
      },
      T,
    );
    expect((await readAreas(db)).map((a) => a.id)).toEqual(['neu']);
    expect(await readDecks(db)).toHaveLength(1);
    // Scheitert der Stapel (doppelte ID), entsteht auch das Rechtsgebiet nicht.
    await expect(
      createDeck(
        db,
        {
          id: 'd',
          name: 'Doppelt',
          norm: '',
          areaIds: ['x'],
          newAreas: [{ id: 'x', code: 'SR', name: 'Strafrecht' }],
        },
        T,
      ),
    ).rejects.toThrow();
    expect((await readAreas(db)).map((a) => a.id)).toEqual(['neu']);
  });

  it('lassen sich ändern', async () => {
    const { db } = await setup();
    expect(await updateDeck(db, 'amt', { name: 'Amtshaftung 2' }, T + 1)).toMatchObject({
      name: 'Amtshaftung 2',
      norm: '§ 839 BGB',
      updatedAt: T + 1,
    });
    expect(await updateDeck(db, 'amt', { areaIds: ['zr'] }, T + 2)).toMatchObject({
      areaIds: ['zr'],
    });
    expect(await updateDeck(db, 'weg', { name: 'x' }, T)).toBeNull();
  });

  it('schalten Rechtsgebiete auf dem gespeicherten Stand um, das letzte bleibt', async () => {
    const { db } = await setup();
    expect(await toggleDeckArea(db, 'delikt', 'oer', T + 1)).toBe('ok');
    expect((await readDeck(db, 'delikt'))?.areaIds).toEqual(['zr', 'oer']);
    // Zwei schnelle Umschaltungen hintereinander rechnen nacheinander, nicht auf altem Stand.
    const both = await Promise.all([
      toggleDeckArea(db, 'delikt', 'zr', T + 2),
      toggleDeckArea(db, 'delikt', 'oer', T + 3),
    ]);
    expect(both.sort()).toEqual(['last', 'ok']);
    expect((await readDeck(db, 'delikt'))?.areaIds).toHaveLength(1);
    expect(await toggleDeckArea(db, 'weg', 'zr', T)).toBe('missing');
  });

  it('löschen sich mit Karten und Abfragen, andere Stapel bleiben', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    await createCard(
      db,
      { id: 'k2', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    await createCard(db, { id: 'k3', deckId: 'delikt', fields: fields() }, T);
    expect(await deleteDeck(db, 'amt')).toEqual({ cards: 2, items: 3 });
    expect((await readCards(db)).map((c) => c.id)).toEqual(['k3']);
    expect(await db.reviewItems.count()).toBe(1);
    expect(await readDeck(db, 'amt')).toBeNull();
  });
});

describe('Karten', () => {
  it('Frage: eine Abfrage, Ereignis und Zähler für die Backup-Erinnerung', async () => {
    const { db } = await setup();
    const card = await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    expect(card).toMatchObject({
      type: 'qa',
      front: 'Was ist Gewahrsam?',
      tags: ['Klausur'],
      createdAt: T,
      updatedAt: T,
    });
    expect(await db.reviewItems.toArray()).toEqual([
      { id: 'k1', cardId: 'k1', deckId: 'amt', sub: '', createdAt: T },
    ]);
    expect(await db.events.toArray()).toEqual([
      { seq: 1, at: T, type: 'cardCreated', cardId: 'k1', deckId: 'amt' },
    ]);
    await createCard(db, { id: 'k2', deckId: 'amt', fields: fields() }, T + 1);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(2);
  });

  it('Lückentext mit drei Lücken ergibt drei Abfragen', async () => {
    const { db } = await setup();
    await createCard(
      db,
      {
        id: 'k1',
        deckId: 'amt',
        fields: fields({
          type: 'cloze',
          text: 'Wegnahme ist der {{c1::Bruch fremden}} und die {{c2::Begründung neuen}} {{c3::Gewahrsams}}.',
        }),
      },
      T,
    );
    const items = await db.reviewItems.orderBy('id').toArray();
    expect(items.map((i) => [i.id, i.sub, i.cardId, i.deckId])).toEqual([
      ['k1:c1', 'c1', 'k1', 'amt'],
      ['k1:c2', 'c2', 'k1', 'amt'],
      ['k1:c3', 'c3', 'k1', 'amt'],
    ]);
  });

  it('scheitert als Ganzes, wenn etwas fehlschlägt', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    await expect(
      createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T + 1),
    ).rejects.toThrow();
    expect(await db.events.count()).toBe(1);
    expect((await readMeta(db)).newCardsSinceBackup).toBe(1);
  });

  it('ändern gleicht die Abfragen an und behält die übrigen', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    const kept = await db.reviewItems.get('k1:c1');
    const updated = await updateCard(
      db,
      'k1',
      { deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c3::b}}' }) },
      T + 10,
    );
    expect(updated).toMatchObject({ createdAt: T, updatedAt: T + 10 });
    const items = await db.reviewItems.orderBy('id').toArray();
    expect(items.map((i) => i.id)).toEqual(['k1:c1', 'k1:c3']);
    expect(items[0]).toEqual(kept);
    expect(items[1]?.createdAt).toBe(T + 10);
  });

  it('verschieben Abfragen mit in einen anderen Stapel', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    await updateCard(
      db,
      'k1',
      { deckId: 'delikt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T + 1,
    );
    expect((await db.reviewItems.toArray()).map((i) => i.deckId)).toEqual(['delikt', 'delikt']);
    expect((await readCard(db, 'k1'))?.deckId).toBe('delikt');
  });

  it('wechseln den Typ, ohne verwaiste Abfragen zu hinterlassen', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    await updateCard(
      db,
      'k1',
      { deckId: 'amt', fields: fields({ type: 'cloze', text: 'x {{c1::y}}' }) },
      T + 1,
    );
    expect((await db.reviewItems.toArray()).map((i) => i.id)).toEqual(['k1:c1']);
    expect(await updateCard(db, 'weg', { deckId: 'amt', fields: fields() }, T)).toBeNull();
  });

  it('löschen sich mit Abfragen; das Ereignis bleibt im Log', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    expect(await deleteCard(db, 'k1')).toBe(2);
    expect(await readCard(db, 'k1')).toBeNull();
    expect(await db.reviewItems.count()).toBe(0);
    expect(await db.events.count()).toBe(1);
  });
});

describe('Lesen', () => {
  it('Bibliothek zählt Karten und Abfragen je Stapel', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    await createCard(
      db,
      { id: 'k2', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    const lib = await readLibrary(db);
    expect(lib.cardCounts).toEqual({ amt: 2 });
    expect(lib.itemCounts).toEqual({ amt: 3 });
    expect(lib.decks).toHaveLength(2);
    expect(lib.areas).toHaveLength(2);
  });

  it('Stapel-Detail liefert Karten und Abfragen, unbekannte Stapel null', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T);
    const detail = await readDeckDetail(db, 'amt', T);
    expect(detail?.cards.map((c) => c.id)).toEqual(['k1']);
    expect(detail?.itemCount).toBe(1);
    expect(await readDeckDetail(db, 'weg', T)).toBeNull();
  });

  it('Heute und Erstellen zählen Ereignisse ab einem Zeitpunkt', async () => {
    const { db } = await setup();
    await createCard(db, { id: 'k1', deckId: 'amt', fields: fields() }, T - 5 * 86_400_000);
    await createCard(db, { id: 'k2', deckId: 'amt', fields: fields() }, T);
    await createCard(db, { id: 'k3', deckId: 'amt', fields: fields() }, T + 1000);
    const today = await readTodaySnapshot(db, T - 1000, T - 1000);
    expect(today).toMatchObject({
      cardTotal: 3,
      startedToday: 0,
      reviewedToday: 0,
      createdAt: [T, T + 1000],
    });
    expect(today.items).toHaveLength(3);
    expect(await readCreateSnapshot(db, T - 1000)).toMatchObject({ madeToday: 2, total: 3 });
    const search = await readSearchSnapshot(db);
    expect(search.cards).toHaveLength(3);
    expect(search.decks).toHaveLength(2);
  });
});

describe('Backup mit Karten', () => {
  it('Roundtrip: Export, Einspielen und erneuter Export sind byte-identisch', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    const app = { instance: 'app', version: '0.3.0' } as const;
    const first = await exportBackup(db, T, app);
    const other = testDb().db;
    await restoreBackup(other, decodeBackup(first));
    expect(await readTables(other)).toMatchObject({
      cards: [expect.objectContaining({ id: 'k1' })],
      reviewItems: expect.any(Array) as unknown[],
    });
    expect(await exportBackup(other, T, app)).toEqual(first);
  });

  it('lehnt Backups mit ins Leere zeigenden Verweisen ab', async () => {
    const { db } = await setup();
    await createCard(
      db,
      { id: 'k1', deckId: 'amt', fields: fields({ type: 'cloze', text: '{{c1::a}} {{c2::b}}' }) },
      T,
    );
    const tables = await readTables(db);
    const content = (edit: (t: typeof tables) => void) => {
      const copy = structuredClone(tables);
      edit(copy);
      return {
        schemaVersion: 2,
        createdAt: T,
        app: { instance: 'app' as const, version: '0.3.0' },
        tables: copy,
      };
    };
    expect(() => prepareRestore(content(() => undefined))).not.toThrow();
    expect(() =>
      prepareRestore(
        content((t) => (t.decks = t.decks!.map((d) => ({ ...d, areaIds: ['gibt-es-nicht'] })))),
      ),
    ).toThrow();
    expect(() =>
      prepareRestore(
        content((t) => (t.cards = t.cards!.map((c) => ({ ...c, deckId: 'gibt-es-nicht' })))),
      ),
    ).toThrow();
    expect(() =>
      prepareRestore(content((t) => (t.reviewItems = t.reviewItems!.slice(1)))),
    ).toThrow();
    expect(() =>
      prepareRestore(
        content((t) => (t.reviewItems = t.reviewItems!.map((i) => ({ ...i, deckId: 'delikt' })))),
      ),
    ).toThrow();
    expect(() =>
      prepareRestore(
        content(
          (t) => (t.cards = [...t.cards!, { ...t.cards![0]!, id: 'k9', text: 'ohne Lücke' }]),
        ),
      ),
    ).toThrow();
  });

  it('nimmt Backups aus M1 ohne die neuen Tabellen an', () => {
    const content = {
      schemaVersion: 1,
      createdAt: T,
      app: { instance: 'app' as const, version: '0.2.0' },
      tables: { profile: [{ id: 'me', name: 'Sven', createdAt: T, updatedAt: T }] },
    };
    expect(prepareRestore(content).profile).toHaveLength(1);
  });
});
